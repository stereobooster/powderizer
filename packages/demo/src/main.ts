import "./index.css";
import "@beoe/pan-zoom/css/PanZoomUi.css";
import { PanZoomUi } from "@beoe/pan-zoom";
import { renderDot } from "./renderDot";
import { treeToDot } from "./treeToDot";
import { parseClient } from "./parseClient";

const result = document.querySelector("#result")!;
const grammar = document.querySelector(
  "#grammar"
) as HTMLTextAreaElement | null;
const text = document.querySelector("#text")! as HTMLTextAreaElement;
const error = document.querySelector("#error")!;
const errorMessage = document.querySelector("#errorMessage")!;
const allTrees = document.querySelector("#allTrees")! as HTMLInputElement;
const allTreesLabel = document.querySelector("#allTreesLabel")!;
const ranges = document.querySelector("#ranges")! as HTMLInputElement;
const values = document.querySelector("#values")! as HTMLInputElement;
const download = document.querySelector("#download")! as HTMLButtonElement;

let panZoomInstance: PanZoomUi;

const u = new URL(window.location.toString());
const p = u.searchParams;
const value =
  p.get("g") ||
  `EXP = E
<E> = <"("> E <")"> | mul | add | sub | num
mul = E <"*"> E
add = E <"+"> E
sub = E <"-"> E
num = [#"\\\\d"+]`;
if (grammar) grammar.textContent = value;
text.textContent = p.get("t") || "1+2*3+4";
allTrees.checked = Boolean(p.get("all"));
ranges.checked = Boolean(p.get("ranges"));
values.checked = Boolean(p.get("values"));

import * as monaco from "monaco-editor";
import { bnfLanguage } from "./bnfLanguage";
import { downloadString } from "./downloadBlob";
monaco.languages.register({ id: "bnf" });
monaco.languages.setMonarchTokensProvider("bnf", bnfLanguage);

async function validate(model: monaco.editor.ITextModel) {
  const markers = [];
  try {
    await parseClient(model.getValue(), text.value);
  } catch (e) {
    console.log(e);
    markers.push({
      message: String(e),
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    });
  }

  monaco.editor.setModelMarkers(model, "owner", markers);
  return markers.length === 0;
}
const uri = monaco.Uri.parse("inmemory://test");
const model = monaco.editor.createModel(value, "bnf", uri);

const editor = monaco.editor.create(document.getElementById("editor")!, {
  language: "bnf",
  minimap: { enabled: false },
  model,
  bracketPairColorization: { enabled: true },
  matchBrackets: "always",
});

async function process(valid = true) {
  const grammarValue = grammar?.value || model.getValue();
  const textValue = text.value;
  const showAlltrees = allTrees.checked;
  const showRanges = ranges.checked;
  const showValues = values.checked;

  if (valid) {
    try {
      error.classList.add("hidden");
      allTreesLabel.textContent = `Show all trees`;

      const tree = await parseClient(grammarValue, textValue, {
        ambiguity: showAlltrees ? "sppf" : "first",
        showPos: showRanges,
      });

      if (panZoomInstance) panZoomInstance.off();
      result.innerHTML = "";

      if (!tree) {
        error.classList.remove("hidden");
        errorMessage.textContent = "Can't parse";
      } else {
        result.innerHTML = renderDot(treeToDot(tree, showRanges, showValues));
        const element = result.firstElementChild;

        // @ts-expect-error
        panZoomInstance = new PanZoomUi({ element, container: result });
        panZoomInstance.on();
      }
    } catch (e) {
      error.classList.remove("hidden");
      if (typeof e === "string") {
        errorMessage.textContent = e;
      } else {
        errorMessage.textContent = (e as Error).message;
      }
    }
  }

  p.set("g", grammarValue);
  p.set("t", textValue);
  p.set("all", showAlltrees ? "1" : "");
  p.set("ranges", showRanges ? "1" : "");
  p.set("values", showValues ? "1" : "");
  window.history.replaceState({}, "", u);
}

process(await validate(model));
editor.onDidChangeModelContent(async () => {
  process(await validate(model));
});

// process();
grammar?.addEventListener("keyup", () => process());
text.addEventListener("keyup", () => process());
allTrees.addEventListener("change", () => process());
ranges.addEventListener("change", () => process());
values.addEventListener("change", () => process());
download.addEventListener("click", () =>
  downloadString(
    result.firstElementChild?.outerHTML || "",
    "image/svg+xml",
    "ast.svg"
  )
);
