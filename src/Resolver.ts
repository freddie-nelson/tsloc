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
  Visitor as ExprVisitor,
} from "./Expr";
import Interpreter from "./Interpreter";
import Lox from "./Lox";
import {
  Block,
  Break,
  Class,
  Continue,
  Expression,
  Function,
  If,
  Print,
  Return,
  Stmt,
  Var,
  Visitor as StmtVisitor,
  While,
} from "./Stmt";
import Token from "./Token";
import { TokenType } from "./TokenType";

export enum VariableState {
  DECLARED,
  DEFINED,
  USED,
}

export enum FunctionType {
  NONE,
  FUNCTION,
  INITIALIZER,
  STATIC_INITIALIZER,
  METHOD,
}

export enum ClassType {
  NONE,
  CLASS,
  DERIVED,
}

export enum LoopType {
  NONE,
  WHILE,
}

export default class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
  private readonly interpreter: Interpreter;

  /**
   * Local scopes stack.
   *
   * The value (true, false) associated with each key in a map represents
   * wether or not we have finished resolving that variable's initializer.
   */
  private readonly scopes: Map<string, VariableState>[] = [];

  private currentFunction: FunctionType = FunctionType.NONE;
  private currentClass: ClassType = ClassType.NONE;
  private currentLoop: LoopType = LoopType.NONE;

  private currentSuperCall = false;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  visitBlockStmt(stmt: Block) {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
  }

  visitClassStmt(stmt: Class) {
    this.declare(stmt.name);
    this.define(stmt.name);

    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;

    if (stmt.superclass) {
      if (stmt.name.lexeme === stmt.superclass.name.lexeme)
        Lox.error(stmt.superclass.name, "A class can't inherit from itself.");

      this.currentClass = ClassType.DERIVED;

      this.resolve(stmt.superclass);

      this.beginScope();
      this.scopes[this.scopes.length - 1].set("super", VariableState.USED);
    }

    this.beginScope();
    this.scopes[this.scopes.length - 1].set("this", VariableState.USED);

    const methods = [stmt.methods, stmt.staticMethods];
    const getters = [stmt.getters, stmt.staticGetters];

    methods.forEach((ms, i) => {
      ms.forEach((m) => {
        if (getters[i].find((g) => m.name.lexeme === g.name.lexeme))
          Lox.error(m.name, `Duplicate method and getter name '${m.name.lexeme}' in class.`);

        let declaration = FunctionType.METHOD;
        if (m.name.lexeme === "init") {
          declaration =
            ms === stmt.staticMethods ? FunctionType.STATIC_INITIALIZER : FunctionType.INITIALIZER;

          if (ms === stmt.staticMethods && m.params.length > 0) {
            Lox.error(m.name, "Class static initializer can't have parameters.");
          }
        }

        this.resolveFunction(m, declaration);
      });
    });

    getters.forEach((gs) => {
      gs.forEach((g) => {
        let declaration = FunctionType.METHOD;
        this.resolveFunction(g, declaration);
      });
    });

    this.endScope();

    if (stmt.superclass) this.endScope();

    this.currentClass = enclosingClass;
  }

  visitFunctionStmt(stmt: Function) {
    this.declare(stmt.name);
    this.define(stmt.name);

    this.resolveFunction(stmt, FunctionType.FUNCTION);
  }

  visitVarStmt(stmt: Var) {
    this.declare(stmt.name);
    if (stmt.initializer) {
      this.resolve(stmt.initializer);
    }
    this.define(stmt.name);
  }

  visitExpressionStmt(stmt: Expression) {
    this.resolve(stmt.expression);
  }

  visitIfStmt(stmt: If) {
    this.resolve(stmt.condition);
    this.resolve(stmt.thenBranch);
    if (stmt.elseBranch) this.resolve(stmt.elseBranch);
  }

  visitPrintStmt(stmt: Print) {
    this.resolve(stmt.expression);
  }

  visitWhileStmt(stmt: While) {
    this.resolve(stmt.condition);

    const enclosingLoop = this.currentLoop;
    this.currentLoop = LoopType.WHILE;

    this.resolve(stmt.body);

    this.currentLoop = enclosingLoop;
  }

  visitReturnStmt(stmt: Return) {
    if (this.currentFunction === FunctionType.NONE)
      Lox.error(stmt.keyword, "Can't return from top-level code.");

    if (stmt.value) {
      if (
        this.currentFunction === FunctionType.INITIALIZER ||
        this.currentFunction === FunctionType.STATIC_INITIALIZER
      )
        Lox.error(stmt.keyword, "Can't return a value from an initializer.");

      this.resolve(stmt.value);
    }
  }

  visitContinueStmt(stmt: Continue) {
    if (this.currentLoop === LoopType.NONE) Lox.error(stmt.keyword, "Illegal continue statement.");
  }

  visitBreakStmt(stmt: Break) {
    if (this.currentLoop === LoopType.NONE) Lox.error(stmt.keyword, "Illegal continue statement.");
  }

  visitAssignExpr(expr: Assign) {
    this.resolve(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  visitVariableExpr(expr: Variable) {
    if (
      this.scopes.length !== 0 &&
      this.scopes[this.scopes.length - 1].get(expr.name.lexeme) === VariableState.DECLARED
    )
      Lox.error(expr.name, "Can't read local variable in it's own initializer.");

    this.resolveLocal(expr, expr.name);
  }

  visitFunctionExprExpr(expr: FunctionExpr) {
    this.resolveFunction(expr, FunctionType.FUNCTION);
  }

  visitBinaryExpr(expr: Binary) {
    this.resolve(expr.left);
    this.resolve(expr.right);
  }

  visitCallExpr(expr: Call) {
    this.resolve(expr.callee);
    expr.args.forEach((a) => this.resolve(a));
  }

  visitGetExpr(expr: Get) {
    this.resolve(expr.object);
  }

  visitSetExpr(expr: Set) {
    this.resolve(expr.value);
    this.resolve(expr.object);
  }

  visitThisExpr(expr: This) {
    if (this.currentClass === ClassType.NONE) Lox.error(expr.keyword, "Can't use 'this' outside of a class.");

    this.resolveLocal(expr, expr.keyword);
  }

  visitSuperExpr(expr: Super) {
    if (this.currentClass !== ClassType.DERIVED)
      Lox.error(expr.keyword, "Can't use 'super' outside of a derived class.");
    if (this.currentFunction === FunctionType.INITIALIZER && !this.currentSuperCall)
      Lox.error(expr.keyword, "Can't access property on superclass until 'super' has been called.");

    this.resolveLocal(expr, expr.keyword);
  }

  visitSuperCallExpr(expr: SuperCall) {
    if (this.currentClass !== ClassType.DERIVED)
      Lox.error(expr.keyword, "Can't use 'super' outside of a derived class.");
    if (this.currentFunction === FunctionType.STATIC_INITIALIZER)
      Lox.error(expr.keyword, "Can't call 'super' inisde class static initializer.");
    else if (this.currentFunction !== FunctionType.INITIALIZER)
      Lox.error(expr.keyword, "Can't call 'super' outside of class initializer.");
    if (this.currentFunction === FunctionType.INITIALIZER && this.currentSuperCall)
      Lox.error(expr.keyword, "Can't call 'super' more than once inside class initializer.");

    this.currentSuperCall = true;
    this.resolveLocal(expr, expr.keyword);

    expr.args.forEach((a) => this.resolve(a));
  }

  visitGroupingExpr(expr: Grouping) {
    this.resolve(expr.expression);
  }

  visitLiteralExpr(expr: Literal) {}

  visitLogicalExpr(expr: Logical) {
    this.resolve(expr.left);
    this.resolve(expr.right);
  }

  visitUnaryExpr(expr: Unary) {
    this.resolve(expr.right);
  }

  resolve(statements: Stmt[]): void;

  resolve(statement: Stmt): void;

  resolve(expr: Expr): void;

  resolve(s: Expr | Stmt | Stmt[]): void {
    if (Array.isArray(s)) {
      s.forEach((s) => this.resolve(s));
    } else {
      s.accept(this);
    }
  }

  private resolveFunction(func: Function | FunctionExpr, type: FunctionType) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;

    const enclosingLoop = this.currentLoop;
    this.currentLoop = LoopType.NONE;

    this.beginScope();
    func.params.forEach((p) => {
      this.declare(p);
      this.define(p);
    });
    this.resolve(func.body);
    this.endScope();

    if (
      type === FunctionType.INITIALIZER &&
      this.currentClass === ClassType.DERIVED &&
      !this.currentSuperCall
    ) {
      Lox.error((<Function>func).name, "Superclass was not initialized inside subclass initializer.");
    }
    this.currentSuperCall = false;

    this.currentFunction = enclosingFunction;
    this.currentLoop = enclosingLoop;
  }

  private beginScope() {
    this.scopes.push(new Map());
  }

  private endScope() {
    const old = this.scopes.pop();
    this.checkUnusedVariables(old);
  }

  private checkUnusedVariables(scope: Map<string, VariableState>) {
    for (const [name, state] of scope.entries()) {
      if (state !== VariableState.USED)
        Lox.error(new Token(TokenType.IDENTIFIER, name, undefined, -1), `Unused local variable ${name}.`);
    }
  }

  private declare(name: Token) {
    if (this.scopes.length === 0) return;

    const scope = this.scopes[this.scopes.length - 1];
    if (scope.has(name.lexeme)) Lox.error(name, "Already a variable with that name in this scope.");

    scope.set(name.lexeme, VariableState.DECLARED);
  }

  private define(name: Token) {
    if (this.scopes.length === 0) return;

    const scope = this.scopes[this.scopes.length - 1];
    scope.set(name.lexeme, VariableState.DEFINED);
  }

  private resolveLocal(expr: Expr, name: Token) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        this.scopes[i].set(name.lexeme, VariableState.USED);
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }
}
