import Callable, { isCallable } from "./Callable";
import CallableFunction from "./CallableFunction";
import Environment from "./Environment";
import BreakError from "./errors/BreakError";
import ContinueError from "./errors/ContinueError";
import ReturnError from "./errors/ReturnError";
import RuntimeError from "./errors/RuntimeError";
import {
  Assign,
  Binary,
  Call,
  Expr,
  FunctionExpr,
  Get,
  Grouping,
  Literal,
  Logical,
  Set,
  Super,
  SuperCall,
  This,
  Unary,
  Variable,
  Visitor as ExprVistor,
} from "./Expr";
import Lox from "./Lox";
import LoxClass, { ClassMethods, ClassPropertiesRuntime } from "./LoxClass";
import LoxInstance from "./LoxInstance";
import {
  Block,
  Break,
  Class,
  Expression,
  Function,
  If,
  Return,
  Stmt,
  Var,
  Visitor as StmtVisitor,
  While,
} from "./Stmt";
import Token from "./Token";
import { TokenType } from "./TokenType";

export default class Interpreter implements ExprVistor<Object>, StmtVisitor<void> {
  readonly globals = new Environment();
  private readonly locals: Map<Expr, number> = new Map();

  private environment = this.globals;

  constructor() {
    this.globals.define("clock", <Callable>{
      arity() {
        return 0;
      },
      call(interpreter, args) {
        return Date.now() / 1000;
      },
      toString() {
        return "<native fn>";
      },
    });
  }

  interpret(statements: Stmt[]) {
    try {
      for (const s of statements) {
        this.execute(s);
      }
    } catch (error) {
      Lox.runtimeError(<RuntimeError>error);
    }
  }

  visitAssignExpr(expr: Assign): Object {
    const value = this.evaluate(expr.value);

    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }

    return value;
  }

  visitLogicalExpr(expr: Logical): Object {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthy(left)) return left;
    } else {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitBinaryExpr(expr: Binary): Object {
    // NOTE: left hand side expression is evaluated before right
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);
        return <number>left - <number>right;
      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);

        // report division by 0 error
        if (<number>right === 0) throw new RuntimeError(expr.operator, "Cannot divide by 0.");

        return <number>left / <number>right;
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return <number>left * <number>right;

      case TokenType.PLUS:
        // NOTE: these if statments are unnessecary as js is dynamicaly typed,
        //       but this makes how we are doing things very clear.
        if (typeof left === "number" && typeof right === "number") return <number>left + <number>right;

        if (typeof left === "string" || typeof right === "string")
          return this.stringify(left) + this.stringify(right);

        throw new RuntimeError(expr.operator, "Operands must be two numbers or a string and an object.");

      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return <number>left > <number>right;
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return <number>left >= <number>right;
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return <number>left < <number>right;
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return <number>left <= <number>right;

      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right);
      case TokenType.BANG_EQUAL:
        return !this.isEqual(left, right);
    }

    return null;
  }

  visitCallExpr(expr: Call) {
    const callee = this.evaluate(expr.callee);
    const args: Object[] = expr.args.map((a) => this.evaluate(a));

    if (!isCallable(callee)) {
      throw new RuntimeError(expr.paren, "Can only call functions and classes.");
    }

    const func = <Callable>callee;
    if (args.length !== func.arity()) {
      throw new RuntimeError(expr.paren, `Expected ${func.arity()} arguments but got ${args.length}.`);
    }

    return func.call(this, args);
  }

  visitGetExpr(expr: Get) {
    const obj: Object = this.evaluate(expr.object);
    if (obj instanceof LoxInstance) {
      return obj.get(expr.name, this);
    }

    throw new RuntimeError(expr.name, "Only instances have properties.");
  }

  visitSetExpr(expr: Set) {
    const obj: Object = this.evaluate(expr.object);
    if (!(obj instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instances have fields.");
    }

    const val: Object = this.evaluate(expr.value);
    obj.set(expr.name, val);

    return val;
  }

  visitThisExpr(expr: This) {
    return this.lookUpVariable(expr.keyword, expr);
  }

  visitSuperExpr(expr: Super) {
    const distance = this.locals.get(expr);

    const superclass = <LoxClass>this.environment.getAt(distance, expr.keyword);
    const obj = <LoxInstance>(
      this.environment.getAt(distance - 1, new Token(TokenType.IDENTIFIER, "this", undefined, -1))
    );

    const name = expr.property.lexeme;
    const isStatic = obj instanceof LoxClass;

    const getter = superclass.findGetter(name, isStatic);
    if (getter) {
      const func = getter.bind(obj);
      return func.call(this, []);
    }

    const method = superclass.findMethod(name, isStatic);
    if (method) return method.bind(obj);

    throw new RuntimeError(expr.property, `Undefined property '${expr.property.lexeme}'.`);
  }

  visitSuperCallExpr(expr: SuperCall): Object {
    const distance = this.locals.get(expr);

    const superclass = <LoxClass>this.environment.getAt(distance, expr.keyword);
    const obj = <LoxInstance>(
      this.environment.getAt(distance - 1, new Token(TokenType.IDENTIFIER, "this", undefined, -1))
    );

    const args = expr.args.map((a) => this.evaluate(a));
    if (args.length !== superclass.arity()) {
      throw new RuntimeError(
        expr.keyword,
        `Expected ${superclass.arity()} arguments but got ${args.length}.`
      );
    }

    const initializer = superclass.findMethod("init", false);
    if (initializer) {
      initializer.bind(obj).call(this, args);
    }

    return null;
  }

  visitGroupingExpr(expr: Grouping): Object {
    return this.evaluate(expr.expression);
  }

  visitLiteralExpr(expr: Literal): Object {
    return expr.value;
  }

  visitUnaryExpr(expr: Unary): Object {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);
        return -(<number>right);
      case TokenType.BANG:
        return !this.isTruthy(right);
    }

    return null;
  }

  visitVariableExpr(expr: Variable) {
    return this.lookUpVariable(expr.name, expr);
  }

  private lookUpVariable(name: Token, expr: Expr) {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      return this.environment.getAt(distance, name);
    } else {
      return this.globals.get(name);
    }
  }

  visitFunctionExprExpr(expr: FunctionExpr) {
    return new CallableFunction(expr, this.environment);
  }

  evaluate(expr: Expr) {
    return expr.accept(this);
  }

  visitExpressionStmt(stmt: Expression) {
    this.evaluate(stmt.expression);
  }

  visitClassStmt(stmt: Class) {
    let superclass: Object;
    if (stmt.superclass) {
      superclass = this.evaluate(stmt.superclass);
      if (!(superclass instanceof LoxClass)) {
        throw new RuntimeError(stmt.superclass.name, "Superclass must be a class.");
      }
    }

    this.environment.define(stmt.name.lexeme, null);

    if (stmt.superclass) {
      this.environment = new Environment(this.environment);
      this.environment.define("super", superclass);
    }

    const staticProperties: ClassPropertiesRuntime = {
      methods: new Map(),
      getters: new Map(),
      fields: new CallableFunction(stmt.staticProperties.fields, this.environment),
    };

    const properties: ClassPropertiesRuntime = {
      methods: new Map(),
      getters: new Map(),
      fields: new CallableFunction(stmt.properties.fields, this.environment),
    };

    const methods = [stmt.staticProperties.methods, stmt.properties.methods];
    const getters = [stmt.staticProperties.getters, stmt.properties.getters];

    methods.forEach((ms) => {
      ms.forEach((m) => {
        const func = new CallableFunction(m, this.environment, m.name.lexeme === "init");

        if (ms === stmt.staticProperties.methods) staticProperties.methods.set(m.name.lexeme, func);
        else properties.methods.set(m.name.lexeme, func);
      });
    });

    getters.forEach((gs) => {
      gs.forEach((g) => {
        const func = new CallableFunction(g, this.environment);

        if (gs === stmt.staticProperties.getters) staticProperties.getters.set(g.name.lexeme, func);
        else properties.getters.set(g.name.lexeme, func);
      });
    });

    const klass = new LoxClass(stmt.name.lexeme, <LoxClass>superclass, properties, staticProperties, this);

    if (superclass) {
      this.environment = this.environment.enclosing;
    }

    this.environment.assign(stmt.name, klass);
  }

  visitFunctionStmt(stmt: Function) {
    const func = new CallableFunction(stmt, this.environment);
    this.environment.define(stmt.name.lexeme, func);
  }

  visitReturnStmt(stmt: Return) {
    let value: Object = null;
    if (stmt.value) value = this.evaluate(stmt.value);

    throw new ReturnError(value);
  }

  visitPrintStmt(stmt: Expression) {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
  }

  visitVarStmt(stmt: Var) {
    let value = null;
    if (stmt.initializer !== undefined) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);
  }

  visitBlockStmt(stmt: Block) {
    this.executeBlock(stmt.statements, new Environment(this.environment));
  }

  visitIfStmt(stmt: If) {
    const enter = this.isTruthy(this.evaluate(stmt.condition));
    if (enter) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch) {
      this.execute(stmt.elseBranch);
    }
  }

  visitWhileStmt(stmt: While) {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      try {
        this.execute(stmt.body);
      } catch (error) {
        if (error instanceof BreakError) {
          break;
        } else if (error instanceof ContinueError) {
          // execute increment if loop is really a for loop
          if (stmt.isFor && stmt.hasIncrement) {
            const block = <Block>stmt.body;
            this.execute(block.statements[1]);
          }

          continue;
        } else {
          throw error;
        }
      }
    }
  }

  visitBreakStmt(stmt: Break) {
    throw new BreakError();
  }

  visitContinueStmt(stmt: Break) {
    throw new ContinueError();
  }

  execute(stmt: Stmt) {
    return stmt.accept(this);
  }

  executeBlock(statements: Stmt[], environment: Environment) {
    const previous = this.environment;

    try {
      this.environment = environment;

      for (const s of statements) {
        this.execute(s);
      }
    } catch (error) {
      throw error;
    } finally {
      this.environment = previous;
    }
  }

  resolve(expr: Expr, depth: number) {
    this.locals.set(expr, depth);
  }

  private isTruthy(obj: Object): boolean {
    if (obj === null) return false;
    if (typeof obj === "boolean") return obj;

    return true;
  }

  private isEqual(a: Object, b: Object): boolean {
    // might be unnecessary check
    if (typeof a === "number" && isNaN(a)) return false;

    return a === b;
  }

  private stringify(obj: Object) {
    if (obj === null) return "nil";

    if (typeof obj === "number") {
      let str = obj.toString();
      if (str.endsWith(".0")) {
        str = str.substring(0, str.length - 2);
      }

      return str;
    }

    return obj.toString();
  }

  private checkNumberOperand(operator: Token, operand: Object) {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operand must be a number.");
  }

  private checkNumberOperands(operator: Token, left: Object, right: Object) {
    if (typeof left === "number" && typeof right === "number") return;
    throw new RuntimeError(operator, "Operands must be numbers.");
  }
}
