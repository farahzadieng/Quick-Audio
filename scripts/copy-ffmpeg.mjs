import { mkdir, copyFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const source = resolve('node_modules/@ffmpeg/core/dist/esm');
const destination = resolve('public/ffmpeg');
try {
  await mkdir(destination, { recursive: true });
  for (const name of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
    await access(resolve(source, name));
    await copyFile(resolve(source, name), resolve(destination, name));
  }
  console.log('FFmpeg single-thread core copied for same-origin hosting.');
} catch (error) {
  console.warn('FFmpeg core is not installed yet; run npm install before building:', error.message);
  if (process.env.CI) process.exitCode = 1;
}
