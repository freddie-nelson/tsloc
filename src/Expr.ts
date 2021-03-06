
    import Token from "./Token";
    import { ClassProperties } from "./LoxClass";
    ;
    import { Stmt } from "./Stmt";

    export abstract class Expr {
      abstract accept<T>(visitor: Visitor<T>): T;
    }

    
    export interface Visitor<T> {
      visitAssignExpr(expr: Assign): T;
visitLogicalExpr(expr: Logical): T;
visitBinaryExpr(expr: Binary): T;
visitCallExpr(expr: Call): T;
visitGetExpr(expr: Get): T;
visitSetExpr(expr: Set): T;
visitThisExpr(expr: This): T;
visitSuperExpr(expr: Super): T;
visitSuperCallExpr(expr: SuperCall): T;
visitGroupingExpr(expr: Grouping): T;
visitLiteralExpr(expr: Literal): T;
visitUnaryExpr(expr: Unary): T;
visitVariableExpr(expr: Variable): T;
visitFunctionExprExpr(expr: FunctionExpr): T;

    }
    

    
      export class Assign extends Expr {
        readonly name: Token;
readonly value: Expr;

        constructor(name: Token,value: Expr) {
          super();
          this.name = name;
this.value = value;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitAssignExpr(this);
        }
      }
    
      export class Logical extends Expr {
        readonly left: Expr;
readonly operator: Token;
readonly right: Expr;

        constructor(left: Expr,operator: Token,right: Expr) {
          super();
          this.left = left;
this.operator = operator;
this.right = right;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitLogicalExpr(this);
        }
      }
    
      export class Binary extends Expr {
        readonly left: Expr;
readonly operator: Token;
readonly right: Expr;

        constructor(left: Expr,operator: Token,right: Expr) {
          super();
          this.left = left;
this.operator = operator;
this.right = right;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitBinaryExpr(this);
        }
      }
    
      export class Call extends Expr {
        readonly callee: Expr;
readonly paren: Token;
readonly args: Expr[];

        constructor(callee: Expr,paren: Token,args: Expr[]) {
          super();
          this.callee = callee;
this.paren = paren;
this.args = args;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitCallExpr(this);
        }
      }
    
      export class Get extends Expr {
        readonly object: Expr;
readonly name: Token;

        constructor(object: Expr,name: Token) {
          super();
          this.object = object;
this.name = name;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitGetExpr(this);
        }
      }
    
      export class Set extends Expr {
        readonly object: Expr;
readonly name: Token;
readonly value: Expr;

        constructor(object: Expr,name: Token,value: Expr) {
          super();
          this.object = object;
this.name = name;
this.value = value;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitSetExpr(this);
        }
      }
    
      export class This extends Expr {
        readonly keyword: Token;

        constructor(keyword: Token) {
          super();
          this.keyword = keyword;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitThisExpr(this);
        }
      }
    
      export class Super extends Expr {
        readonly keyword: Token;
readonly property: Token;

        constructor(keyword: Token,property: Token) {
          super();
          this.keyword = keyword;
this.property = property;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitSuperExpr(this);
        }
      }
    
      export class SuperCall extends Expr {
        readonly keyword: Token;
readonly args: Expr[];

        constructor(keyword: Token,args: Expr[]) {
          super();
          this.keyword = keyword;
this.args = args;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitSuperCallExpr(this);
        }
      }
    
      export class Grouping extends Expr {
        readonly expression: Expr;

        constructor(expression: Expr) {
          super();
          this.expression = expression;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitGroupingExpr(this);
        }
      }
    
      export class Literal extends Expr {
        readonly value: any;

        constructor(value: any) {
          super();
          this.value = value;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitLiteralExpr(this);
        }
      }
    
      export class Unary extends Expr {
        readonly operator: Token;
readonly right: Expr;

        constructor(operator: Token,right: Expr) {
          super();
          this.operator = operator;
this.right = right;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitUnaryExpr(this);
        }
      }
    
      export class Variable extends Expr {
        readonly name: Token;

        constructor(name: Token) {
          super();
          this.name = name;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitVariableExpr(this);
        }
      }
    
      export class FunctionExpr extends Expr {
        readonly params: Token[];
readonly body: Stmt[];

        constructor(params: Token[],body: Stmt[]) {
          super();
          this.params = params;
this.body = body;

        }

        accept<T>(visitor: Visitor<T>): T {
          return visitor.visitFunctionExprExpr(this);
        }
      }
    
    