import { alt, seq, tok, recs } from "../src/dsl.js";

// parse mutates exp so need new copy every time

/**
 * S = "a" "a" "a"
 *
 * Note:
 *
 * S = "a" "a" "a", S = "a"*, S = "a"+, S = "a"{3}, S = "a"{0,3}
 * should all have the same parse tree for "aaa"
 * 
 * And S = "a" <"x"> "a" "a" 
 * should all have the same parse tree for "axaa"
 *
 * But:
 *
 * S = "aaa", S = E "a" | "", S = "a" E | ""
 * should have a different parse tree
 *
 * Even so all those grammars can be used to parse "aaa"
 */
export const thriceA = () => seq([tok("a"), tok("a"), tok("a")], "S");

/**
 * S = "aaa"
 *
 * Note:
 *
 * It expects exactly "aaa" token:
 * - it will not recognize ["a", "a", "a"], ["aa", "a"], ["a", "aa"]
 * - it will recognize ["aaa"]
 *
 * S = "aaa", S = ["a" "a" "a"], S = ["aa" "a"], S = ["a" "aa"], S = [S "a" | ""]
 * should all have the same parse tree for "aaa" (but require different tokenization)
 */
export const tripleA = () => seq([tok("aaa")], "S");

/**
 * S = S "a" | ""
 *
 * Note: left recursion
 */
export const leftRec = () => {
  const [S] = recs((S) => [alt([seq([S, tok("a")]), tok("")], "S")]);
  return S;
};

/**
 * E = E ("+" | "*") E | "1"
 *
 * Note: ambiguous grammar
 *
 * For "1+1+1" it will produce 2 trees
 * For "1+1+1+1" it will produce 5 trees
 * etc.
 */
export const mathExp = () => {
  const [E] = recs((E) => [
    alt([seq([E, alt([tok("+"), tok("*")]), E]), tok("1")], "E"),
  ]);
  return E;
};
