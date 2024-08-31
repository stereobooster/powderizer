import { describe, it, expect } from "vitest";
import { parse } from "../src/parse.js";
import {
  delimitedList,
  evaluate,
  parseGrammar,
  quotedString,
  rules,
} from "../src/grammar.js";
import { alt, reg, rep, seq, tok, recs, omit, lex } from "../src/dsl.js";
import { leftRec, thriceA, tripleA } from "./test_samples.js";

describe("quotedString", () => {
  it("quoted string empty", () => {
    const grammar = quotedString({ delimiter: '"', tag: "s" });
    expect(parse('""', grammar)).toEqual({ tag: "s", value: "" });
  });

  it("quoted string not empty", () => {
    const grammar = quotedString({ delimiter: "'", tag: "s" });
    expect(parse("'abc'", grammar)).toEqual({ tag: "s", value: "abc" });
  });

  it("quoted string with escape char 1", () => {
    const grammar = quotedString({ delimiter: "'", tag: "s" });
    expect(parse("'a\\'c'", grammar)).toEqual({ tag: "s", value: "a'c" });
  });

  it("quoted string with escape char 2", () => {
    const grammar = quotedString({ delimiter: "'", tag: "s" });
    expect(parse("'a\\\\c'", grammar)).toEqual({ tag: "s", value: "a\\c" });
  });

  it("unclosed quote 1", () => {
    const grammar = quotedString({ delimiter: "'" });
    expect(parse("'a", grammar)).toBeUndefined();
  });

  it("unclosed quote 2", () => {
    const grammar = quotedString({ delimiter: "'" });
    expect(parse("'a\\'", grammar)).toBeUndefined();
  });

  it("closed quote", () => {
    const grammar = quotedString({ delimiter: "'" });
    expect(parse("'a\\\\'", grammar)).toBeDefined();
  });

  it("multy line", () => {
    const grammar = quotedString({ delimiter: "'" });
    expect(parse("'\n'", grammar)).toBeDefined();
  });

  it.skip("no multy line", () => {
    const grammar = quotedString({ delimiter: "'" });
    expect(parse("'\n'", grammar)).toBeUndefined();
  });
});

describe("delimitedList", () => {
  it("simple list", () => {
    const grammar = delimitedList({
      delimiter: ",",
      item: reg(/\d/),
      tag: "lst",
    });
    expect(parse("1,2", grammar)).toEqual({
      children: [{ value: "1" }, { value: "2" }],
      tag: "lst",
    });
  });

  it("dangling delimeter", () => {
    const grammar = delimitedList({
      delimiter: ",",
      item: reg(/\d/),
      tag: "lst",
    });
    expect(parse("1,2,", grammar)).toBeUndefined();
  });

  it("one item list 1", () => {
    const grammar = delimitedList({
      delimiter: ",",
      item: seq([reg(/\d/)], "n"),
      tag: "lst",
    });
    expect(parse("1", grammar)).toEqual({
      children: [{ tag: "n", value: "1" }],
      tag: "lst",
    });
  });

  describe("footgun", () => {
    it("one item list 2", () => {
      const grammar = delimitedList({
        delimiter: ",",
        // without tag on item it will collapse list
        // which is not what one expeects
        item: reg(/\d/),
        tag: "lst",
      });

      expect(parse("1", grammar)).toEqual({
        tag: "lst",
        value: "1",
      });
    });
  });

  it("two items list", () => {
    const grammar = delimitedList({
      delimiter: ",",
      item: reg(/\d/),
      tag: "lst",
      min: 3,
    });

    expect(parse("1,2", grammar)).toBeUndefined();
  });

  it("optional spaces", () => {
    const grammar = delimitedList({
      delimiter: ",",
      item: reg(/\d/),
      tag: "lst",
      space: rep(reg(/\s/)),
    });

    expect(parse("1  , 2,3", grammar)).toEqual({
      children: [{ value: "1" }, { value: "2" }, { value: "3" }],
      tag: "lst",
    });
  });
});

describe("evaluate", () => {
  it("one rule tok with splitStringTokens", () => {
    const grammar1 = evaluate(parseGrammar(`S = "aaa"`), {
      splitStringTokens: true,
    });
    const grammar2 = thriceA();
    expect(grammar1).toEqual(grammar2);
  });

  it("one rule tok", () => {
    const grammar1 = evaluate(parseGrammar(`S = "aaa"`));
    const grammar2 = tripleA();
    expect(grammar1).toEqual(grammar2);
  });

  it("one rule seq", () => {
    const grammar1 = evaluate(parseGrammar(`S = "a" "a" "a"`));
    const grammar2 = thriceA();
    expect(grammar1).toEqual(grammar2);
  });

  it("one rule alt", () => {
    const grammar1 = evaluate(parseGrammar(`S = "a" | "b"`));
    const grammar2 = alt([tok("a"), tok("b")], "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("one rule seq and alt", () => {
    const grammar1 = evaluate(parseGrammar(`S = "a" | ("b" "c")`));
    const grammar2 = alt([tok("a"), seq([tok("b"), tok("c")])], "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("one rule rec", () => {
    const grammar1 = evaluate(parseGrammar(`S = S "a"| ""`));
    const grammar2 = leftRec();
    expect(grammar1).toEqual(grammar2);
  });

  it("two rules", () => {
    const grammar1 = evaluate(parseGrammar(`A = "" | ("a" B);B = "b"`));
    const grammar2 = alt([tok(""), seq([tok("a"), seq([tok("b")], "B")])], "A");
    expect(grammar1).toEqual(grammar2);
  });

  it("two rules rec", () => {
    const grammar1 = evaluate(parseGrammar(`A = "" | ("a" B);B = "b" | A`));
    const [grammar2] = recs((A, B) => [
      alt([tok(""), seq([tok("a"), B])], "A"),
      alt([tok("b"), A], "B"),
    ]);
    expect(grammar1).toEqual(grammar2);
  });

  it("optional spaces", () => {
    const grammar1 = evaluate(
      parseGrammar(`
        A = "" ;
      
      B = ( [ < "b" > ] )
      `)
    );
    expect(grammar1).toBeDefined();
  });

  it("undefined symbol", () => {
    expect(() => evaluate(parseGrammar(`A = "" | B`))).toThrow(
      "Undefined symbols: B"
    );
  });

  it("symbol defined twice", () => {
    expect(() => evaluate(parseGrammar(`A = ""; A = "a"`))).toThrow(
      "Symbol A already defined"
    );
  });

  it("tok directly in the body", () => {
    const grammar1 = evaluate(parseGrammar(`S = "a"`));
    const grammar2 = seq([tok("a")], "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("symbol directly in the body", () => {
    const grammar1 = evaluate(parseGrammar(`S = S`));
    const [grammar2] = recs((S) => [seq([S], "S")]);
    expect(grammar1).toEqual(grammar2);
  });

  it("empty string", () => {
    const grammar1 = evaluate(parseGrammar(`S = ""`));
    const grammar2 = seq([], "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("precedence", () => {
    const grammar1 = evaluate(parseGrammar(`S = (S "a") | ""`));
    const grammar2 = evaluate(parseGrammar(`S = S "a" | ""`));
    expect(grammar1).toEqual(grammar2);
  });

  it("Rep star", () => {
    const grammar1 = evaluate(parseGrammar(`S = ("a")*`));
    const grammar2 = rep(tok("a"), "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("Rep plus", () => {
    const grammar1 = evaluate(parseGrammar(`S = "a"+`));
    const grammar2 = rep(tok("a"), "S", 1);
    expect(grammar1).toEqual(grammar2);
  });

  it("Rep question", () => {
    const grammar1 = evaluate(parseGrammar(`S = "a"?`));
    const grammar2 = rep(tok("a"), "S", 0, 1);
    expect(grammar1).toEqual(grammar2);
  });

  it("Rep exact", () => {
    const grammar1 = evaluate(parseGrammar(`S = "a"{2}`));
    const grammar2 = rep(tok("a"), "S", 2, 2);
    expect(grammar1).toEqual(grammar2);
  });

  it("Rep min", () => {
    const grammar1 = evaluate(parseGrammar(`S = "a"{2,}`));
    const grammar2 = rep(tok("a"), "S", 2);
    expect(grammar1).toEqual(grammar2);
  });

  it("Rep min max", () => {
    const grammar1 = evaluate(parseGrammar(`S = "a"{2,3}`));
    const grammar2 = rep(tok("a"), "S", 2, 3);
    expect(grammar1).toEqual(grammar2);
  });

  it("Hidden symbol 1", () => {
    const grammar1 = evaluate(parseGrammar(`<S> = "a"`));
    const grammar2 = tok("a");
    expect(grammar1).toEqual(grammar2);
  });

  it("Hidden symbol 2", () => {
    const grammar1 = evaluate(parseGrammar(`<S> = "a" "b"`));
    const grammar2 = seq([tok("a"), tok("b")]);
    expect(grammar1).toEqual(grammar2);
  });

  it("Omitted symbol 1", () => {
    const grammar1 = evaluate(parseGrammar(`S = <"a">`));
    const grammar2 = seq([omit(tok("a"))], "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("Omitted symbol 2", () => {
    const grammar1 = evaluate(parseGrammar(`S = <"a"> "b"`));
    const grammar2 = seq([omit(tok("a")), tok("b")], "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("Omitted symbol 3", () => {
    const grammar1 = evaluate(parseGrammar(`S = <B> "b";B = "a"`));
    const grammar2 = seq([omit(seq([tok("a")], "B")), tok("b")], "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("Regexp", () => {
    const grammar1 = evaluate(parseGrammar(`S = #"a"`));
    const grammar2 = seq([reg(/a/)], "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("lex", () => {
    const grammar1 = evaluate(parseGrammar(`S = ["a" "a"]`));
    const grammar2 = seq([lex(seq([tok("a"), tok("a")]))], "S");
    expect(grammar1).toEqual(grammar2);
  });

  it("quotedString 1", () => {
    const grammarGrammar = `s = <"\\""> [(#"[^\\"\\\\\\\\]" | <"\\\\"> "\\\\" | <"\\\\"> "\\"")*]  <"\\"">`;
    const grammar1 = evaluate(parseGrammar(grammarGrammar));
    const grammar2 = quotedString({ delimiter: '"', tag: "s" });
    expect(grammar1).toEqual(grammar2);
  });

  it("delimitedList", () => {
    const grammarGrammar = `l = "a" (<<#"\\\\s"*> ("\n"|";") <#"\\\\s"*>> "a")*`;
    const grammar1 = evaluate(parseGrammar(grammarGrammar));
    const grammar2 = delimitedList({
      item: tok("a"),
      tag: "l",
      delimiter: alt([tok("\n"), tok(";")]),
      space: omit(rep(reg(/\s/))),
    });
    expect(grammar1).toEqual(grammar2);
  });

  it("self evaluation", () => {
    const grammarGrammar = `rules = rule (ruleSeparator rule)*
rule = (symbol | hiddenSymbol) optionalSpace <"="> optionalSpace exp
<exp> = variable | quantifier | seq | alt
symbol = identifier
hiddenSymbol = <"<"> identifier <">">
omittedSymbol = <"<"> exp <">">
lex = <"["> exp <"]">
token = string
<variable> = symbol | token | regexp | <"("> exp <")"> | omittedSymbol | lex
repStar = variable <"*">
repPlus = variable <"+">
repQuestion = variable <"?">
repExact = variable <"{"> integer <"}">
repMin = variable <"{"> integer <","> <"}">
repMinMax = variable <"{"> integer <","> integer <"}">
<quantifier> = repStar | repPlus | repQuestion | repExact | repMin | repMinMax
<seq_> = variable | quantifier
seq = seq_ (<optionalSpace #"\\\\s"+ optionalSpace> seq_)+
<alt_> = variable | quantifier | seq
alt = alt_ (<optionalSpace "|" optionalSpace> alt_)+
integer = #"[0-9]"+
regexp = <"#"> string
<optionalSpace> = <#"\\\\s"*>
<ruleSeparator> = <optionalSpace ("\n"|";") optionalSpace>
<identifier> = [#"[A-Za-z0-9_-]"+]
<string> = <"\\""> [(#"[^\\"\\\\\\\\]" | <"\\\\"> "\\\\" | <"\\\\"> "\\"")*]  <"\\"">`;

    const grammar = evaluate(parseGrammar(grammarGrammar));
    const tree1 = parse(grammarGrammar, grammar);
    const tree2 = parse(grammarGrammar, rules());
    expect(tree1).toBeDefined();
    expect(tree1).toEqual(tree2);
  });
});
