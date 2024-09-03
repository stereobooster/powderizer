import { describe, it, expect } from "vitest";
import { parse } from "../src/parse.js";
import { alt, seq, tok, rep, omit, lex, reg } from "../src/dsl.js";
import { count_trees, first_tree } from "../src/utils.js";
import { leftRec, mathExp, thriceA } from "./test_samples.js";

describe("parse", () => {
  it("Tok", () => {
    const grammar = tok("1");
    const tree = parse("1", grammar);
    expect(tree).toEqual({ value: "1" });
  });

  it("Tok twice", () => {
    const grammar = seq([tok("1"), tok("1")]);
    const tree = parse("11", grammar);
    expect(tree).toEqual({
      children: [{ value: "1" }, { value: "1" }],
      tag: "",
    });
  });

  it("same Tok twice", () => {
    const t = tok("1");
    const grammar = seq([t, t]);
    const tree = parse("11", grammar);
    expect(tree).toEqual({
      children: [{ value: "1" }, { value: "1" }],
      tag: "",
    });
  });

  it("Lex", () => {
    const grammar1 = lex(mathExp());
    const tree1 = parse("1+1+1", grammar1);
    const grammar2 = tok("1+1+1");
    const tree2 = parse(["1+1+1"], grammar2);
    expect(tree1).toEqual(tree2);
  });

  it("Reg", () => {
    const grammar = reg(/[a-z]/);
    const tree1 = parse("e", grammar);
    expect(tree1).toEqual({ value: "e" });
    const tree2 = parse("E", grammar);
    expect(tree2).toBeUndefined();
  });

  it("Kleene star 1", () => {
    const grammar1 = seq([], "S");
    const grammar2 = rep(tok("a"), "S");
    const tree1 = parse("", grammar1);
    const tree2 = parse("", grammar2);
    expect(tree1).toEqual(tree2);
  });

  it("Kleene star 2", () => {
    const grammar1 = thriceA();
    const grammar2 = rep(tok("a"), "S");
    const tree1 = parse("aaa", grammar1);
    const tree2 = parse("aaa", grammar2);
    expect(tree1).toEqual(tree2);
  });

  it("Kleene plus 1", () => {
    const grammar = rep(tok("a"), "S", 1);
    const tree = parse("", grammar);
    expect(tree).toBeUndefined();
  });

  it("Kleene plus 2", () => {
    const grammar1 = thriceA();
    const grammar2 = rep(tok("a"), "S", 1);
    const tree1 = parse("aaa", grammar1);
    const tree2 = parse("aaa", grammar2);
    expect(tree1).toEqual(tree2);
  });

  it("Kleene star general 1", () => {
    const grammar = () => rep(tok("a"), "S", 3, 4);
    expect(parse("aa", grammar())).toBeUndefined();
    expect(parse("aaa", grammar())).toBeDefined();
    expect(parse("aaaa", grammar())).toBeDefined();
    expect(parse("aaaaa", grammar())).toBeUndefined();
  });

  it("Kleene star general 2", () => {
    const grammar1 = thriceA();
    const grammar2 = rep(tok("a"), "S", 3, 3);
    const tree1 = parse("aaa", grammar1);
    const tree2 = parse("aaa", grammar2);
    expect(tree1).toEqual(tree2);
  });

  it("Omit", () => {
    const grammar1 = thriceA();
    const grammar2 = seq([tok("a"), omit(tok("a")), tok("a"), tok("a")], "S");
    const tree1 = parse("aaa", grammar1);
    const tree2 = parse("aaaa", grammar2);
    expect(tree1).toEqual(tree2);
  });

  it("show positions", () => {
    const grammar = thriceA();
    const tree = parse("aaa", grammar, { showPos: true })!;
    expect(count_trees(tree)).toBe(1);
    expect(first_tree(tree)).toEqual(tree);
    expect(tree).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "pos": [
              0,
              1,
            ],
            "value": "a",
          },
          {
            "pos": [
              1,
              2,
            ],
            "value": "a",
          },
          {
            "pos": [
              2,
              3,
            ],
            "value": "a",
          },
        ],
        "pos": [
          0,
          3,
        ],
        "tag": "S",
      }
    `);
  });

  it("left recursion", () => {
    const grammar = leftRec();
    const tree = parse("aaa", grammar)!;
    expect(count_trees(tree)).toBe(1);
    expect(first_tree(tree)).toEqual(tree);
    expect(tree).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "children": [
              {
                "children": [
                  {
                    "children": [],
                    "tag": "S",
                  },
                  {
                    "value": "a",
                  },
                ],
                "tag": "S",
              },
              {
                "value": "a",
              },
            ],
            "tag": "S",
          },
          {
            "value": "a",
          },
        ],
        "tag": "S",
      }
    `);
  });

  it("ambigious gramar", () => {
    const grammar = mathExp();
    const tree = parse("1+1+1", grammar, { ambiguity: "ambiguous" })!;
    expect(count_trees(tree)).toBe(2);
    expect(tree).toMatchInlineSnapshot(`
      {
        "ambiguous": true,
        "children": [
          {
            "children": [
              {
                "children": [
                  {
                    "tag": "E",
                    "value": "1",
                  },
                  {
                    "value": "+",
                  },
                  {
                    "tag": "E",
                    "value": "1",
                  },
                ],
                "tag": "E",
              },
              {
                "value": "+",
              },
              {
                "tag": "E",
                "value": "1",
              },
            ],
            "tag": "E",
          },
          {
            "children": [
              {
                "tag": "E",
                "value": "1",
              },
              {
                "value": "+",
              },
              {
                "children": [
                  {
                    "tag": "E",
                    "value": "1",
                  },
                  {
                    "value": "+",
                  },
                  {
                    "tag": "E",
                    "value": "1",
                  },
                ],
                "tag": "E",
              },
            ],
            "tag": "E",
          },
        ],
      }
    `);

    expect(first_tree(tree)).toMatchInlineSnapshot(`
      {
        "ambiguous": true,
        "children": [
          {
            "children": [
              {
                "children": [
                  {
                    "tag": "E",
                    "value": "1",
                  },
                  {
                    "value": "+",
                  },
                  {
                    "tag": "E",
                    "value": "1",
                  },
                ],
                "tag": "E",
              },
              {
                "value": "+",
              },
              {
                "tag": "E",
                "value": "1",
              },
            ],
            "tag": "E",
          },
          {
            "children": [
              {
                "tag": "E",
                "value": "1",
              },
              {
                "value": "+",
              },
              {
                "children": [
                  {
                    "tag": "E",
                    "value": "1",
                  },
                  {
                    "value": "+",
                  },
                  {
                    "tag": "E",
                    "value": "1",
                  },
                ],
                "tag": "E",
              },
            ],
            "tag": "E",
          },
        ],
      }
    `);
  });
});

describe("footguns", () => {
  it("can't use same grammar twice", () => {
    expect(parse("aa", thriceA())).toBeUndefined();
    expect(parse("aaa", thriceA())).toBeDefined();
    // but
    const gramar = thriceA();
    expect(parse("aa", gramar)).toBeUndefined();
    // this is not what you expect
    expect(parse("aaa", gramar)).toBeUndefined();
  });

  describe("different instance of the same tok", () => {
    it("works", () => {
      const integer = tok("1");
      const variable = tok("a");
      const sameTok = tok("{");
      const repExact = seq([variable, sameTok, integer], "repExact");
      const repMin = seq([variable, sameTok, integer, tok(",")], "repMin");
      const grammar1 = alt([repExact, repMin]);
      expect(parse("a{1", grammar1)!).toBeDefined();
    });

    it("works", () => {
      const integer = tok("1");
      const variable = tok("a");
      const sameTok = tok("{");
      const repExact = seq([variable, sameTok, integer], "repExact");
      const repMin = seq([variable, sameTok, integer, tok(",")], "repMin");
      const grammar1 = alt([repMin, repExact]);
      expect(parse("a{1", grammar1)!).toBeDefined();
    });

    it("works by accident", () => {
      const integer = tok("1");
      const variable = tok("a");
      const repExact = seq([variable, tok("{"), integer], "repExact");
      const repMin = seq([variable, tok("{"), integer, tok(",")], "repMin");
      const grammar = alt([repMin, repExact]);
      const tree = parse("a{1", grammar)!;
      expect(tree).toBeDefined();
    });

    it("doesn't work", () => {
      // this issue can be worked around by memoization of tokens
      const integer = tok("1");
      const variable = tok("a");
      const repExact = seq([variable, tok("{"), integer], "repExact");
      const repMin = seq([variable, tok("{"), integer, tok(",")], "repMin");
      const grammar = alt([repExact, repMin]);
      const tree = parse("a{1", grammar)!;
      // this is not what you expect
      expect(tree).toBeUndefined();
    });

    it("doesn't work", () => {
      // this issue can't be resolved
      const integer = tok("1");
      const variable = tok("a");
      const repExact = seq([variable, tok("{"), integer], "repExact");
      const repMin = seq([variable, reg(/{/), integer, tok(",")], "repMin");
      const grammar = alt([repExact, repMin]);
      const tree = parse("a{1", grammar)!;
      // this is not what you expect
      expect(tree).toBeUndefined();
    });
  });
});
