import memoize from "micro-memoize";
import * as Comlink from "comlink";
import { ParseOptions } from "zipline";

function timeout(t: number) {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error("Timeout")), t);
  }) as Promise<never>;
}

function _parseClient(grammar: string, text: string, opt?: ParseOptions) {
  const worker = new Worker(new URL("./parseWorker.ts", import.meta.url), {
    type: "module",
  });
  const instance = Comlink.wrap<typeof import("./parseWorker.ts")>(worker);

  // in some cases parser can hang,
  // so as workaround I always terminate previous execution after timeout
  return Promise.race([
    timeout(10_000),
    instance.parseWorker(grammar, text, opt),
  ]).finally(() => worker.terminate());
}

export const parseClient = memoize(_parseClient, {
  maxSize: 10,
  // isPromise: true,
});
