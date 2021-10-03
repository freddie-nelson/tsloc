import { writeFileSync } from "fs";
import { exit } from "process";

export default class GenerateAst {
  static main(args: string[]) {
    if (args.length !== 1) {
      console.log("Usage: generate_ast <output directory>");
      exit(64);
    }

    const outputDir = args[0];

    this.defineAst(outputDir, "Expr", [
      "Binary   :: left: Expr, operator: Token, right: Expr",
      "Grouping :: expression: Expr",
      "Literal  :: value: any",
      "Unary    :: operator: Token, right: Expr",
    ]);
  }

  private static defineAst(outputDir: string, baseName: string, types: string[]) {
    const path = `${outputDir}/${baseName}.ts`;
    const data = `
    import Token from "./Token";


    export abstract class ${baseName} {
      abstract accept<T>(visitor: Visitor<T>): T;
    }

    ${this.defineVisitor(baseName, types)}

    ${types.reduce((acc, t) => {
      const className = t.split("::")[0].trim();
      const fields = t.split("::")[1].trim();

      return acc + this.defineType(baseName, className, fields);
    }, "")}
    `;

    writeFileSync(path, data);
  }

  private static defineVisitor(baseName: string, types: string[]): string {
    let data = `
    export interface Visitor<T> {
      ${types.reduce((acc, t) => {
        const typeName = t.split(":")[0].trim();
        return acc + `visit${typeName}${baseName}(${baseName.toLowerCase()}: ${typeName}): T;\n`;
      }, "")}
    }
    `;

    return data;
  }

  private static defineType(baseName: string, className: string, fields: string): string {
    const props = fields.split(", ").map((f) => `readonly ${f.replace(",", ";")}`);
    let data = `
      export class ${className} extends ${baseName} {
        ${props.join("\n")}

        constructor(${fields}) {
          super();
          ${props.reduce(
            (acc, p) =>
              `${acc}this.${p.split(":")[0].slice("readonly ".length)} = ${p
                .split(":")[0]
                .slice("readonly ".length)};\n`,
            ""
          )}
        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visit${className}${baseName}(this);
        }
      }
    `;

    return data;
  }
}

GenerateAst.main(process.argv.slice(2));