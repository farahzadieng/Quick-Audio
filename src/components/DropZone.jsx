import { useRef, useState } from 'react';
import { UploadCloud, LockKeyhole } from 'lucide-react';
const ACCEPT = '.mp3,.flac,.wav,.wave,.m4a,.mp4,.aac,.ogg,.oga,.opus,.aif,.aiff,.wma';
export default function DropZone({ onFiles, compact = false }) {
  const ref = useRef(null),
    [drag, setDrag] = useState(false);
  function receive(files) {
    if (files?.length) onFiles(Array.from(files).filter((f) => f instanceof File));
  }
  return (
    <section
      className={`dropzone ${drag ? 'dragging' : ''} ${compact ? 'compact' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        receive(e.dataTransfer.files);
      }}
    >
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={(e) => {
          receive(e.target.files);
          e.target.value = '';
        }}
        aria-label="Select audio files"
        className="visually-hidden"
      />
      <div className="drop-icon">
        <UploadCloud size={27} strokeWidth={1.4} />
      </div>
      <h3>Drop your audio files here</h3>
      <p>MP3, FLAC, WAV, M4A, OGG, Opus & more</p>
      <button type="button" className="button primary" onClick={() => ref.current?.click()}>
        Browse files
      </button>
      <div className="drop-privacy">
        <LockKeyhole size={13} /> Stays on your device. Always.
      </div>
    </section>
  );
}
