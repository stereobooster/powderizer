import { SPPFLike } from "pwz";

type Node = {
  // either tag or value
  label: string;
  type: undefined | "packed";
  pos?: [number, number];
};

export function treeToDot(tree: SPPFLike, showRanges?: boolean): string {
  const nodes = new Map<string, Node>();
  const edges = new Map<string, string>();

  function rec(
    prefix: string,
    tree: SPPFLike,
    parentId?: string,
    _ambigious?: boolean
  ) {
    const id = `${prefix}_${tree.pos?.[0]}_${tree.pos?.[1]}`;
    // const id = `${ambigious ? prefix : tree.tag}_${tree.pos[0]}_${tree.pos[1]}`;

    nodes.set(id, {
      label: tree.tag || tree.value || "",
      type: tree.type,
      pos: tree.pos,
    });

    if (parentId !== undefined)
      edges.set(`${parentId}->${id}`, `${parentId}->${id}`);

    if (tree.children !== undefined) {
      const ambigious =
        tree.type !== "packed" &&
        tree.children.length > 1 &&
        tree.children.every((t) => t.type === "packed");
      tree.children.forEach((t, i) => rec(`${prefix}${i}`, t, id, ambigious));
    }
  }

  rec("n", tree);

  return `digraph AST {
    ${Array.from(nodes.entries())
      .map(
        ([id, { label, type, pos }]) =>
          `${id}[label="${label}${
            showRanges && pos ? ` (${pos[0]}, ${pos[1]})` : ""
          }" ${
            type !== "packed" ? "shape=rect style=rounded" : "shape=point"
          } ${type !== "packed" ? "height=0.3" : ""} tooltip="${
            showRanges && pos ? ` (${pos[0]}, ${pos[1]})` : " "
          }"]`
      )
      .join("\n")}
    ${Array.from(edges.values()).join("\n")}
  }`;
}
