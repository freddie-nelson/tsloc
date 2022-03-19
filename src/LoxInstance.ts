import RuntimeError from "./errors/RuntimeError";
import LoxClass from "./LoxClass";
import Token from "./Token";

export default class LoxInstance {
  private klass: LoxClass;
  private readonly fields: Map<string, Object> = new Map();

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  get(name: Token) {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme);
    }

    const method = this.klass.findMethod(name.lexeme);
    if (method) return method.bind(this);

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.'`);
  }

  set(name: Token, value: Object) {
    this.fields.set(name.lexeme, value);
  }

  toString() {
    return `${this.klass.name} instance`;
  }
}
