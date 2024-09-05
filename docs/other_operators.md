Operators beyond what is implemented right now.

## Conjunction

Two basic operations in Context Free Grammar (CFG) are concatenation and alternation (or unordered choice). If we compare it to set operations we get:

| CFG            | sets                               | Boolean algebra |
| -------------- | ---------------------------------- | --------------- |
| concatentation | $\times$ cartesian product         |                 |
| alternation    | $\cup$ union                       | $\lor$          |
|                | $\cap$ intersection                | $\land$         |
|                | $A'$ ($A^{c}$) absolute complement | $\lnot$         |

We compare it to set operations because language is a set of all sentences (can be used in this language).

So what operation in language corresponds set intersection? Let's call it conjuction.

Idea of conjection in regards to languages was mentioned (not sure if it was first proposed by the author) [in 1964, in Brzozowki work about language derivatives](https://parsing.stereobooster.com/brzozowski-derivative/). Though he applied idea only for regular languages (CFG without general recursion).

Idea of adding general recursion to Kleene algebra (which corresponds to regular languages) was introduced in [1991](https://scholar.google.com/scholar?q=kleene+algebra+with+recursion).

Idea of adding conjuction to CFG appeared in 2001 (see [conjunctive grammar](https://scholar.google.com/scholar?q=conjunctive+grammar)).

Idea of adding general recursion to Brzozowki derivative appeared in 2011 (see [parsing with derivatives](https://parsing.stereobooster.com/pwd/)). Basically it can handle conjuctive grammar as is with small adition.

Conjuctive grammars are not wide-spreaded, because as is they don't have much practical value. But it can server as the basis for other useful operations.

To implement conjunction in PwD (parsing with derivatives) or PwZ (parsing with zippers) we need to use the same code as for alternation (`Alt` rule), but accept parse tree only if all branches are recognized. `Alt`, on the other hand, requires at least one branch recognized.

If we take interpration as if conjuction similar to alternation it means that conjunction always ambiguous - as if in alternation more than one branch recognized.

## Positive lookahead

I know that [PEG mentions it in 2004](https://parsing.stereobooster.com/peg/). I'm not sure if there are earlier mentions.

Positive lookahead recognizes string forward in parsing direction (typically left to right), but doesn't consumes it. It is denoted as `&X Y`, where `X` is lookahead and `Y` is the actual recognized grammar.

If we assume that lookahead pattern is shorter or equal to the main pattern we can see that it corresponds to conjuction - we need to recognize both patterns, but after recognition select only the second one

```
&X Y == <X .*> ∩ Y
```

Where `.*` any char any number of times (like in regular expressions). `<>` - omit operator, like in this library or in instaprse. This demonstrates how conjuction can be useful.

Unfortunately if lookahead is longer it won't work. Lookahead can "spill over".

```
S -> A B
A -> &X Y
```

Let's say `A` recognized string `123`, than part of lookahead still may apply to `B` - `& D(X, "123")`. Where `D` is Brzozowki derivative by string `123`.

## Negative lookahead

I know that [PEG mentions it in 2004](https://parsing.stereobooster.com/peg/). I'm not sure if there are earlier mentions.

It is denoted as `!X Y`. The same as positvie lookahead, with exception that `Y` only recognized if `X` not recognized.

```
!!X Y == &X Y
```

## Ordered choice

I know that [PEG mentions it in 2004](https://parsing.stereobooster.com/peg/). I'm not sure if there are earlier mentions.

If alternation allows recognition of branches in any order and any number of branches. Ordered choice would recognize branches in given order and if it recognizes any of branches it will not try to recognize other branches. Dented as `X / Y`

```
X / Y == X | !X Y
```

As we can see negative lookahead is the only distinctive operator in PEG. Other operators can be expressed with it.

## Negation

Idea of negation in regards to languages was mentioned (not sure if it was first proposed by the author) [in 1964, in Brzozowki work about language derivatives](https://parsing.stereobooster.com/brzozowski-derivative/). Though he applied idea only for regular languages (CFG without general recursion).

Idea of adding negation to CFG appeared in 2004 (see [boolean grammar](https://scholar.google.com/scholar?q=boolean+grammar)).

Negation is trickier than conjuction. For conjuction we can use the same semantics as for Kleene algebra - system of equation with least fixed point solution. But for negation it will not work. For example, how to interpret: $S \rarr \lnot S$. [Kountouriotis et al. in 2009 proposed well-founded semantics using fuzzy languages (based on a three-valued logic)](https://www.sciencedirect.com/science/article/pii/S0890540109001473).

See also [extending context-free grammars with conjunction and negation](https://www.cs.ru.nl/bachelors-theses/2021/Astrid_van_der_Jagt___4571037___Extending_context-free_grammars_with_conjunction_and_negation.pdf).

Also it is not clear (at least for me) how to construct parse tree for Boolean grammars (I can imagine, though, recognizer).

## Even more operators

Other operators that I haven't covered: lookbehind (negative and positive) and backreference.
