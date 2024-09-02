import { SPPFLike } from "zipline";

type Node = {
  // either tag or value
  tag: string;
  value?: string;
  type: undefined | "packed";
  pos?: [number, number];
};

export function treeToDot(
  tree: SPPFLike,
  showRanges?: boolean,
  showValues?: boolean
): string {
  const nodes = new Map<string, Node>();
  const edges = new Map<string, string>();

  function rec(prefix: string, tree: SPPFLike, parentId?: string) {
    const id = `${prefix}_${tree.pos?.[0]}_${tree.pos?.[1]}`;

    nodes.set(id, {
      tag: tree.tag || "",
      value: tree.children
        ? tree.children.length === 0
          ? ""
          : undefined
        : tree.value,
      type: tree.type,
      pos: tree.pos,
    });

    if (parentId !== undefined)
      edges.set(`${parentId}->${id}`, `${parentId}->${id}`);

    if (tree.children !== undefined) {
      tree.children.forEach((t, i) => rec(`${prefix}${i}`, t, id));
    }
  }

  rec("n", tree);

  const e = (x: string) =>
    JSON.stringify(x)
      .replaceAll(/([|\{\}])/g, "\\$1")
      .slice(0, -1)
      .slice(1);

  return `digraph AST {
    ${Array.from(nodes.entries())
      .map(([id, { tag, value, type, pos }]) => {
        const label = `{${e(showValues ? tag : tag || value || "")}${
          showValues && value !== undefined ? `| ${e(value)}` : ""
        }${showRanges && pos ? `| (${pos[0]}, ${pos[1]})` : ""}}`;

        return `${id}[label="${label}" ${
          type === "packed"
            ? "shape=point"
            : "shape=record style=rounded height=0.3"
        } tooltip="${
          showRanges && pos && type === "packed"
            ? ` (${pos[0]}, ${pos[1]})`
            : " "
        }"]`;
      })
      .join("\n")}
    ${Array.from(edges.values()).join("\n")}
  }`;
}
