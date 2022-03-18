import {
  Assign,
  Binary,
  Call,
  Expr,
  FunctionExpr,
  Grouping,
  Literal,
  Logical,
  Unary,
  Variable,
  Visitor as ExprVisitor,
} from "./Expr";
import Interpreter from "./Interpreter";
import Lox from "./Lox";
import {
  Block,
  Break,
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

export enum FunctionType {
  NONE,
  FUNCTION,
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
  private readonly scopes: Map<string, boolean>[] = [];

  private currentFunction: FunctionType = FunctionType.NONE;
  private currentLoop: LoopType = LoopType.NONE;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  visitBlockStmt(stmt: Block) {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
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

    if (stmt.value) this.resolve(stmt.value);
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
    if (this.scopes.length !== 0 && this.scopes[this.scopes.length - 1].get(expr.name.lexeme) === false)
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

    this.currentFunction = enclosingFunction;
    this.currentLoop = enclosingLoop;
  }

  private beginScope() {
    this.scopes.push(new Map());
  }

  private endScope() {
    this.scopes.pop();
  }

  private declare(name: Token) {
    if (this.scopes.length === 0) return;

    const scope = this.scopes[this.scopes.length - 1];
    if (scope.has(name.lexeme)) Lox.error(name, "Already a variable with that name in this scope.");

    scope.set(name.lexeme, false);
  }

  private define(name: Token) {
    if (this.scopes.length === 0) return;

    const scope = this.scopes[this.scopes.length - 1];
    scope.set(name.lexeme, true);
  }

  private resolveLocal(expr: Expr, name: Token) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }
}
