import type { Exp } from "./core.js";

// trees, ambiguty nodes, untagged nodes
export function tree_stat(tree: AmbiguousTree): [number, number, number] {
  if (tree.ambiguous) {
    return tree.children
      .map(tree_stat)
      .reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 1, 0]);
  }

  if (tree.children && tree.children.length > 0) {
    return tree.children
      .map(tree_stat)
      .reduce(
        (a, b) => [a[0] * b[0], a[1] + b[1], a[2] + b[2]],
        [1, 0, tree.tag ? 0 : 1]
      );
  }

  return [1, 0, tree.tag || tree.value !== undefined ? 0 : 1];
}

export function first_tree(tree: AmbiguousTree): AmbiguousTree {
  if (tree.children && tree.children.length > 0) {
    return tree.children[0].ambiguous
      ? { ...tree, children: tree.children[0].children.map(first_tree) }
      : { ...tree, children: tree.children.map(first_tree) };
  }
  return tree;
}

// https://github.com/stereobooster/instaparsejs/blob/main/packages/instaparsejs/instaparse.d.ts
export type AmbiguousTree =
  | {
      ambiguous?: false;
      tag: string;
      pos?: [number, number];
      value?: undefined;
      children: AmbiguousTree[];
    }
  | {
      ambiguous?: false;
      tag?: string;
      pos?: [number, number];
      value: string;
      children?: undefined;
    }
  | {
      ambiguous: true;
      tag?: undefined;
      pos?: [number, number];
      children: AmbiguousTree[];
      value?: undefined;
    };

export type CompactOptions = {
  collapseTokens?: boolean;
  showPos?: boolean;
  ambiguity?: /* always return first tree even for ambiguous parses */
  | "first"
    /* error if there is ambiguity */
    | "error"
    /* return all ambiguous trees in one */
    | "ambiguous";
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
): AmbiguousTree {
  const addPos = showPos
    ? (node: AmbiguousTree, e: Exp) => {
        node.pos = [e.e.start_pos!, e.e.end_pos!];
        return node;
      }
    : (node: AmbiguousTree, _e: Exp) => node;

  function rec(e: Exp): AmbiguousTree | AmbiguousTree[] {
    switch (e.e.type) {
      case "Rep":
      case "Tok":
      case "Reg":
        throw new Error("Can't happen");
      case "Seq": {
        if (!e.e.tag && !e.e.sym && e.e.exps.length > 0)
          return e.e.exps.map(rec).flat();

        if (!e.e.tag && !e.e.sym && e.e.exps.length === 0) return [];

        if (e.e.exps.length === 0)
          return e.e.tag
            ? addPos({ tag: e.e.tag, value: e.e.sym }, e)
            : addPos({ value: e.e.sym }, e);

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

          // http://localhost:5173/?g=E+%3D+E+%28%22%2B%22+%7C+%22*%22%29+E+%7C+%221%22&t=1%2B1%2B1&all=1&ranges=1&values=
          if (
            children.length === 1 &&
            children[0].ambiguous &&
            children[0].children.every((ch) => !ch.tag && ch.children)
          ) {
            return {
              ...children[0],
              children: children[0].children.map((ch) => {
                ch.tag = e.e.tag;
                return ch;
              }),
            };
          }

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

        if (e.e.tag && e.e.exps.length !== 1) {
          // http://localhost:5173/?g=E+%3D+mul+%7C+add+%7C+%221%22%0Amul+%3D+E+%3C%22*%22%3E+E%0Aadd+%3D+E+%3C%22%2B%22%3E+E%0A&t=1%2B1*1%2B1&all=1&ranges=1&values=
          return rec({
            e: {
              ...e.e,
              type: "Alt",
              tag: e.e.tag,
              exps: [
                {
                  e: {
                    ...e.e,
                    type: "Alt",
                    tag: "",
                    exps: e.e.exps,
                  },
                },
              ],
            },
          });
          // can be triggered by S = S | "a"
          // unless this exception it would trigger "too much recursion" error anyway
          // throw new Error(
          //   "Lost named node. Tip: check if there is direct recursion"
          // );
        }

        const children = e.e.exps
          .map((e_) => {
            const ch = rec(e_);
            return Array.isArray(ch) ? ch : [ch];
          })
          .filter((x) => x.length > 0);

        if (children.length === 0) return [];
        if (children.length === 1 || ambiguity === "first") return children[0];
        if (ambiguity === "error") throw new Error("Ambiguous parse tree");

        // http://localhost:5173/?g=%3CE%3E+%3D+add+%7C+%221%22%0Aadd+%3D+E+%3C%22%2B%22%3E+E%0A&t=1%2B1%2B1%2B1&all=1&ranges=&values=
        // http://localhost:5173/?g=EXP+%3D+E%3B%0A%3CE%3E+%3D+add+%7C+%221%22%0Aadd+%3D+E+%3C%22%2B%22%3E+E&t=1%2B1%2B1%2B1&all=1&ranges=1&values=
        if (children.every((x) => x.length === 1)) {
          const ch = children.flatMap((x) =>
            x[0].ambiguous ? x[0].children : x[0]
          );
          return addPos(
            {
              children: ch,
              ambiguous: true,
            },
            e
          );
        }

        // http://localhost:5173/?g=E+%3D+E+%28%22%2B%22+%7C+%22*%22%29+E+%7C+%221%22&t=1%2B1%2B1&all=1&ranges=1&values=
        return addPos(
          {
            children: children.flatMap((ch) => {
              // don't have examples for this
              if (ch.length === 0) return [];
              if (ch.length === 1) return ch[0];
              return addPos(
                {
                  children: ch,
                  tag: "",
                },
                e
              );
            }),
            ambiguous: true,
          },
          e
        );
      }
      case "Omit":
        return [];
      case "Lex":
        return addPos({ value: concat_tree(e.e.exp) }, e);
    }
  }

  const result = rec(e);
  if (Array.isArray(result)) {
    // due to compaction tree completley disapeared
    // like <S> = "a"* for empty string
    // or <S> = <"a">* for any string of a's
    if (result.length === 0)
      return {
        children: [],
        tag: "",
      };
    if (result.length <= 1) return result[0];
    const rr: AmbiguousTree = {
      children: result,
      tag: "",
    };
    if (showPos) rr.pos = result[0].pos;
    return rr;
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
