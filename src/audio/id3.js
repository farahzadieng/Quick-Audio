// Pure ID3v2.3 tag writer. Preserves unknown v2.3 frames, supports common text, TXXX, URLs, comments, lyrics & APIC.
// Leaves the encoded MPEG audio bytes untouched. For non-MP3 formats, the converter performs metadata remuxing.
const encoder = new TextEncoder();
const FRAME = {
  title: 'TIT2',
  artist: 'TPE1',
  album: 'TALB',
  albumartist: 'TPE2',
  date: 'TDRC',
  year: 'TYER',
  genre: 'TCON',
  track: 'TRCK',
  disk: 'TPOS',
  composer: 'TCOM',
  lyricist: 'TEXT',
  conductor: 'TPE3',
  remixer: 'TPE4',
  publisher: 'TPUB',
  label: 'TPUB',
  isrc: 'TSRC',
  bpm: 'TBPM',
  key: 'TKEY',
  language: 'TLAN',
  copyright: 'TCOP',
  encodedby: 'TENC',
  encoder: 'TSSE',
  grouping: 'TIT1',
  subtitle: 'TIT3',
  originalartist: 'TOPE',
  originalalbum: 'TOAL',
  originalyear: 'TORY',
  website: 'WOAR',
};
const CUSTOM = {
  barcode: 'BARCODE',
  mood: 'MOOD',
  catalog: 'CATALOGNUMBER',
  releaseid: 'MUSICBRAINZ_RELEASEID',
  musicbrainztrackid: 'MUSICBRAINZ_TRACKID',
  musicbrainzalbumid: 'MUSICBRAINZ_ALBUMID',
  musicbrainzartistid: 'MUSICBRAINZ_ARTISTID',
  custom: 'AUDIO_QUICK_TOOLS_NOTE',
  description: 'DESCRIPTION',
};
function synchsafe(number) {
  return Uint8Array.of((number >>> 21) & 127, (number >>> 14) & 127, (number >>> 7) & 127, number & 127);
}
function byte32(n) {
  return Uint8Array.of((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
}
function read32(b, p) {
  return (b[p] * 16777216 + b[p + 1] * 65536 + b[p + 2] * 256 + b[p + 3]) >>> 0;
}
function readSynchsafe(b, p) {
  return ((b[p] & 127) << 21) | ((b[p + 1] & 127) << 14) | ((b[p + 2] & 127) << 7) | (b[p + 3] & 127);
}
function concat(...buffers) {
  const length = buffers.reduce((n, b) => n + b.length, 0);
  const result = new Uint8Array(length);
  let off = 0;
  for (const b of buffers) {
    result.set(b, off);
    off += b.length;
  }
  return result;
}
function latin(s) {
  return Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 255));
}
function utf16(s) {
  const b = new Uint8Array(2 + s.length * 2);
  b.set([255, 254]);
  for (let i = 0; i < s.length; i++) {
    b[2 + i * 2] = s.charCodeAt(i) & 255;
    b[3 + i * 2] = s.charCodeAt(i) >> 8;
  }
  return b;
}
function textFrame(id, value) {
  return frame(id, concat(Uint8Array.of(1), utf16(value)));
}
function frame(id, content) {
  return concat(latin(id), byte32(content.length), Uint8Array.of(0, 0), content);
}
function specialText(desc, value) {
  return frame('TXXX', concat(Uint8Array.of(1), utf16(desc), Uint8Array.of(0, 0), utf16(value)));
}
function commentFrame(id, value) {
  return frame(id, concat(Uint8Array.of(1), latin('eng'), Uint8Array.of(255, 254, 0, 0), utf16(value)));
}
function urlFrame(url) {
  return frame('WOAR', encoder.encode(url));
}
async function artFrame(cover) {
  const bytes = new Uint8Array(await cover.arrayBuffer());
  const mime = cover.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return frame('APIC', concat(Uint8Array.of(0), latin(mime), Uint8Array.of(0, 3, 0), bytes));
}
export function inspectID3(bytes) {
  if (bytes.length < 10 || String.fromCharCode(...bytes.slice(0, 3)) !== 'ID3')
    return { offset: 0, frames: [], version: null };
  const version = bytes[3],
    flags = bytes[5],
    size = readSynchsafe(bytes, 6),
    end = Math.min(bytes.length, 10 + size + (flags & 16 ? 10 : 0));
  let pos = 10;
  if (flags & 64 && pos + 4 <= end) {
    const extra = version === 4 ? readSynchsafe(bytes, pos) : read32(bytes, pos);
    pos += version === 4 ? extra : extra + 4;
  }
  const frames = [];
  while (pos + 10 <= end) {
    const id = String.fromCharCode(...bytes.slice(pos, pos + 4));
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const length = version === 4 ? readSynchsafe(bytes, pos + 4) : read32(bytes, pos + 4);
    if (length === 0 || pos + 10 + length > end) break;
    frames.push({
      id,
      data: bytes.slice(pos + 10, pos + 10 + length),
      flags: bytes.slice(pos + 8, pos + 10),
    });
    pos += 10 + length;
  }
  return { offset: end, frames, version, flags };
}
export async function writeMp3Tags(file, tags, cover, removeCover = false, extraTags = []) {
  const original = new Uint8Array(await file.arrayBuffer());
  const prev = inspectID3(original);
  const changes = new Set(
    Object.entries(tags)
      .filter(([, v]) => v !== undefined)
      .map(([key]) => FRAME[key] || (CUSTOM[key] && 'TXXX') || key),
  );
  if (tags.track !== undefined || tags.trackTotal !== undefined) changes.add('TRCK');
  if (tags.disk !== undefined || tags.diskTotal !== undefined) changes.add('TPOS');
  if (tags.comment !== undefined) changes.add('COMM');
  if (tags.lyrics !== undefined) changes.add('USLT');
  if (cover || removeCover) changes.add('APIC');
  const preserved = [];
  if (prev.version === 3 && !(prev.flags & 128))
    for (const f of prev.frames) {
      if (changes.has(f.id)) {
        if (f.id === 'TXXX' && Object.keys(CUSTOM).some((key) => key in tags)) {
          /* custom frames recreated below */
        } else continue;
      }
      // Skip opaque frames whose flag bytes signal compression/encryption.
      if (f.flags[1] & 0xc0) continue;
      preserved.push(frame(f.id, f.data));
    }
  const generated = [];
  for (const [key, id] of Object.entries(FRAME)) {
    if (!(key in tags) || !String(tags[key] ?? '').trim()) continue;
    if (key === 'label' && 'publisher' in tags) continue;
    if (key === 'date') continue; // v2.3 uses TYER; retain only four-digit year here.
    if (key === 'track') continue;
    if (key === 'disk') continue;
    if (key === 'website') {
      generated.push(urlFrame(String(tags[key])));
      continue;
    }
    generated.push(textFrame(id, String(tags[key])));
  }
  const track = String(tags.track ?? '');
  const trackTotal = String(tags.trackTotal ?? '');
  if ('track' in tags || 'trackTotal' in tags) {
    if (track || trackTotal)
      generated.push(textFrame('TRCK', trackTotal ? `${track}/${trackTotal}` : track));
  }
  const disc = String(tags.disk ?? '');
  const discTotal = String(tags.diskTotal ?? '');
  if ('disk' in tags || 'diskTotal' in tags) {
    if (disc || discTotal) generated.push(textFrame('TPOS', discTotal ? `${disc}/${discTotal}` : disc));
  }
  if ('date' in tags && !tags.year && /^\d{4}/.test(tags.date))
    generated.push(textFrame('TYER', tags.date.slice(0, 4)));
  if (tags.comment) generated.push(commentFrame('COMM', tags.comment));
  if (tags.lyrics) generated.push(commentFrame('USLT', tags.lyrics));
  for (const [key, desc] of Object.entries(CUSTOM))
    if (tags[key]) generated.push(specialText(desc, String(tags[key])));
  for (const extra of extraTags) {
    if (extra.key && extra.value) generated.push(specialText(extra.key, extra.value));
  }
  if (cover && !removeCover) generated.push(await artFrame(cover));
  const frames = concat(...preserved, ...generated);
  const header = concat(latin('ID3'), Uint8Array.of(3, 0, 0), synchsafe(frames.length));
  // Strip trailing legacy ID3v1 if present so conflicting tags are not retained.
  const hasID3v1 =
    original.length >= 128 && String.fromCharCode(...original.slice(-128, -125)) === 'TAG';
  const audio = original.slice(prev.offset, hasID3v1 ? original.length - 128 : undefined);
  return new Blob([header, frames, audio], { type: 'audio/mpeg' });
}
export function getFrameMap() {
  return { ...FRAME };
}
