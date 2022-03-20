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
  Visitor,
} from "./Expr";

export default class AstPrinter implements Visitor<string> {
  print(expr: Expr): string {
    return expr.accept(this);
  }

  visitGetExpr(expr: Get): string {
    return this.parenthesize(expr.name.lexeme, expr.object);
  }

  visitSetExpr(expr: Set): string {
    return this.parenthesize(expr.name.lexeme, expr.object, expr.value);
  }

  visitAssignExpr(expr: Assign): string {
    return this.parenthesize(expr.name.lexeme, expr.value);
  }

  visitLogicalExpr(expr: Logical): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitBinaryExpr(expr: Binary): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitCallExpr(expr: Call): string {
    return "CallExpression";
  }

  visitFunctionExprExpr(expr: FunctionExpr): string {
    return "<fn>";
  }

  visitGroupingExpr(expr: Grouping): string {
    return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: Literal): string {
    if (expr.value === null) return "nil";
    return String(expr.value);
  }

  visitUnaryExpr(expr: Unary): string {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  visitVariableExpr(expr: Variable): string {
    return expr.name.lexeme;
  }

  visitThisExpr(expr: This): string {
    return "this";
  }

  visitSuperExpr(expr: Super): string {
    return "super";
  }

  visitSuperCallExpr(expr: SuperCall): string {
    return this.parenthesize("super_call", ...expr.args);
  }

  private parenthesize(name: string, ...exprs: Expr[]) {
    return `(${name} ${exprs.map((expr) => ` ${expr.accept(this)}`).join("")})`;
  }
}

// function test() {
//   const expr = new Binary(
//     new Unary(new Token(TokenType.MINUS, "-", null, 1), new Literal(123)),
//     new Token(TokenType.STAR, "+", null, 1),
//     new Grouping(new Literal(45.67))
//   );

//   console.log(new AstPrinter().print(expr));
// }

// test();
