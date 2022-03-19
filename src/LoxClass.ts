import Callable from "./Callable";
import CallableFunction from "./CallableFunction";
import Interpreter from "./Interpreter";
import LoxInstance from "./LoxInstance";
import Token from "./Token";

export type ClassMethods = Map<string, CallableFunction>;

export default class LoxClass extends LoxInstance implements Callable {
  readonly name: string;

  private readonly staticMethods: ClassMethods;
  private readonly staticGetters: ClassMethods;

  private readonly methods: ClassMethods;
  private readonly getters: ClassMethods;

  constructor(
    name: string,
    methods: ClassMethods,
    getters: ClassMethods,
    staticMethods: ClassMethods,
    staticGetters: ClassMethods,
    interpreter: Interpreter
  ) {
    super();
    this.klass = this;

    this.name = name;

    this.staticMethods = staticMethods;
    this.staticGetters = staticGetters;

    this.methods = methods;
    this.getters = getters;

    // run static initializer
    const initializer = this.findMethod("init", true);
    if (initializer) {
      initializer.bind(this).call(interpreter, []);
    }
  }

  get(name: Token, interpreter: Interpreter): Object {
    return super.get(name, interpreter, true);
  }

  call(interpreter: Interpreter, args: Object[]) {
    const instance = new LoxInstance(this);
    const initializer = this.findMethod("init", false);
    if (initializer) {
      initializer.bind(instance).call(interpreter, args);
    }

    return instance;
  }

  arity() {
    const initializer = this.findMethod("init", false);
    if (initializer) {
      return initializer.arity();
    }

    return 0;
  }

  findMethod(method: string, isStatic: boolean): CallableFunction | undefined {
    if (isStatic) {
      if (this.staticMethods.has(method)) {
        return this.staticMethods.get(method);
      }

      return undefined;
    }

    if (this.methods.has(method)) {
      return this.methods.get(method);
    }

    return undefined;
  }

  findGetter(getter: string, isStatic: boolean): CallableFunction | undefined {
    if (isStatic) {
      if (this.staticGetters.has(getter)) {
        return this.staticGetters.get(getter);
      }

      return undefined;
    }

    if (this.getters.has(getter)) {
      return this.getters.get(getter);
    }

    return undefined;
  }

  toString() {
    return this.name;
  }
}
