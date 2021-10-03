import { Binary, Expr, Grouping, Literal, Unary, Visitor } from "./Expr";
import Token from "./Token";
import { TokenType } from "./TokenType";

export default class AstPrinter implements Visitor<string> {
  print(expr: Expr): string {
    return expr.accept(this);
  }

  visitBinaryExpr(expr: Binary): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
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