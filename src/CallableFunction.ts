import Callable from "./Callable";
import Environment from "./Environment";
import ReturnError from "./errors/ReturnError";
import { FunctionExpr } from "./Expr";
import Interpreter from "./Interpreter";
import LoxInstance from "./LoxInstance";
import { Function } from "./Stmt";
import Token from "./Token";
import { TokenType } from "./TokenType";

export default class CallableFunction implements Callable {
  private readonly declaration: Function | FunctionExpr;
  private readonly closure: Environment;

  private readonly isInitializer: boolean;

  constructor(declaration: Function | FunctionExpr, closure: Environment, isInitializer = false) {
    this.declaration = declaration;
    this.closure = closure;

    this.isInitializer = isInitializer;
  }

  bind(instance: LoxInstance) {
    const env = new Environment(this.closure);
    env.define("this", instance);

    return new CallableFunction(this.declaration, env, this.isInitializer);
  }

  call(interpreter: Interpreter, args: Object[]): Object {
    const env = new Environment(this.closure);
    this.declaration.params.forEach((d, i) => {
      env.define(d.lexeme, args[i]);
    });

    try {
      interpreter.executeBlock(this.declaration.body, env);
    } catch (error) {
      if (error instanceof ReturnError) {
        if (this.isInitializer)
          return this.closure.get(new Token(TokenType.IDENTIFIER, "this", undefined, -1));

        return error.value;
      }
    }

    if (this.isInitializer) return this.closure.get(new Token(TokenType.IDENTIFIER, "this", undefined, -1));

    return null;
  }

  arity() {
    return this.declaration.params.length;
  }

  toString() {
    return `<fn ${this.declaration instanceof Function ? this.declaration.name.lexeme : "<expr>"}>`;
  }
}
