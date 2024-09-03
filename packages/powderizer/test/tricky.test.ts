import { describe, it, expect } from "vitest";
import { createParser } from "../src/grammar.js";
import { count_trees } from "../src/utils.js";

describe("tricky cases", () => {
  it('<S> = "a"*', () => {
    const p = createParser('<S> = "a"*');
    expect(p("")).toEqual({ tag: "", children: [] });
    expect(p("aa")).toEqual({
      tag: "",
      children: [{ value: "a" }, { value: "a" }],
    });
  });

  it('<S> = <"a">*', () => {
    const p = createParser('<S> = <"a">*');
    expect(p("")).toEqual({ tag: "", children: [] });
    expect(p("aa")).toEqual({ tag: "", children: [] });
  });

  it('<S> = S "a" | ""', () => {
    const p = createParser('<S> = S "a" | ""');
    expect(p("")).toEqual({ tag: "", children: [] });
    expect(p("aa")).toEqual({
      tag: "",
      children: [{ value: "a" }, { value: "a" }],
    });
  });

  it('S = S <"a"> | ""', () => {
    const p = createParser('S = S <"a"> | ""');
    expect(p("")).toEqual({ tag: "S", children: [] });
    expect(p("aa")).toEqual({
      tag: "S",
      children: [{ tag: "S", children: [{ tag: "S", children: [] }] }],
    });
  });

  it('S = "a"*', () => {
    const p = createParser('S = "a"*');
    expect(p("")).toEqual({ tag: "S", value: "" });
    expect(p("a")).toEqual({
      tag: "S",
      value: "a",
    });
    expect(p("aa")).toEqual({
      tag: "S",
      children: [{ value: "a" }, { value: "a" }],
    });
  });

  it('S = S? "a"', () => {
    const p = createParser('S = S? "a"');
    expect(p("a")).toEqual({
      tag: "S",
      value: "a",
    });
    expect(p("aa")).toEqual({
      tag: "S",
      children: [{ tag: "S", value: "a" }, { value: "a" }],
    });
  });

  it('S = [S] "a" | ""', () => {
    const p = createParser('S = [S] "a" | ""');
    expect(p("aaa")).toEqual({
      tag: "S",
      children: [{ value: "aa" }, { value: "a" }],
    });
  });

  it.skip('S = S* "a" | ""', () => {
    const p = createParser('S = S* "a" | ""');
    // InternalError: too much recursion
    // it should ignore empty string inside Kleene star
    expect(() => p("aaa")).toThrow("");
  });

  it("top node is packed", () => {
    const grammar = `<E> = add | "1"
    add = E <"+"> E`;
    const p = createParser(grammar);
    const t = p("1+1+1", { ambiguity: "sppf" });
    expect(t?.ambiguous).toEqual(true);
    expect(t?.children?.length).toEqual(2);
    expect(count_trees(t!)).toEqual(2);
  });

  it("top node is not packed", () => {
    const grammar = `E = add | "1"
    add = E <"+"> E`;
    const p = createParser(grammar);
    const t = p("1+1+1", { ambiguity: "sppf" });
    // TODO: top node should show two packed nodes
    expect(count_trees(t!)).toEqual(2);
  });
});
