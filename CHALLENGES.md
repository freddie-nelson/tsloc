# Challenges

## 5.1.

```
# names are bad because I didn't fully realise the expression was for function invocation

expr → expr loop;
expr → IDENTIFIER;
expr → NUMBER;

loop → or loop;
loop → or;

or → group;
or → "." IDENTIFIER;

group → "(" ")";
group → "(" expr comma_group ")";

comma_group → "," expr comma_group;
comma_group → "," expr;
```
