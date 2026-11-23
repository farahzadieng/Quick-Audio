import { normalizeTags } from './fields.js';
export async function readMetadata(file) {
  const { parseBlob } = await import('music-metadata');
  const metadata = await parseBlob(file, { duration: true, skipCovers: false });
  const cover = metadata.common.picture?.[0];
  return {
    tags: normalizeTags(metadata.common),
    duration: metadata.format.duration ?? null,
    bitrate: metadata.format.bitrate ?? null,
    codec: metadata.format.codec ?? file.type,
    sampleRate: metadata.format.sampleRate ?? null,
    cover: cover ? new Blob([cover.data], { type: cover.format || 'image/jpeg' }) : null,
    native: metadata.native,
  };
}
