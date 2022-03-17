import Callable from "./Callable";
import Environment from "./Environment";
import ReturnError from "./errors/ReturnError";
import { FunctionExpr } from "./Expr";
import Interpreter from "./Interpreter";
import { Function } from "./Stmt";

export default class CallableFunction implements Callable {
  private readonly declaration: Function | FunctionExpr;
  private readonly closure: Environment;

  constructor(declaration: Function | FunctionExpr, closure: Environment) {
    this.declaration = declaration;
    this.closure = closure;
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
        return error.value;
      }
    }

    return null;
  }

  arity() {
    return this.declaration.params.length;
  }

  toString() {
    return `<fn ${this.declaration instanceof Function ? this.declaration.name.lexeme : "<expr>"}>`;
  }
}
