import * as Comlink from "comlink";
import { createParser, ParseOptions } from "pwz";

export function parseWorker(grammar: string, text: string, opt?: ParseOptions) {
  return createParser(grammar)(text, opt);
}

Comlink.expose({
  parseWorker,
});
