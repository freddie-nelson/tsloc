import { readFileSync } from "fs";
import { createInterface } from "readline";
import Scanner from "./Scanner";
import Token from "./Token";

class Lox {
  static hadError = false;

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

      if (!proceed) break;
    }
  }

  private static run(source: string) {
    const scanner = new Scanner(source);
    const tokens: Token[] = scanner.scanTokens();
    tokens.forEach((t) => console.log(t));
  }

  static error(line: number, message: string) {
    Lox.report(line, "", message);
  }

  private static report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error ${where}: ${message}`);
    Lox.hadError = true;
  }
}

Lox.main(process.argv.slice(1, -1));
