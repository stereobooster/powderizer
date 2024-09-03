import type { Exp } from "./core.js";

/**
 * instead of OCAML's `letrec`
 */
export function recs<T extends Object = Exp>(cb: (...x: T[]) => T[]): T[] {
  const res = Array.from(Array(cb.length)).map(
    () => Object.create(null) as any
  );
  const tmp = cb(...res);
  res.forEach((_, i) => {
    Object.entries(tmp[i]).forEach(([k, v]) => (res[i][k] = v));
  });
  return res;
}

export const tok = (value: string): Exp =>
  value.length === 0
    ? seq([])
    : {
        e: { type: "Tok", value, tag: "" },
      };
export const seq = (exps: Exp[], tag = ""): Exp => ({
  e: { type: "Seq", sym: "", exps, tag },
});
export const alt = (exps: Exp[], tag = ""): Exp => ({
  e: { type: "Alt", exps, tag },
});

// extension

// Kleene star
export const rep = (exp: Exp, tag = "", min = 0, max = Infinity): Exp => {
  if (min > max) throw new Error("Min should be less or equal to max");
  return {
    e: { type: "Rep", exp, tag, min, max },
  };
};
// Remove node from the final tree
export const omit = (exp: Exp): Exp => ({
  e: { type: "Omit", exps: [exp], tag: "" },
});
// Lexical grammar - concat all nodes into one string as if it is Tok
export const lex = (exp: Exp): Exp => ({
  e: { type: "Lex", exp: exp, tag: "" },
});
// The same as Tok, but uses RegExp to check the value
export const reg = (value: RegExp): Exp => ({
  e: { type: "Reg", value, tag: "" },
});
