import Callable from "./Callable";
import CallableFunction from "./CallableFunction";
import Interpreter from "./Interpreter";
import LoxInstance from "./LoxInstance";

export default class LoxClass implements Callable {
  readonly name: string;
  private readonly methods: Map<string, CallableFunction>;
  private readonly getters: Map<string, CallableFunction>;

  constructor(name: string, methods: Map<string, CallableFunction>, getters: Map<string, CallableFunction>) {
    this.name = name;
    this.methods = methods;
    this.getters = getters;
  }

  call(interpreter: Interpreter, args: Object[]) {
    const instance = new LoxInstance(this);
    const initializer = this.findMethod("init");
    if (initializer) {
      initializer.bind(instance).call(interpreter, args);
    }

    return instance;
  }

  arity() {
    const initializer = this.findMethod("init");
    if (initializer) {
      return initializer.arity();
    }

    return 0;
  }

  findMethod(method: string): CallableFunction | undefined {
    if (this.methods.has(method)) {
      return this.methods.get(method);
    }
  }

  findGetter(getter: string): CallableFunction | undefined {
    if (this.getters.has(getter)) {
      return this.getters.get(getter);
    }
  }

  toString() {
    return this.name;
  }
}
