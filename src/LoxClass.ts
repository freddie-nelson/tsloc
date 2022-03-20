import Callable from "./Callable";
import CallableFunction from "./CallableFunction";
import { Assign, FunctionExpr } from "./Expr";
import Interpreter from "./Interpreter";
import LoxInstance from "./LoxInstance";
import { Function } from "./Stmt";
import Token from "./Token";

export type ClassMethods = Map<string, CallableFunction>;

export interface ClassProperties {
  methods: Function[];
  getters: Function[];
  fields: FunctionExpr;
}

export interface ClassPropertiesRuntime {
  methods: ClassMethods;
  getters: ClassMethods;
  fields: CallableFunction;
}

export default class LoxClass extends LoxInstance implements Callable {
  readonly name: string;
  readonly superclass: LoxClass;

  private readonly properties: ClassPropertiesRuntime;
  private readonly staticProperties: ClassPropertiesRuntime;

  constructor(
    name: string,
    superclass: LoxClass,
    properties: ClassPropertiesRuntime,
    staticProperties: ClassPropertiesRuntime,
    interpreter: Interpreter
  ) {
    super();
    this.klass = this;

    this.superclass = superclass;
    this.name = name;

    this.properties = properties;
    this.staticProperties = staticProperties;

    // run static initializer
    let klass: LoxClass = this;
    while (klass) {
      this.staticProperties.fields.bind(this).call(interpreter, []);
      klass = klass.superclass;
    }

    const initializer = this.staticProperties.methods.get("init");
    if (initializer) {
      initializer.bind(this).call(interpreter, []);
    }
  }

  get(name: Token, interpreter: Interpreter): Object {
    return super.get(name, interpreter, true);
  }

  call(interpreter: Interpreter, args: Object[]) {
    const instance = new LoxInstance(this);

    // add initial fields
    let klass: LoxClass = this;
    while (klass) {
      klass.properties.fields.bind(instance).call(interpreter, []);
      klass = klass.superclass;
    }

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
    const props = isStatic ? this.staticProperties : this.properties;

    if (props.methods.has(method)) {
      return props.methods.get(method);
    }

    if (this.superclass) {
      return this.superclass.findMethod(method, isStatic);
    }

    return undefined;
  }

  findGetter(getter: string, isStatic: boolean): CallableFunction | undefined {
    const props = isStatic ? this.staticProperties : this.properties;

    if (props.getters.has(getter)) {
      return props.getters.get(getter);
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
