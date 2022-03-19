import {
  Assign,
  Binary,
  Call,
  Expr,
  Grouping,
  Literal,
  Logical,
  Unary,
  Variable,
  FunctionExpr,
  Get,
  Set,
  This,
} from "./Expr";
import Token from "./Token";
import { TokenType } from "./TokenType";
import Lox from "./Lox";
import ParseError from "./errors/ParseError";
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
  While,
} from "./Stmt";

export default class Parser {
  private readonly tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Stmt[] {
    // construct ast
    const statements: Stmt[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.declaration());
    }

    return statements;
  }

  private declaration(): Stmt {
    try {
      if (this.match(TokenType.CLASS)) return this.classDeclaration();
      if (this.match(TokenType.FUN)) return this.function("function");
      if (this.match(TokenType.VAR)) return this.varDeclaration();

      return this.statement();
    } catch (error) {
      this.synchronize();
      return null;
    }
  }

  private classDeclaration(): Stmt {
    const name = this.consume(TokenType.IDENTIFIER, "Expect class name.");
    this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.");

    const methods: Function[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this.function("method"));
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.");

    return new Class(name, methods);
  }

  private varDeclaration(): Stmt {
    const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.");

    let initializer: Expr;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
    return new Var(name, initializer);
  }

  private statement(): Stmt {
    if (this.match(TokenType.IF)) return this.ifStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.FOR)) return this.forStatement();
    if (this.match(TokenType.BREAK)) return this.breakStatement();
    if (this.match(TokenType.CONTINUE)) return this.continueStatement();
    if (this.match(TokenType.RETURN)) return this.returnStatement();
    if (this.match(TokenType.LEFT_BRACE)) return new Block(this.block());
    if (this.match(TokenType.PRINT)) return this.printStatement();

    return this.expressionStatement();
  }

  private ifStatement(): If {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after 'if' condition.");

    const thenBranch = this.statement();

    let elseBranch: Stmt;
    if (this.match(TokenType.ELSE)) elseBranch = this.statement();

    return new If(condition, thenBranch, elseBranch);
  }

  private whileStatement(): While {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after 'while' condition.");

    const body = this.statement();

    return new While(condition, body);
  }

  private forStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");

    let initializer: Stmt;
    if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition: Expr;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

    let increment: Expr;
    if (!this.check(TokenType.SEMICOLON)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.");

    let body = this.statement();

    // wrap for loop body in a block with increment at end
    if (increment) {
      body = new Block([body, new Expression(increment)]);
    }

    // create while loop with condition
    // if no condition was given then create true literal as condition (infinite loop)
    if (!condition) condition = new Literal(true);
    body = new While(condition, body, true, !!increment);

    // wrap while loop in block with initializer
    if (initializer) {
      body = new Block([initializer, body]);
    }

    return body;
  }

  private breakStatement(): Break {
    const keyword = this.previous();
    this.consume(TokenType.SEMICOLON, "Expect ';' after break.");

    return new Break(keyword);
  }

  private continueStatement(): Continue {
    const keyword = this.previous();
    this.consume(TokenType.SEMICOLON, "Expect ';' after continue.");

    return new Continue(keyword);
  }

  private returnStatement(): Return {
    const keyword = this.previous();
    let value: Expr;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");

    return new Return(keyword, value);
  }

  private block(): Stmt[] {
    const statements: Stmt[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
    return statements;
  }

  private printStatement(): Print {
    // PRINT token should be consumed already so just consume expression
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");

    return new Print(value);
  }

  private expressionStatement(): Expression {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");

    return new Expression(expr);
  }

  /**
   * Parses a functions parameters list.
   *
   * Expects the {@link TokenType.LEFT_PAREN} to already be consumed.
   *
   * @returns The list of parameters
   */
  private parameters(): Token[] {
    // parse parameter list
    const params: Token[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (params.length >= 255) this.error(this.peek(), "Can't have more than 255 parameters.");

        params.push(this.consume(TokenType.IDENTIFIER, "Expect parameter name."));
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");

    return params;
  }

  /**
   * Parses a function declaration.
   *
   * For functions it assumes the "fun" keyword has already been
   * consumed, this allows for methods to also be parsed.
   *
   * @param kind The kind of function ("function" | "method")
   * @returns The {@link Function} AST node
   */
  private function(kind: string): Function {
    // parse identifer
    const name = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);

    // parse parameters
    this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${kind} name.`);
    const params = this.parameters();

    // parse body
    this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${kind} body.`);
    const body = this.block();

    return new Function(name, params, body);
  }

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof Variable) {
        const name = expr.name;
        return new Assign(name, value);
      } else if (expr instanceof Get) {
        return new Set(expr.object, expr.name, value);
      }

      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  private or(): Expr {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();

      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  private and(): Expr {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();

      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  private equality(): Expr {
    let expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();

    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.term();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private term(): Expr {
    let expr = this.factor();

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new Unary(operator, right);
    }

    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expect property name after '.'.");
        expr = new Get(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: Expr): Expr {
    const args: Expr[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= 255) this.error(this.peek(), "Can't have more than 255 arguments.");

        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    const paren = this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.");

    return new Call(callee, paren, args);
  }

  private functionExpression() {
    // parse parameter list
    this.consume(TokenType.LEFT_PAREN, `Expect '(' after 'fun'.`);
    const params = this.parameters();

    // parse body
    this.consume(TokenType.LEFT_BRACE, `Expect '{' before function body.`);
    const body = this.block();

    return new FunctionExpr(params, body);
  }

  private primary(): Expr {
    if (this.match(TokenType.FALSE)) return new Literal(false);
    if (this.match(TokenType.TRUE)) return new Literal(true);
    if (this.match(TokenType.NIL)) return new Literal(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) return new Literal(this.previous().literal);

    if (this.match(TokenType.FUN)) return this.functionExpression();

    if (this.match(TokenType.THIS)) return new This(this.previous());

    if (this.match(TokenType.IDENTIFIER)) return new Variable(this.previous());

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new Grouping(expr);
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  /**
   * Checks if the current token matches any of the given types
   * and if so, consumes it.
   *
   * @param types An array of types to match for
   * @returns true when a token is matched, otherwise false.
   */
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  /**
   * Consumes the current token if it's type matches the given type.
   *
   * @throws When the types don't match
   *
   * @param type The type to check for
   * @param msg The message to log on error
   * @returns The consumed token
   */
  private consume(type: TokenType, msg: string) {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), msg);
  }

  /**
   * Checks to see if the current token matches the given type.
   *
   * Does not consume the current token.
   *
   * @param type The type to check for
   * @returns true if the type's match and this.isAtEnd() is false, otherwise false.
   */
  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  /**
   * Consumes the current token, incrementing this.current.
   *
   * @returns The consumed token.
   */
  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  /**
   * Checks to see if the current token's type is {@link TokenType.EOF}
   *
   * @returns true if end of file is reached otherwise false.
   */
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  /**
   * Gets the current token without consuming it.
   *
   * @returns The current token
   */
  private peek(): Token {
    return this.tokens[this.current];
  }

  /**
   * Gets the previous token.
   *
   * @returns The previous token
   */
  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private error(token: Token, msg: string): ParseError {
    Lox.error(token, msg);
    return new ParseError(msg);
  }

  private synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }
}
