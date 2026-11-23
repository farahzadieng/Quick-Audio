import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectID3, writeMp3Tags } from '../src/audio/id3.js';
function mockFile(bytes) {
  const blob = new Blob([bytes], { type: 'audio/mpeg' });
  return { arrayBuffer: () => blob.arrayBuffer(), name: 'test.mp3' };
}
test('writes ID3v2.3 without changing MPEG payload', async () => {
  const original = new Uint8Array([255, 251, 145, 100, 1, 2, 3, 4, 5, 6]);
  const file = mockFile(original);
  const output = new Uint8Array(
    await (await writeMp3Tags(file, { title: 'Sample', artist: 'Artist' }, null)).arrayBuffer(),
  );
  const header = inspectID3(output);
  assert.equal(header.version, 3);
  assert.ok(header.frames.some((f) => f.id === 'TIT2'));
  assert.deepEqual(output.slice(header.offset), original);
});
test('supports UTF-16 Unicode tags and custom fields', async () => {
  const blob = await writeMp3Tags(
    mockFile(new Uint8Array([0xff, 0xfb, 0, 0])),
    { title: 'آهنگ', barcode: '12345' },
    null,
  );
  const tags = inspectID3(new Uint8Array(await blob.arrayBuffer()));
  assert.ok(tags.frames.some((f) => f.id === 'TXXX'));
  assert.ok(tags.frames.some((f) => f.id === 'TIT2' && f.data[0] === 1));
});
test('replaces existing title rather than duplicating it', async () => {
  const file = mockFile(new Uint8Array([255, 251, 0, 0]));
  const once = new Uint8Array(await (await writeMp3Tags(file, { title: 'One' }, null)).arrayBuffer());
  const twice = new Uint8Array(
    await (await writeMp3Tags(mockFile(once), { title: 'Two' }, null)).arrayBuffer(),
  );
  assert.equal(inspectID3(twice).frames.filter((f) => f.id === 'TIT2').length, 1);
});
test('can attach cover artwork and arbitrary user-defined frame', async () => {
  const image = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });
  const blob = await writeMp3Tags(
    mockFile(new Uint8Array([255, 251, 0, 0])),
    { artist: 'Artist' },
    image,
    false,
    [{ key: 'MY_TEST_KEY', value: 'value' }],
  );
  const frames = inspectID3(new Uint8Array(await blob.arrayBuffer())).frames;
  assert.ok(frames.some((f) => f.id === 'APIC'));
  assert.ok(frames.some((f) => f.id === 'TXXX'));
});
