function downloadBlob(blob: Blob, filename?: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 150);
}

export function downloadString(str: string, mimeTypes: string, filename?: string) {
  const blob = new Blob([str], {
    type: mimeTypes,
  });
  downloadBlob(blob, filename);
}
