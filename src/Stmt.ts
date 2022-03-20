
    import Token from "./Token";
    import { Expr, Variable } from "./Expr";
    ;

    export abstract class Stmt {
      abstract accept<T>(visitor: Visitor<T>): T;
    }

    
    export interface Visitor<T> {
      visitBlockStmt(stmt: Block): T;
visitExpressionStmt(stmt: Expression): T;
visitFunctionStmt(stmt: Function): T;
visitReturnStmt(stmt: Return): T;
visitIfStmt(stmt: If): T;
visitPrintStmt(stmt: Print): T;
visitVarStmt(stmt: Var): T;
visitWhileStmt(stmt: While): T;
visitClassStmt(stmt: Class): T;
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
    
      export class Function extends Stmt {
        readonly name: Token;
readonly params: Token[];
readonly body: Stmt[];

        constructor(name: Token,params: Token[],body: Stmt[]) {
          super();
          this.name = name;
this.params = params;
this.body = body;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitFunctionStmt(this);
        }
      }
    
      export class Return extends Stmt {
        readonly keyword: Token;
readonly value: Expr | undefined;

        constructor(keyword: Token,value: Expr | undefined) {
          super();
          this.keyword = keyword;
this.value = value;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitReturnStmt(this);
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
    
      export class Class extends Stmt {
        readonly name: Token;
readonly superclass: Variable | undefined;
readonly methods: Function[];
readonly getters: Function[];
readonly staticMethods: Function[];
readonly staticGetters: Function[];

        constructor(name: Token,superclass: Variable | undefined,methods: Function[],getters: Function[],staticMethods: Function[],staticGetters: Function[]) {
          super();
          this.name = name;
this.superclass = superclass;
this.methods = methods;
this.getters = getters;
this.staticMethods = staticMethods;
this.staticGetters = staticGetters;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitClassStmt(this);
        }
      }
    
      export class Break extends Stmt {
        readonly keyword: Token;

        constructor(keyword: Token) {
          super();
          this.keyword = keyword;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitBreakStmt(this);
        }
      }
    
      export class Continue extends Stmt {
        readonly keyword: Token;

        constructor(keyword: Token) {
          super();
          this.keyword = keyword;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitContinueStmt(this);
        }
      }
    
    