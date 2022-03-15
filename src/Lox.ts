import { read, readFileSync } from "fs";
import { createInterface } from "readline";
import AstPrinter from "./AstPrinter";
import RuntimeError from "./errors/RuntimeError";
import Interpreter from "./Interpreter";
import Parser from "./Parser";
import Scanner from "./Scanner";
import Token from "./Token";
import { TokenType } from "./TokenType";

export default class Lox {
  static readonly interpreter = new Interpreter();

  static hadError = false;
  static hadRuntimeError = false;

  static main(args: string[]) {
    if (args.length > 1) {
      console.log("Usage: tsloc [script]");
      process.exit(64);
    } else if (args.length == 1) {
      Lox.runFile(args[0]);
    } else {
      Lox.runPrompt();
    }
  }

  private static runFile(path: string) {
    const file = readFileSync(path).toString();
    Lox.run(file);

    // indicate an error in the exit code
    if (Lox.hadError) process.exit(65);
    if (Lox.hadRuntimeError) process.exit(70);
  }

  private static async runPrompt() {
    const reader = createInterface({
      input: process.stdin,
    });

    while (true) {
      process.stdout.write("> ");

      const proceed = await new Promise((resolve) => {
        reader.on("line", (line) => {
          if (line === null) {
            reader.close();
            resolve(false);
          }

          Lox.run(line);
          Lox.hadError = false;
          resolve(true);
        });
      });

      reader.removeAllListeners("line");

      if (!proceed) break;
    }
  }

  private static run(source: string) {
    const scanner = new Scanner(source);
    const tokens: Token[] = scanner.scanTokens();

    const parser = new Parser(tokens);
    const expression = parser.parse();

    if (this.hadError) return;

    this.interpreter.interpret(expression);

    // console.log(expression);
    // console.log(new AstPrinter().print(expression));
  }

  static error(token: Token, message: string) {
    if (token.type === TokenType.EOF) {
      this.report(token.line, "at end", message);
    } else {
      this.report(token.line, `at '${token.lexeme}'`, message);
    }
  }

  static runtimeError(error: RuntimeError) {
    console.error(`[line ${error.token.line}]: ${error.message}`);
    this.hadRuntimeError = true;
  }

  private static report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error ${where}: ${message}`);
    Lox.hadError = true;
  }
}

Lox.main(process.argv.slice(2));
