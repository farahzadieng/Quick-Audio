let engine;
let loading;
export const OUTPUT_FORMATS = [
  { value: 'mp3', label: 'MP3', mime: 'audio/mpeg', codec: 'libmp3lame' },
  { value: 'wav', label: 'WAV', mime: 'audio/wav', codec: 'pcm_s16le' },
  { value: 'flac', label: 'FLAC', mime: 'audio/flac', codec: 'flac' },
  { value: 'm4a', label: 'M4A / AAC', mime: 'audio/mp4', codec: 'aac' },
  { value: 'ogg', label: 'OGG / Vorbis', mime: 'audio/ogg', codec: 'libvorbis' },
  { value: 'opus', label: 'Opus', mime: 'audio/ogg', codec: 'libopus' },
];
export async function loadEngine(onProgress = () => {}) {
  if (engine) return engine;
  if (!loading) {
    loading = (async () => {
      onProgress({ step: 'Loading conversion engine', progress: 5 });
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const ff = new FFmpeg();
      const base = `${import.meta.env.BASE_URL}ffmpeg`;
      try {
        await ff.load(
          {
            coreURL: `${base}/ffmpeg-core.js`,
            wasmURL: `${base}/ffmpeg-core.wasm`,
          },
          { signal: AbortSignal.timeout(120_000) },
        );
      } catch (error) {
        ff.terminate();
        if (error.name === 'TimeoutError') {
          throw Error(
            'The conversion engine could not start on this browser. Please retry or use a different browser.',
          );
        }
        throw error;
      }
      engine = ff;
      return ff;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}
const commonMetadata = {
  title: 'title',
  artist: 'artist',
  album: 'album',
  albumartist: 'album_artist',
  genre: 'genre',
  date: 'date',
  year: 'date',
  track: 'track',
  disk: 'disc',
  composer: 'composer',
  lyricist: 'lyricist',
  publisher: 'publisher',
  comment: 'comment',
  copyright: 'copyright',
  encodedby: 'encoded_by',
  isrc: 'ISRC',
  bpm: 'TBPM',
  language: 'language',
};
function metadataArgs(tags) {
  const args = [];
  for (const [key, ffKey] of Object.entries(commonMetadata)) {
    if (tags[key]) args.push('-metadata', `${ffKey}=${tags[key]}`);
  }
  return args;
}
function outputOptions(format, bitrate) {
  const def = OUTPUT_FORMATS.find((f) => f.value === format);
  if (!def) throw Error('Unsupported output format');
  const args = ['-c:a', def.codec];
  if (['mp3', 'm4a', 'ogg', 'opus'].includes(format)) args.push('-b:a', `${Number(bitrate) || 192}k`);
  if (format === 'opus') args.push('-application', 'audio');
  return args;
}
let sequence = 0;
export async function convertFile(
  file,
  format,
  bitrate,
  onProgress = () => {},
  tags = null,
  cover = null,
  remux = false,
  extras = [],
) {
  const ff = await loadEngine(onProgress);
  const job = ++sequence;
  const ext =
    file.name
      .split('.')
      .pop()
      ?.replace(/[^a-z0-9]/gi, '')
      .toLowerCase() || 'audio';
  const input = `input_${job}.${ext}`;
  const output = `output_${job}.${format}`;
  const handler = ({ progress }) =>
    onProgress({
      step: remux ? 'Writing metadata' : 'Converting audio',
      progress: Math.round(Math.max(0, Math.min(1, progress)) * 100),
    });
  ff.on('progress', handler);
  let artName;
  try {
    await ff.writeFile(input, new Uint8Array(await file.arrayBuffer()));
    const args = ['-hide_banner', '-loglevel', 'error', '-i', input];
    if (cover) {
      artName = `cover_${job}.${cover.type === 'image/png' ? 'png' : 'jpg'}`;
      await ff.writeFile(artName, new Uint8Array(await cover.arrayBuffer()));
      args.push('-i', artName);
    }
    args.push('-map', '0:a:0', '-map_metadata', '0');
    if (cover && ['mp3', 'm4a', 'flac'].includes(format))
      args.push(
        '-map',
        '1:v:0',
        '-c:v',
        format === 'mp3' ? 'mjpeg' : 'copy',
        '-disposition:v:0',
        'attached_pic',
      );
    args.push(...(remux ? ['-c:a', 'copy'] : outputOptions(format, bitrate)));
    if (tags) args.push(...metadataArgs(tags));
    for (const extra of extras)
      if (extra.key && extra.value) args.push('-metadata', `${extra.key}=${extra.value}`);
    args.push('-y', output);
    const exit = await ff.exec(args);
    if (exit !== 0)
      throw Error(
        `Conversion engine exited with code ${exit}. This codec or format may not be supported.`,
      );
    const result = await ff.readFile(output);
    if (!(result instanceof Uint8Array)) throw Error('Unexpected audio output');
    const mime = OUTPUT_FORMATS.find((f) => f.value === format)?.mime || 'application/octet-stream';
    onProgress({ step: 'Ready to download', progress: 100 });
    return new Blob([result], { type: mime });
  } finally {
    ff.off('progress', handler);
    for (const f of [input, output, artName])
      if (f) {
        try {
          await ff.deleteFile(f);
        } catch {
          /* cleanup best-effort */
        }
      }
  }
}
export async function resetEngine() {
  if (engine) {
    try {
      engine.terminate();
    } catch {
      /* noop */
    }
    engine = undefined;
    loading = undefined;
  }
}
