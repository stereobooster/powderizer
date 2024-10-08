import { describe, it, expect } from "vitest";
import { createParser } from "../src/grammar.js";
import { tree_stat } from "../src/utils.js";

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

  // http://localhost:5173/?g=S+%3D+%5BS%5D+%22a%22+%7C+%22%22&t=aaa&all=1&ranges=1&values=
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

  // http://localhost:5173/?g=%3CE%3E+%3D+add+%7C+%221%22%0Aadd+%3D+E+%3C%22%2B%22%3E+E&t=1%2B1%2B1&all=1&ranges=1&values=
  it("top node is packed", () => {
    const grammar = `<E> = add | "1"
    add = E <"+"> E`;
    const p = createParser(grammar);
    const t = p("1+1+1", { ambiguity: "ambiguous" });
    expect(t?.ambiguous).toEqual(true);
    expect(t?.children?.length).toEqual(2);
    expect(tree_stat(t!)).toEqual([2, 1, 0]);
  });

  // http://localhost:5173/?g=E+%3D+add+%7C+%221%22%0Aadd+%3D+E+%3C%22%2B%22%3E+E&t=1%2B1%2B1&all=1&ranges=1&values=
  it("top node is not packed", () => {
    const grammar = `E = add | "1"
    add = E <"+"> E`;
    const p = createParser(grammar);
    const t = p("1+1+1", { ambiguity: "ambiguous" });
    expect(t?.ambiguous).toEqual(undefined);
    expect(t?.children?.length).toEqual(1);
    expect(tree_stat(t!)).toEqual([2, 1, 0]);
  });

  // http://localhost:5173/?g=%3CS%3E+%3D+S*+%22a%22&t=aaa&all=1&ranges=1&values=
  it('<S> = S* "a"', () => {
    const grammar = `<S> = S* "a"`;
    const p = createParser(grammar);
    const t = p("aaa", { ambiguity: "ambiguous" });
    // even so both subtrees are the same
    expect(tree_stat(t!)).toEqual([2, 1, 3]);
  });

  // http://localhost:5173/?g=E+%3D+mul+%7C+add+%7C+%221%22%0Amul+%3D+E+%3C%22*%22%3E+E%0Aadd+%3D+E+%3C%22%2B%22%3E+E%0A&t=1%2B1*1%2B1&all=1&ranges=1&values=
  it("compaction example 1", () => {
    const grammar = `E = mul | add | "1"
mul = E <"*"> E
add = E <"+"> E`;
    const p = createParser(grammar);
    const t = p("1+1*1+1", { ambiguity: "ambiguous" });
    expect(tree_stat(t!)).toEqual([5, 3, 0]);
    const t1 = p("1+1+1+1", { ambiguity: "ambiguous" });
    expect(tree_stat(t1!)).toEqual([5, 3, 0]);
  });

  // http://localhost:5173/?g=%3CE%3E+%3D+add+%7C+%221%22%0Aadd+%3D+E+%3C%22%2B%22%3E+E%0A&t=1%2B1%2B1%2B1&all=1&ranges=&values=
  it("compaction example 2", () => {
    const grammar = `<E> = add | "1"
add = E <"+"> E`;
    const p = createParser(grammar);
    const t = p("1+1+1+1", { ambiguity: "ambiguous" });
    expect(tree_stat(t!)).toEqual([5, 3, 0]);
  });

  // http://localhost:5173/?g=EXP+%3D+E%3B%0A%3CE%3E+%3D+add+%7C+%221%22%0Aadd+%3D+E+%3C%22%2B%22%3E+E&t=1%2B1%2B1%2B1&all=1&ranges=1&values=
  it("compaction example 3", () => {
    const grammar = `EXP = E;
<E> = add | "1"
add = E <"+"> E`;
    const p = createParser(grammar);
    const t = p("1+1+1+1", { ambiguity: "ambiguous" });
    expect(tree_stat(t!)).toEqual([5, 3, 0]);
  });

  // http://localhost:5173/?g=E+%3D+E+%28%22%2B%22+%7C+%22*%22%29+E+%7C+%221%22&t=1%2B1%2B1&all=1&ranges=1&values=
  it("compaction example 4", () => {
    const grammar = `E = E ("+" | "*") E | "1"`;
    const p = createParser(grammar);
    const t = p("1+1+1", { ambiguity: "ambiguous" });
    expect(tree_stat(t!)).toEqual([2, 1, 0]);
  });

  // http://localhost:5173/?g=S+%3D+S*+%22a%22&t=aaa&all=1&ranges=1&values=
  it("compaction example 5", () => {
    const grammar = `S = S* "a"`;
    const p = createParser(grammar);
    // it may contain unwanted untaged nodes in ambiguous tree
    const t = p("aaa", { ambiguity: "ambiguous" });
    expect(tree_stat(t!)).toEqual([2, 1, 1]);

    // but when single tree extracted there are no untaged
    const t1 = p("aaa", { ambiguity: "first" });
    expect(tree_stat(t1!)).toEqual([1, 0, 0]);
  });
});
