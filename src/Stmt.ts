
    import Token from "./Token";
    import { Expr } from "./Expr";

    export abstract class Stmt {
      abstract accept<T>(visitor: Visitor<T>): T;
    }

    
    export interface Visitor<T> {
      visitBlockStmt(stmt: Block): T;
visitExpressionStmt(stmt: Expression): T;
visitIfStmt(stmt: If): T;
visitPrintStmt(stmt: Print): T;
visitVarStmt(stmt: Var): T;
visitWhileStmt(stmt: While): T;
visitBreakStmt(stmt: Break): T;
visitContinueStmt(stmt: Continue): T;

    }
    

    
      export class Block extends Stmt {
        readonly statements: Stmt[];

        constructor(statements: Stmt[]) {
          super();
          this.statements = statements;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitBlockStmt(this);
        }
      }
    
      export class Expression extends Stmt {
        readonly expression: Expr;

        constructor(expression: Expr) {
          super();
          this.expression = expression;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitExpressionStmt(this);
        }
      }
    
      export class If extends Stmt {
        readonly condition: Expr;
readonly thenBranch: Stmt;
readonly elseBranch: Stmt | undefined;

        constructor(condition: Expr,thenBranch: Stmt,elseBranch: Stmt | undefined) {
          super();
          this.condition = condition;
this.thenBranch = thenBranch;
this.elseBranch = elseBranch;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitIfStmt(this);
        }
      }
    
      export class Print extends Stmt {
        readonly expression: Expr;

        constructor(expression: Expr) {
          super();
          this.expression = expression;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitPrintStmt(this);
        }
      }
    
      export class Var extends Stmt {
        readonly name: Token;
readonly initializer: Expr | undefined;

        constructor(name: Token,initializer: Expr | undefined) {
          super();
          this.name = name;
this.initializer = initializer;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitVarStmt(this);
        }
      }
    
      export class While extends Stmt {
        readonly condition: Expr;
readonly body: Stmt;
readonly isFor: boolean;
readonly hasIncrement: boolean;

        constructor(condition: Expr,body: Stmt,isFor =  false,hasIncrement =  false) {
          super();
          this.condition = condition;
this.body = body;
this.isFor = isFor;
this.hasIncrement = hasIncrement;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitWhileStmt(this);
        }
      }
    
      export class Break extends Stmt {
        

        constructor() {
          super();
          
        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitBreakStmt(this);
        }
      }
    
      export class Continue extends Stmt {
        

        constructor() {
          super();
          
        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitContinueStmt(this);
        }
      }
    
    