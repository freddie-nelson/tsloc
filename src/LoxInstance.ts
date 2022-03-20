import RuntimeError from "./errors/RuntimeError";
import Interpreter from "./Interpreter";
import LoxClass from "./LoxClass";
import Token from "./Token";

export default class LoxInstance {
  klass: LoxClass;
  super: LoxInstance;

  private readonly fields: Map<string, Object> = new Map();

  constructor(klass?: LoxClass) {
    this.klass = klass;
  }

  get(name: Token, interpreter: Interpreter, isStatic = false): Object {
    let instance: LoxInstance = this;
    while (instance) {
      if (instance.fields.has(name.lexeme)) {
        return instance.fields.get(name.lexeme);
      }

      instance = instance.super;
    }

    const getter = this.klass.findGetter(name.lexeme, isStatic);
    if (getter) {
      const func = getter.bind(this, this.super);
      return func.call(interpreter, []);
    }

    const method = this.klass.findMethod(name.lexeme, isStatic);
    if (method) return method.bind(this, this.super);

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`);
  }

  set(name: Token, value: Object) {
    this.fields.set(name.lexeme, value);
  }

  toString() {
    return `${this.klass.name} instance`;
  }
}
