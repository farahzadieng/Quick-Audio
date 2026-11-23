export const FIELD_GROUPS = [
  {
    title: 'Essentials',
    fields: [
      ['title', 'Title'],
      ['artist', 'Artist'],
      ['album', 'Album'],
      ['albumartist', 'Album artist'],
      ['date', 'Release date'],
      ['year', 'Year'],
      ['genre', 'Genre'],
      ['track', 'Track number'],
      ['trackTotal', 'Track total'],
      ['disk', 'Disc number'],
      ['diskTotal', 'Disc total'],
    ],
  },
  {
    title: 'Credits & details',
    fields: [
      ['composer', 'Composer'],
      ['lyricist', 'Lyricist'],
      ['conductor', 'Conductor'],
      ['remixer', 'Remixer'],
      ['publisher', 'Publisher'],
      ['label', 'Record label'],
      ['isrc', 'ISRC'],
      ['barcode', 'Barcode'],
      ['bpm', 'BPM'],
      ['key', 'Musical key'],
      ['language', 'Language'],
      ['copyright', 'Copyright'],
      ['encodedby', 'Encoded by'],
      ['encoder', 'Encoder'],
      ['grouping', 'Grouping'],
      ['mood', 'Mood'],
    ],
  },
  {
    title: 'Notes & identification',
    fields: [
      ['comment', 'Comment'],
      ['lyrics', 'Lyrics'],
      ['subtitle', 'Subtitle'],
      ['description', 'Description'],
      ['website', 'Website / URL'],
      ['originalartist', 'Original artist'],
      ['originalalbum', 'Original album'],
      ['originalyear', 'Original year'],
      ['catalog', 'Catalog number'],
      ['releaseid', 'Release ID'],
      ['musicbrainztrackid', 'MusicBrainz recording ID'],
      ['musicbrainzalbumid', 'MusicBrainz release ID'],
      ['musicbrainzartistid', 'MusicBrainz artist ID'],
      ['custom', 'Custom note'],
    ],
  },
];
export const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);
export const EMPTY_TAGS = Object.fromEntries(ALL_FIELDS.map(([key]) => [key, '']));
export const NUMERIC_FIELDS = new Set([
  'track',
  'trackTotal',
  'disk',
  'diskTotal',
  'year',
  'bpm',
  'originalyear',
]);
export function sanitizeFilename(name) {
  return (
    [...name]
      .map((char) => (char.charCodeAt(0) < 32 || /[\\/:*?"<>|]/.test(char) ? '_' : char))
      .join('')
      .trim()
      .slice(0, 180) || 'audio'
  );
}
export function prettyBytes(n) {
  if (!Number.isFinite(n)) return '—';
  return n < 1024
    ? `${n} B`
    : n < 1024 ** 2
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 ** 2).toFixed(2)} MB`;
}
export function normalizeTags(common = {}) {
  const tags = { ...EMPTY_TAGS };
  for (const key of Object.keys(tags)) {
    const v = common[key];
    if (typeof v === 'string' || typeof v === 'number') tags[key] = String(v);
  }
  tags.track = String(common.track?.no ?? common.track ?? '').replace('[object Object]', '');
  tags.trackTotal = String(common.track?.of ?? '');
  tags.disk = String(common.disk?.no ?? common.disk ?? '').replace('[object Object]', '');
  tags.diskTotal = String(common.disk?.of ?? '');
  tags.year = String(common.year ?? '');
  tags.comment = Array.isArray(common.comment)
    ? common.comment.map((x) => x.text ?? x).join(' | ')
    : String(common.comment ?? '');
  tags.lyrics = Array.isArray(common.lyrics)
    ? common.lyrics.map((x) => x.text ?? x).join('\n')
    : String(common.lyrics ?? '');
  tags.genre = Array.isArray(common.genre) ? common.genre.join('; ') : String(common.genre ?? '');
  tags.composer = Array.isArray(common.composer)
    ? common.composer.join('; ')
    : String(common.composer ?? '');
  tags.lyricist = Array.isArray(common.lyricist)
    ? common.lyricist.join('; ')
    : String(common.lyricist ?? '');
  return tags;
}
