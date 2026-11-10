import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      aria-label="Toggle Theme"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
        border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
        color: isLight ? '#0f172a' : '#e2e8f0',
      }}
      onMouseEnter={e => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.transform = 'scale(1.08)';
        btn.style.background = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(245,158,11,0.12)';
      }}
      onMouseLeave={e => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.transform = 'scale(1)';
        btn.style.background = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)';
      }}
    >
      {isLight ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      )}
    </button>
  );
}
