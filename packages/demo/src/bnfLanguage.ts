import * as monaco from "monaco-editor";

// https://microsoft.github.io/monaco-editor/monarch.html
// https://microsoft.github.io/monaco-editor/playground.html?source=v0.50.0#example-extending-language-services-model-markers-example
// https://github.com/microsoft/monaco-editor/tree/main/src/basic-languages
// https://github.com/Engelberg/instaparse?tab=readme-ov-file#notation
export const bnfLanguage: monaco.languages.IMonarchLanguage = {  
  keywords: ["ε", "eps", "EPSILON", "epsilon", "Epsilon"],
  operators: ["*", "?", "=", ":", ":=", "::=", "|", "!", "&", "/"],

  // we include these common regular expressions
  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  // C# style strings
  escapes:
    /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      // identifiers and keywords
      [
        /[A-Za-z_$][\w$]*/,
        {
          cases: {
            "@keywords": "keyword",
            "@default": "variable",
          },
        },
      ],

      // whitespace
      { include: "@whitespace" },

      // delimiters and operators
      [/[;\.]/, "delimiter"],
      [/[{}()\[\]<>]/, "@brackets"],
      [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],

      // strings
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

      // characters
      [/'[^\\']'/, "string"],
      [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
      [/'/, "string.invalid"],
    ],

    comment: [
      [/[^()*]+/, "comment"],
      [/\(\*/, "comment", "@push"], // nested comment
      [/\*\)/, "comment", "@pop"],
      [/[()*]/, "comment"],
    ],

    string: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\(\*/, "comment", "@comment"],
    ],
  },
};
