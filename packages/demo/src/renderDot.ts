import { Graphviz } from "@hpcc-js/wasm";
import { optimize, type Config as SvgoConfig } from "svgo";
import memoize from "micro-memoize";

const graphviz = await Graphviz.load();
const svgoConfig: SvgoConfig = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          // we need viewbox for inline SVGs
          removeViewBox: false,
        },
      },
    },
  ],
  // datauri: 'enc'
};

function _renderDot(dot: string) {
  return optimize(graphviz.dot(dot), svgoConfig).data;
}

export const renderDot = memoize(_renderDot, { maxSize: 10 });
