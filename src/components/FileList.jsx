import { FileAudio, Info, Trash2, X } from 'lucide-react';
import { prettyBytes } from '../audio/fields.js';
const extension = (file) => file.name.split('.').pop()?.toLowerCase() || 'audio';
export default function FileList({ items, selected, setSelected, onRemove, mode }) {
  return (
    <div className="file-list">
      <div className="list-heading">
        <span>
          FILES <strong>{items.length}</strong>
        </span>
        <button className="text-action" onClick={() => onRemove('all')}>
          <Trash2 size={14} /> Clear all
        </button>
      </div>
      {items.map((item) => (
        <div key={item.id} className={`file-row ${selected === item.id ? 'selected' : ''}`}>
          <button className="file-select" onClick={() => setSelected(item.id)}>
            <div className="file-glyph">
              <FileAudio size={17} />
            </div>
            <span className="file-details">
              <strong title={item.file.name}>{item.file.name}</strong>
              <small>
                {prettyBytes(item.file.size)} · {extension(item.file).toUpperCase()}{' '}
                {item.metadata?.duration ? `· ${Math.round(item.metadata.duration)}s` : ''}
              </small>
            </span>
          </button>
          <div className="file-actions">
            <span className={`status-dot ${item.status}`} />
            <button
              onClick={() => onRemove(item.id)}
              className="remove"
              title={`Remove ${item.file.name}`}
              aria-label={`Remove ${item.file.name}`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
      {mode === 'tags' && items.length > 1 && (
        <div className="helper-line">
          <Info size={14} /> Select a file to edit it, or switch on batch mode.
        </div>
      )}
    </div>
  );
}
