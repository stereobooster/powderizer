// https://github.com/Engelberg/instaparse/blob/da886e71a4afa80f8b83d1d67f058b2f02cdc0e3/src/instaparse/cfg.cljc#L61-L173
// https://github.com/Engelberg/instaparse/blob/master/src/instaparse/abnf.cljc
// https://datatracker.ietf.org/doc/html/rfc5234
// https://www.rfc-editor.org/rfc/rfc5234
// https://dwheeler.com/essays/dont-use-iso-14977-ebnf.html
// Regular extensions to BNF https://matt.might.net/articles/grammars-bnf-ebnf/
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet

import { type Exp } from "./core.js";
import { parse, type ParseOptions } from "./parse.js";
import { alt, seq, tok, rep, omit, lex, reg, recs } from "./dsl.js";

/**
 * https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
 */
// function escapeRegExp(str: string) {
//   return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
// }

/**
 * https://www.npmjs.com/package/escape-string-regexp?activeTab=code
 */
function escapeRegExp(str: string) {
  // Escape characters with special meaning either inside or outside character sets.
  // Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
  return str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}

export type QuotedStringOptions = {
  delimiter: string;
  tag?: string;
  escapeChar?: string;
  // TODO: "\n\r"
  // prohibitedChars?: string;
};

export function quotedString({
  delimiter,
  tag,
  escapeChar = "\\",
}: QuotedStringOptions) {
  const escape = tok(escapeChar);
  const escapeOmit = omit(escape);
  const delimiterExp = tok(delimiter);
  const delimiterOmitExp = omit(delimiterExp);
  return seq(
    [
      delimiterOmitExp,
      lex(
        rep(
          alt([
            reg(
              new RegExp(`[^${escapeRegExp([delimiter, escapeChar].join(""))}]`)
            ),
            seq([escapeOmit, escape]),
            seq([escapeOmit, delimiterExp]),
          ])
        )
      ),
      delimiterOmitExp,
    ],
    tag
  );
}

export type DelimitedListOptions = {
  delimiter: string | Exp;
  item: Exp;
  tag?: string;
  min?: number;
  space?: Exp;
};

export function delimitedList({
  delimiter,
  item,
  tag,
  min = 1,
  space,
}: DelimitedListOptions) {
  if (min < 1) throw new Error("Not supported");
  if (typeof delimiter === "string") delimiter = tok(delimiter);

  return seq(
    [
      item,
      rep(
        seq([omit(space ? seq([space, delimiter, space]) : delimiter), item]),
        undefined,
        min - 1
      ),
    ],
    tag
  );
}

export function rules() {
  const lcurly = omit(tok("{"));
  const rcurly = omit(tok("}"));
  const coma = omit(tok(","));
  const langle = omit(tok("<"));
  const rangle = omit(tok(">"));
  const lbrace = omit(tok("("));
  const rbrace = omit(tok(")"));
  const lsquare = omit(tok("["));
  const rsquare = omit(tok("]"));

  const char = reg(/[A-Za-z0-9_-]/);
  const identifier = lex(rep(char, undefined, 1));
  const symbol = seq([identifier], "symbol");
  const hiddenSymbol = seq([langle, identifier, rangle], "hiddenSymbol");
  const string = quotedString({ delimiter: '"' });
  const token = seq([string], "token");
  const regexp = seq([omit(tok("#")), string], "regexp");
  // todo: support \r\n
  const nl = tok("\n");
  // note: \s includes \n and \r https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes
  const space = reg(/\s/);
  const spaces = rep(space);
  const optionalSpace = omit(rep(space));
  const integer = rep(reg(/[0-9]/), "integer", 1);

  const [exp] = recs((exp) => {
    const variable = alt([
      symbol,
      token,
      regexp,
      seq([lbrace, optionalSpace, exp, optionalSpace, rbrace]),
      seq([langle, optionalSpace, exp, optionalSpace, rangle], "omittedSymbol"),
      seq([lsquare, optionalSpace, exp, optionalSpace, rsquare], "lex"),
    ]);

    const repStar = seq([variable, omit(tok("*"))], "repStar");
    const repPlus = seq([variable, omit(tok("+"))], "repPlus");
    const repQuestion = seq([variable, omit(tok("?"))], "repQuestion");
    const repExact = seq([variable, lcurly, integer, rcurly], "repExact");
    const repMin = seq([variable, lcurly, integer, coma, rcurly], "repMin");
    const repMinMax = seq(
      [variable, lcurly, integer, coma, integer, rcurly],
      "repMinMax"
    );

    const quantifier = alt([
      repStar,
      repPlus,
      repQuestion,
      repExact,
      repMin,
      repMinMax,
    ]);

    const expSeq = delimitedList({
      delimiter: rep(space, undefined, 1),
      item: alt([variable, quantifier]),
      tag: "seq",
      min: 2,
    });

    const expAlt = delimitedList({
      delimiter: "|",
      item: alt([variable, quantifier, expSeq]),
      tag: "alt",
      space: spaces,
      min: 2,
    });

    const exp_ = alt([variable, quantifier, expSeq, expAlt]);
    return [exp_];
  });

  const colon = tok(":");
  const eq = tok("=");
  const equal = omit(alt([eq, seq([eq, colon]), seq([eq, colon, colon])]));

  const rule = seq(
    [alt([symbol, hiddenSymbol]), optionalSpace, equal, optionalSpace, exp],
    "rule"
  );
  const semicolon = tok(";");
  const rules = delimitedList({
    delimiter: alt([nl, semicolon]),
    item: rule,
    tag: "rules",
    space: optionalSpace,
  });

  return seq([rules, optionalSpace, omit(rep(semicolon, undefined, 0, 1))]);
}

type GrammarTok = {
  tag: "symbol" | "token" | "integer" | "hiddenSymbol" | "regexp";
  value: string;
};

type GrammarExp = {
  tag:
    | "seq"
    | "alt"
    | "rule"
    | "rules"
    | "repStar"
    | "repPlus"
    | "repQuestion"
    | "repExact"
    | "repMin"
    | "repMinMax"
    | "omittedSymbol"
    | "lex";
  children: Array<GrammarTok | GrammarExp>;
};

type GrammarNode = GrammarTok | GrammarExp;

type EvaluateOptions = {
  splitStringTokens?: boolean;
};

export function evaluate(tree: GrammarNode, opts?: EvaluateOptions) {
  if (tree === undefined) throw new Error("Can't parse grammar");
  const symbols: Record<string, Exp> = Object.create(null);
  const tokens: Record<string, Exp> = Object.create(null);
  let first: string;

  function evalInteger(tree: GrammarNode) {
    switch (tree.tag) {
      case "integer":
        return parseInt(tree.value, 10);
      default:
        throw new Error("Expected integer");
    }
  }

  function eval_(tree: GrammarNode, name?: string): Exp {
    switch (tree.tag) {
      case "rules":
        if (tree.children === undefined || tree.children.length === 0)
          throw new Error("Expect at least one rule");
        return tree.children.map((x) => eval_(x))[0];
      case "rule": {
        if (tree.children === undefined || tree.children.length !== 2)
          throw new Error("Rule should have 2 items");

        const [name, body] = tree.children;
        if (name.tag !== "symbol" && name.tag !== "hiddenSymbol")
          throw new Error("First part of the rule should be symbol");

        if (
          symbols[name.value] &&
          Object.keys(symbols[name.value]).length !== 0
        )
          throw new Error(`Symbol ${name.value} already defined`);

        if (!symbols[name.value]) symbols[name.value] = Object.create(null);

        const exp = symbols[name.value];
        Object.entries(
          eval_(body, name.tag === "symbol" ? name.value : undefined)
        ).forEach(([k, v]) => {
          // @ts-ignore
          exp[k] = v;
        });
        if (!first) first = name.value;

        return exp;
      }
      case "token":
        if (opts?.splitStringTokens) {
          const valueUnicode = Array.from(tree.value);
          if (valueUnicode.length > 1) {
            return seq(
              valueUnicode.map((s) => {
                if (!tokens[s]) tokens[s] = tok(s);
                return tokens[s];
              }),
              name
            );
          }
        }
        if (!tokens[tree.value]) {
          if (tree.value.length === 0) tokens[tree.value] = seq([], name);
          else
            tokens[tree.value] = name
              ? seq([tok(tree.value)], name)
              : tok(tree.value);
        }
        return tokens[tree.value];
      case "symbol":
        if (!symbols[tree.value]) symbols[tree.value] = Object.create(null);
        return name ? seq([symbols[tree.value]], name) : symbols[tree.value];
      case "seq":
        return seq(
          tree.children.map((x) => eval_(x)),
          name
        );
      case "alt":
        return alt(
          tree.children.map((x) => eval_(x)),
          name
        );
      case "repStar":
        if (tree.children === undefined || tree.children.length !== 1)
          throw new Error("repStar should have 1 item");
        return rep(eval_(tree.children[0]), name);
      case "repPlus":
        if (tree.children === undefined || tree.children.length !== 1)
          throw new Error("repPlus should have 1 item");
        return rep(eval_(tree.children[0]), name, 1);
      case "repQuestion":
        if (tree.children === undefined || tree.children.length !== 1)
          throw new Error("repQuestion should have 1 item");
        return rep(eval_(tree.children[0]), name, 0, 1);
      case "repExact": {
        if (tree.children === undefined || tree.children.length !== 2)
          throw new Error("repExact should have 2 item");
        const n = evalInteger(tree.children[1]);
        return rep(eval_(tree.children[0]), name, n, n);
      }
      case "repMin": {
        if (tree.children === undefined || tree.children.length !== 2)
          throw new Error("repExact should have 2 item");
        const n = evalInteger(tree.children[1]);
        return rep(eval_(tree.children[0]), name, n);
      }
      case "repMinMax": {
        if (tree.children === undefined || tree.children.length !== 3)
          throw new Error("repExact should have 2 item");
        const n = evalInteger(tree.children[1]);
        const m = evalInteger(tree.children[2]);
        return rep(eval_(tree.children[0]), name, n, m);
      }
      case "omittedSymbol":
        if (tree.children === undefined || tree.children.length !== 1)
          throw new Error("omittedSymbol should have 1 item");
        return name
          ? seq([omit(eval_(tree.children[0]))], name)
          : omit(eval_(tree.children[0]));
      case "regexp":
        return name
          ? seq([reg(new RegExp(tree.value))], name)
          : reg(new RegExp(tree.value));
      case "lex":
        if (tree.children === undefined || tree.children.length !== 1)
          throw new Error("lex should have 1 item");
        return name
          ? seq([lex(eval_(tree.children[0]))], name)
          : lex(eval_(tree.children[0]));
      case "hiddenSymbol":
        throw new Error(`Unexpected hiddenSymbol`);
      case "integer":
        throw new Error(`Unexpected integer`);
      default:
        // @ts-expect-error
        throw new Error(`Unexpected node type ${tree.tag}`);
    }
  }

  eval_(tree);

  const undefinedSymbols = Object.entries(symbols).filter(
    ([_, v]) => Object.keys(v).length === 0
  );

  if (undefinedSymbols.length > 0)
    throw new Error(`Undefined symbols: ${undefinedSymbols.map(([k]) => k)}`);

  return symbols[first!];
}

export function parseGrammar(grammar: string) {
  return parse(grammar.trim(), rules()) as any as GrammarNode;
}

export function createParser(grammar: string, evalOpts?: EvaluateOptions) {
  const grammarTree = parseGrammar(grammar);
  return (ts: string | string[], opts?: ParseOptions) => {
    const gramar = evaluate(grammarTree, evalOpts);
    return parse(ts, gramar, opts);
  };
}
