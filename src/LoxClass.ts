import Callable from "./Callable";
import CallableFunction from "./CallableFunction";
import Interpreter from "./Interpreter";
import LoxInstance from "./LoxInstance";
import Token from "./Token";

export type ClassMethods = Map<string, CallableFunction>;

export default class LoxClass extends LoxInstance implements Callable {
  readonly name: string;
  readonly superclass: LoxClass;

  private readonly staticMethods: ClassMethods;
  private readonly staticGetters: ClassMethods;

  private readonly methods: ClassMethods;
  private readonly getters: ClassMethods;

  constructor(
    name: string,
    superclass: LoxClass,
    methods: ClassMethods,
    getters: ClassMethods,
    staticMethods: ClassMethods,
    staticGetters: ClassMethods,
    interpreter: Interpreter
  ) {
    super();
    this.klass = this;

    this.superclass = superclass;
    this.name = name;

    this.staticMethods = staticMethods;
    this.staticGetters = staticGetters;

    this.methods = methods;
    this.getters = getters;

    // run static initializer
    const initializer = this.staticMethods.get("init");
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

  findProperty(property: string, isStatic: boolean): CallableFunction | undefined {
    const getter = this.findGetter(property, isStatic);
    if (getter) return getter;

    const method = this.findMethod(property, isStatic);
    if (method) return method;
  }

  findMethod(method: string, isStatic: boolean): CallableFunction | undefined {
    if (isStatic) {
      if (this.staticMethods.has(method)) {
        return this.staticMethods.get(method);
      }

      if (this.superclass) {
        return this.superclass.findMethod(method, isStatic);
      }

      return undefined;
    }

    if (this.methods.has(method)) {
      return this.methods.get(method);
    }

    if (this.superclass) {
      return this.superclass.findMethod(method, isStatic);
    }

    return undefined;
  }

  findGetter(getter: string, isStatic: boolean): CallableFunction | undefined {
    if (isStatic) {
      if (this.staticGetters.has(getter)) {
        return this.staticGetters.get(getter);
      }

      if (this.superclass) {
        return this.superclass.findGetter(getter, isStatic);
      }

      return undefined;
    }

    if (this.getters.has(getter)) {
      return this.getters.get(getter);
    }

    if (this.superclass) {
      return this.superclass.findGetter(getter, isStatic);
    }

    return undefined;
  }

  toString() {
    return this.name;
  }
}
