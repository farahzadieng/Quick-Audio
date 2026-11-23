import { ShieldCheck } from 'lucide-react';
export default function Header({ tab, setTab, theme, setTheme }) {
  return (
    <header className="site-header">
      <div className="shell header-content">
        <button
          className="brand"
          onClick={() => {
            setTab('tags');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Quick Audio Tools home"
        >
          <img src="/icons/icon-192.png" alt="" />
          <span>
            Quick <span className="brand-muted">Audio Tools</span>
          </span>
        </button>
        <nav className="nav" aria-label="Primary">
          <button className={tab === 'tags' ? 'active' : ''} onClick={() => setTab('tags')}>
            Tag editor
          </button>
          <button className={tab === 'convert' ? 'active' : ''} onClick={() => setTab('convert')}>
            Converter
          </button>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="header-end">
          <span className="private-note">
            <ShieldCheck size={14} /> 100% on-device
          </span>
          <label className="theme-picker">
            <span className="visually-hidden">Color theme</span>
            <select
              aria-label="Color theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            >
              <option value="system">System theme</option>
              <option value="light">Light theme</option>
              <option value="dark">Dark theme</option>
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}
