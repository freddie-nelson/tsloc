import Environment from "./Environment";
import RuntimeError from "./errors/RuntimeError";
import { Assign, Binary, Expr, Grouping, Literal, Unary, Variable, Visitor as ExprVistor } from "./Expr";
import Lox from "./Lox";
import { Block, Expression, Stmt, Var, Visitor as StmtVisitor } from "./Stmt";
import Token from "./Token";
import { TokenType } from "./TokenType";

export default class Interpreter implements ExprVistor<Object>, StmtVisitor<void> {
  private environment = new Environment();

  constructor() {}

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
    this.environment.assign(expr.name, value);
    return value;
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
    return this.environment.get(expr.name);
  }

  private evaluate(expr: Expr) {
    return expr.accept(this);
  }

  visitExpressionStmt(stmt: Expression) {
    this.evaluate(stmt.expression);
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

  private execute(stmt: Stmt) {
    return stmt.accept(this);
  }

  private executeBlock(statements: Stmt[], environment: Environment) {
    const previous = this.environment;

    try {
      this.environment = environment;

      for (const s of statements) {
        this.execute(s);
      }
    } finally {
      this.environment = previous;
    }
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
