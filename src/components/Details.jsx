import { useEffect, useRef, useState } from 'react';
import { AudioLines, ChevronDown, ChevronRight, Plus, Search, X } from 'lucide-react';
import Field from './Field.jsx';
import { FIELD_GROUPS } from '../audio/fields.js';
export default function Details({
  active,
  values,
  setValues,
  cover,
  setCover,
  removeCover,
  setRemoveCover,
  query,
  setQuery,
  group,
  setGroup,
  customTags,
  setCustomTags,
}) {
  const coverInput = useRef(null);
  const [artURL, setArtURL] = useState('');
  useEffect(() => {
    if (!cover || removeCover) {
      setArtURL('');
      return;
    }
    const url = URL.createObjectURL(cover);
    setArtURL(url);
    return () => URL.revokeObjectURL(url);
  }, [cover, removeCover]);
  const shown = FIELD_GROUPS.map((g) => ({
    ...g,
    fields: g.fields.filter(([id, label]) =>
      `${id} ${label}`.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((g) => g.fields.length);
  return (
    <div className="editor-fields">
      <div className="editor-toolbar">
        <div>
          <div className="section-overline">METADATA</div>
          <h3>{active?.file?.name || 'Batch metadata'}</h3>
          <p>
            {active
              ? 'Edit any field below. Blank fields can be cleared.'
              : 'Only populated values are applied to every file.'}
          </p>
        </div>
        <label className="search">
          <Search size={15} />
          <input
            aria-label="Search metadata fields"
            placeholder="Find a field..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="cover-row">
        <div className="cover-art" style={artURL ? { backgroundImage: `url(${artURL})` } : {}}>
          {(!cover || removeCover) && <AudioLines size={28} />}
        </div>
        <div className="cover-details">
          <strong>Album artwork</strong>
          <p>JPEG or PNG. Square images work best.</p>
          <div className="inline-actions">
            <button className="button small outline" onClick={() => coverInput.current?.click()}>
              Choose image
            </button>
            {cover && (
              <button
                className="text-action"
                onClick={() => {
                  setCover(null);
                  setRemoveCover(true);
                }}
              >
                Remove artwork
              </button>
            )}
          </div>
          <input
            ref={coverInput}
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (f.size > 5 * 1024 * 1024) {
                  alert('Please choose an image smaller than 5 MB.');
                  return;
                }
                setCover(f);
                setRemoveCover(false);
              }
              e.target.value = '';
            }}
          />
        </div>
      </div>
      <div className="groups">
        {shown.map((g) => (
          <div className="field-group" key={g.title}>
            <button className="group-heading" onClick={() => setGroup(group === g.title ? '' : g.title)}>
              <span>
                {g.title}
                <small>{g.fields.length} fields</small>
              </span>
              {group === g.title ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
            </button>
            {group === g.title && (
              <div className="field-grid">
                {g.fields.map(([id, label]) => (
                  <Field
                    key={id}
                    name={id}
                    label={label}
                    value={values[id]}
                    onChange={(key, val) => setValues((v) => ({ ...v, [key]: val }))}
                    multiline={['lyrics', 'comment', 'description', 'custom'].includes(id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {!shown.length && <div className="empty-search">No metadata fields match your search.</div>}
      <div className="custom-section">
        <div className="small-heading">
          <span>CUSTOM TAGS (TXXX / METADATA)</span>
          <button
            className="text-action"
            onClick={() => setCustomTags((s) => [...s, { id: crypto.randomUUID(), key: '', value: '' }])}
          >
            <Plus size={14} /> Add tag
          </button>
        </div>
        <p>
          Custom key/value metadata, for example LABELCODE or DISCOGS_RELEASE_ID. In MP3 these are
          written as ID3 TXXX frames.
        </p>
        {customTags.map((c) => (
          <div className="custom-row" key={c.id}>
            <input
              value={c.key}
              placeholder="Tag name"
              aria-label="Custom tag name"
              onChange={(e) =>
                setCustomTags((s) => s.map((x) => (x.id === c.id ? { ...x, key: e.target.value } : x)))
              }
            />
            <input
              value={c.value}
              placeholder="Value"
              aria-label="Custom tag value"
              onChange={(e) =>
                setCustomTags((s) => s.map((x) => (x.id === c.id ? { ...x, value: e.target.value } : x)))
              }
            />
            <button
              title="Remove custom tag"
              aria-label="Remove custom tag"
              onClick={() => setCustomTags((s) => s.filter((x) => x.id !== c.id))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
