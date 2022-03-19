import RuntimeError from "./errors/RuntimeError";
import Interpreter from "./Interpreter";
import LoxClass from "./LoxClass";
import Token from "./Token";

export default class LoxInstance {
  protected klass: LoxClass;
  private readonly fields: Map<string, Object> = new Map();

  constructor(klass?: LoxClass) {
    this.klass = klass;
  }

  get(name: Token, interpreter: Interpreter, isStatic = false): Object {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme);
    }

    const getter = this.klass.findGetter(name.lexeme, isStatic);
    if (getter) {
      const func = getter.bind(this);
      return func.call(interpreter, []);
    }

    const method = this.klass.findMethod(name.lexeme, isStatic);
    if (method) return method.bind(this);

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`);
  }

  set(name: Token, value: Object) {
    this.fields.set(name.lexeme, value);
  }

  toString() {
    return `${this.klass.name} instance`;
  }
}
