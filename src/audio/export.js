import { zipSync } from 'fflate';
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export async function zipDownloads(files) {
  const entries = {};
  for (const { blob, name } of files) {
    let filename = name,
      n = 2;
    while (entries[filename]) filename = `${n++}-${name}`;
    entries[filename] = new Uint8Array(await blob.arrayBuffer());
  }
  const zip = zipSync(entries, { level: 0 });
  return new Blob([zip], { type: 'application/zip' });
}
