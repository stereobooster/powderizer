type Pos = number;
const p_bottom: Pos = -1;

type Sym = string;
const s_bottom: Sym = "<s_bottom>";

type Tok = string;
const t_eof: Tok = "<t_eof>";

export type Exp = { m?: Mem; e: Exp_ };
type Exp_ =
  | {
      type: "Tok";
      tag: string; // always empty string - token can't have tag
      value: Tok;
      start_pos?: number;
      end_pos?: number;
    }
  | {
      type: "Seq";
      tag: string;
      sym: Sym;
      exps: Exp[];
      start_pos?: number;
      end_pos?: number;
    }
  | {
      type: "Alt";
      tag: string;
      exps: Exp[];
      start_pos?: number;
      end_pos?: number;
    }
  // extension
  | {
      type: "Rep"; // Kleene star
      tag: string;
      exp: Exp;
      start_pos?: number;
      end_pos?: number;
      min: number;
      max: number;
    }
  | {
      type: "Omit"; // remove node from the final tree
      tag: string; // always empty string - because it will never be in the tree
      exps: Exp[]; // array for convinience, but always one item
      start_pos?: number;
      end_pos?: number;
    }
  | {
      type: "Lex"; // lexical grammar
      tag: string; // always empty string - the same as Tok
      exp: Exp;
      start_pos?: number;
      end_pos?: number;
    }
  | {
      type: "Reg"; // token matched via regular expression
      tag: string; // always empty string - the same as Tok
      value: RegExp;
      start_pos?: number;
      end_pos?: number;
    };
type Cxt =
  | { type: "TopC" }
  | {
      type: "SeqC";
      tag: string;
      mem: Mem;
      sym: Sym;
      exps1: Exp[];
      exps2: Exp[];
    }
  | { type: "AltC"; tag: string; mem: Mem }
  | {
      type: "RepC";
      tag: string;
      mem: Mem;
      exps1: Exp[];
      exp: Exp;
      counter: number;
      min: number;
      max: number;
    }
  | { type: "OmitC"; mem: Mem }
  | { type: "LexC"; mem: Mem };

type Mem = { start_pos: Pos; parents: Cxt[]; end_pos: Pos; result: Exp };

type Zipper = [Exp_, Mem];

const e_bottom: Exp = Object.freeze({ e: { type: "Alt", exps: [], tag: "" } });

function derive(p: Pos, t: Tok, z: Zipper): Zipper[] {
  function d_d(c: Cxt, e: Exp): Zipper[] {
    if (e.m && p === e.m.start_pos) {
      e.m.parents.unshift(c);
      // when it happens that start and end pos are the same (except empty string)?
      if (p === e.m.end_pos) return d_u_(e.m.result, c);
      else return [];
    } else {
      const m: Mem = {
        start_pos: p,
        parents: [c],
        end_pos: p_bottom,
        result: e_bottom,
      };
      // commenting line bellow turns off memoization
      e.m = m;
      return d_d_(m, e.e);
    }
  }

  function d_d_(m: Mem, e_: Exp_): Zipper[] {
    switch (e_.type) {
      case "Tok":
        return t === e_.value
          ? [
              [
                {
                  type: "Seq",
                  sym: t,
                  exps: [],
                  start_pos: m.start_pos,
                  end_pos: m.start_pos + t.length,
                  tag: e_.tag,
                },
                m,
              ],
            ]
          : [];
      case "Seq":
        if (e_.exps.length === 0)
          return d_u(
            {
              type: "Seq",
              sym: e_.sym,
              exps: [],
              start_pos: m.start_pos,
              end_pos: m.start_pos,
              tag: e_.tag,
            },
            m
          );
        else {
          const m_: Mem = {
            start_pos: m.start_pos,
            parents: [{ type: "AltC", mem: m, tag: "" }],
            end_pos: p_bottom,
            result: e_bottom,
          };
          return d_d(
            {
              type: "SeqC",
              mem: m_,
              sym: e_.sym,
              exps1: [],
              exps2: e_.exps.slice(1),
              tag: e_.tag,
            },
            e_.exps[0]
          );
        }
      case "Alt":
        return e_.exps
          .map((e) => d_d({ type: "AltC", mem: m, tag: e_.tag }, e))
          .flat();
      // extension
      case "Rep": {
        const m_: Mem = {
          start_pos: m.start_pos,
          parents: [{ type: "AltC", mem: m, tag: "" }],
          end_pos: p_bottom,
          result: e_bottom,
        };
        const counter = 0;
        return [
          // recognize empty string
          counter >= e_.min
            ? d_u(
                {
                  type: "Seq",
                  sym: "",
                  exps: [],
                  start_pos: m.start_pos,
                  end_pos: m.start_pos,
                  tag: e_.tag,
                },
                m_
              )
            : [],
          // recognize first symbol
          counter < e_.max
            ? d_d(
                {
                  type: "RepC",
                  mem: m_,
                  exps1: [],
                  exp: e_.exp,
                  tag: e_.tag,
                  counter: counter + 1,
                  min: e_.min,
                  max: e_.max,
                },
                e_.exp
              )
            : [],
        ].flat();
      }
      case "Omit":
        return d_d({ type: "OmitC", mem: m }, e_.exps[0]);
      case "Lex":
        return d_d({ type: "LexC", mem: m }, e_.exp);
      case "Reg":
        if (t === t_eof) return [];
        return e_.value.test(t)
          ? [
              [
                {
                  type: "Seq",
                  sym: t,
                  exps: [],
                  start_pos: m.start_pos,
                  end_pos: m.start_pos + t.length,
                  tag: e_.tag,
                },
                m,
              ],
            ]
          : [];
    }
  }

  function d_u(e_: Exp_, m: Mem): Zipper[] {
    const e = { e: e_ };
    m.end_pos = p;
    m.result = e;
    return m.parents.map((c) => d_u_(e, c)).flat();
  }

  function d_u_(e: Exp, c: Cxt): Zipper[] {
    switch (c.type) {
      case "TopC":
        return [];
      case "SeqC":
        if (c.exps2.length === 0)
          return d_u(
            {
              type: "Seq",
              sym: c.sym,
              exps: [e, ...c.exps1].reverse(),
              start_pos: c.mem.start_pos,
              end_pos: e.e.end_pos,
              tag: c.tag,
            },
            c.mem
          );
        else
          return d_d(
            {
              type: "SeqC",
              mem: c.mem,
              sym: c.sym,
              exps1: [e, ...c.exps1],
              exps2: c.exps2.slice(1),
              tag: c.tag,
            },
            c.exps2[0]
          );
      case "AltC":
        if (p === c.mem.end_pos) {
          if (c.mem.result.e.type === "Alt") {
            c.mem.result.e.exps.unshift(e);
            return [];
          } else throw new Error("Not an Alt.");
        } else
          return d_u(
            {
              type: "Alt",
              exps: [e],
              start_pos: c.mem.start_pos,
              end_pos: e.e.end_pos,
              tag: c.tag,
            },
            c.mem
          );
      case "RepC": {
        return [
          // all items recognized by Rep so far
          c.counter >= c.min
            ? d_u(
                {
                  type: "Seq",
                  sym: "",
                  exps: [e, ...c.exps1].reverse(),
                  start_pos: c.mem.start_pos,
                  end_pos: e.e.end_pos,
                  tag: c.tag,
                },
                c.mem
              )
            : [],
          // next item to recognize by Rep
          c.counter < c.max
            ? d_d(
                {
                  type: "RepC",
                  mem: c.mem,
                  exps1: [e, ...c.exps1],
                  exp: c.exp,
                  tag: c.tag,
                  counter: c.counter + 1,
                  min: c.min,
                  max: c.max,
                },
                c.exp
              )
            : [],
        ].flat();
      }
      case "OmitC":
        return d_u(
          {
            type: "Omit",
            exps: [],
            start_pos: c.mem.start_pos,
            end_pos: e.e.end_pos,
            tag: "",
          },
          c.mem
        );
      case "LexC":
        return d_u(
          {
            type: "Lex",
            exp: e,
            start_pos: c.mem.start_pos,
            end_pos: e.e.end_pos,
            tag: "",
          },
          c.mem
        );
    }
  }

  return d_u(z[0], z[1]);
}

function init_zipper(e: Exp): Zipper {
  const e_: Exp_ = { type: "Seq", sym: s_bottom, exps: [], tag: "" };
  const m_top: Mem = {
    start_pos: p_bottom,
    parents: [{ type: "TopC" }],
    end_pos: p_bottom,
    result: e_bottom,
  };
  const c: Cxt = {
    type: "SeqC",
    mem: m_top,
    sym: s_bottom,
    exps1: [],
    exps2: [e, { e: { type: "Tok", value: t_eof, tag: "" } }],
    tag: "",
  };
  const m_seq: Mem = {
    start_pos: p_bottom,
    parents: [c],
    end_pos: p_bottom,
    result: e_bottom,
  };
  return [e_, m_seq];
}

function unwrap_top_zipper(z: Zipper): Exp {
  const parents = z[1].parents;
  if (
    parents.length === 1 &&
    parents[0].type === "SeqC" &&
    parents[0].mem.parents.length === 1 &&
    parents[0].mem.parents[0].type === "TopC"
  ) {
    return parents[0].exps1[0];
  } else {
    throw new Error("Invalid top zipper.");
  }
}

export function parse(ts: Tok[], e: Exp) {
  function parse_(p: Pos, ts: Tok[], z: Zipper): Zipper[] {
    if (ts.length === 0) return derive(p, t_eof, z);
    else {
      const [t, ...ts_] = ts;
      return derive(p, t, z)
        .map((z_) => parse_(p + 1, ts_, z_))
        .flat();
    }
  }
  return parse_(0, ts, init_zipper(e)).map(unwrap_top_zipper);
}
