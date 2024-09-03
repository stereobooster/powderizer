import { parse as parse_original, type Exp } from "./core.js";
import { compact_tree, type CompactOptions } from "./utils.js";

export type ParseOptions = CompactOptions;

export function parse(str: string[] | string, e: Exp, opts?: ParseOptions) {
  const ambiguity = opts?.ambiguity || "first";
  const tokens = typeof str === "string" ? Array.from(str) : str;
  const r = parse_original(tokens, e);
  if (r.length === 0) return;
  // I guess I made an error in translating algorithm from OCaml.
  // Because it suppose to produce array of trees.
  // Instead it produces one tree with ambiguous node - conceptually similar to SPPF
  if (r.length > 1 && ambiguity !== "first") {
    // huh... it happens with consequent Kleene stars
    if (ambiguity === "sppf")
      return compact_tree(
        {
          e: {
            type: "Alt",
            tag: "",
            exps: r,
            start_pos: r[0].e.start_pos,
            end_pos: r[0].e.end_pos,
          },
        },
        opts
      );
    if (ambiguity === "error") throw new Error("Ambiguous parse tree");
  }
  return compact_tree(r[0], opts);
}
