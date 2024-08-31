import type { Exp } from "./core.js";

export function count_trees(tree: SPPFLike): number {
  if (tree.children && tree.children.length > 0) {
    return tree.children[0].type === "packed"
      ? tree.children.map(count_trees).reduce((a, b) => a + b, 0)
      : tree.children.map(count_trees).reduce((a, b) => a * b, 1);
  }
  return 1;
}

export function first_tree(tree: SPPFLike): SPPFLike {
  if (tree.children && tree.children.length > 0) {
    return tree.children[0].type === "packed"
      ? { ...tree, children: tree.children[0].children.map(first_tree) }
      : { ...tree, children: tree.children.map(first_tree) };
  }
  return tree;
}

// https://github.com/stereobooster/instaparsejs/blob/main/packages/instaparsejs/instaparse.d.ts
export type SPPFLike =
  | {
      type?: undefined;
      tag: string;
      pos?: [number, number];
      value?: undefined;
      children: SPPFLike[];
    }
  | {
      type?: undefined;
      tag?: string;
      pos?: [number, number];
      value: string;
      children?: undefined;
    }
  | {
      type: "packed";
      tag?: undefined;
      pos?: [number, number];
      children: SPPFLike[];
      value?: undefined;
    };

export type CompactOptions = {
  collapseTokens?: boolean;
  showPos?: boolean;
  ambiguity?: /* always return first tree even for ambiguous parses */
  | "first"
    /* error if there is ambiguity */
    | "error"
    /* return all ambiguous trees in SPPF-like structure */
    | "sppf";
  // probably bad idea
  // removeEmpty?: boolean;
};

// removes { e: ... }
// removes all nodes without tag
export function compact_tree(
  e: Exp,
  {
    collapseTokens = true,
    showPos = false,
    ambiguity = "first",
  }: CompactOptions = {}
): SPPFLike {
  const addPos = showPos
    ? (node: SPPFLike, e: Exp) => {
        node.pos = [e.e.start_pos!, e.e.end_pos!];
        return node;
      }
    : (node: SPPFLike, _e: Exp) => node;

  function rec(
    e: Exp,
    _i = 0, // so it would work with map
    _a = [] as Exp[], // so it would work with map
    packedAbove = false
  ): SPPFLike | SPPFLike[] {
    switch (e.e.type) {
      case "Rep":
      case "Tok":
      case "Reg":
        throw new Error("Can't happen");
      case "Seq": {
        if (!e.e.tag && !e.e.sym && e.e.exps.length > 0)
          return e.e.exps.map(rec).flat();

        if (!e.e.tag && !e.e.sym && e.e.exps.length === 0) return [];

        if (e.e.exps.length === 0) return addPos({ value: e.e.sym }, e);

        const children = e.e.exps.map(rec).flat();
        if (
          collapseTokens &&
          children.length === 1 &&
          children[0].value !== undefined &&
          !children[0].tag
        ) {
          return addPos(
            {
              value: children[0].value,
              tag: e.e.tag,
            },
            e
          );
        }

        return addPos(
          {
            tag: e.e.tag,
            children,
          },
          e
        );
      }
      case "Alt": {
        if (e.e.tag && e.e.exps.length === 1) {
          const children = e.e.exps.map(rec).flat();
          if (
            collapseTokens &&
            children.length === 1 &&
            children[0].value !== undefined &&
            !children[0].tag
          ) {
            return addPos(
              {
                value: children[0].value,
                tag: e.e.tag,
              },
              e
            );
          }

          return addPos(
            {
              tag: e.e.tag,
              children,
            },
            e
          );
        }

        if (e.e.tag && e.e.exps.length !== 1)
          throw new Error("lost named node");

        const children = e.e.exps
          .map((e_) => {
            const ch = rec(e_, undefined, undefined, true);
            return Array.isArray(ch) ? ch : [ch];
          })
          .filter((x) => x.length > 0);

        if (children.length === 0) return [];
        if (children.length === 1 || ambiguity === "first") return children[0];
        if (ambiguity === "error") throw new Error("Ambiguous parse tree");
        if (packedAbove) return children.flat();

        // this works for http://localhost:5173/?g=%3CE%3E+%3D+%3C%22%28%22%3E+E+%3C%22%29%22%3E+%7C+mul+%7C+add+%7C+sub+%7C+num%0Amul+%3D+E+%3C%22*%22%3E+E%0Aadd+%3D+E+%3C%22%2B%22%3E+E%0Asub+%3D+E+%3C%22-%22%3E+E%0Anum+%3D+%23%22%5C%5Cd%22&t=1%2B2*3%2B4&all=1&ranges=
        if (children.every((x) => x.length === 1)) {
          return addPos(
            {
              children: children.flat(),
              type: "packed",
            },
            e
          );
        }

        // this works for http://localhost:5173/?g=E+%3D+E+%28%22%2B%22+%7C+%22*%22%29+E+%7C+%221%22&t=1%2B1%2B1&all=1&ranges=1
        return children.map((x) => {
          return addPos(
            {
              children: x,
              type: "packed",
            },
            e
          );
        });
      }
      case "Omit":
        return [];
      case "Lex":
        return addPos({ value: concat_tree(e.e.exp) }, e);
    }
  }

  const result = rec(e);
  if (Array.isArray(result)) {
    if (result.length <= 1) return result[0];
    return {
      children: result,
      tag: "",
    };
  }
  return result;
}

export function concat_tree(e: Exp): string {
  switch (e.e.type) {
    case "Rep":
    case "Tok":
    case "Reg":
      throw new Error("Can't happen");
    case "Seq":
      if (e.e.exps.length === 0) return e.e.sym;
      return e.e.exps.map(concat_tree).join("");
    case "Alt":
      // for ambigious nodes selects first subtree
      return concat_tree(e.e.exps[0]);
    case "Omit":
      return "";
    case "Lex":
      return concat_tree(e.e.exp);
  }
}
