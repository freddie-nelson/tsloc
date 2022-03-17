import Interpreter from "./Interpreter";

export default interface Callable {
  arity(): number;
  call(interpreter: Interpreter, args: Object[]): Object;
}

export function isCallable(obj: any): obj is Callable {
  return "arity" in obj && "call" in obj;
}
