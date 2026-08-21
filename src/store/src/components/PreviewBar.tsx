import React from 'react';
import { Smartphone, Tablet, Monitor, Sparkles, Moon, Sun, Sliders, Layers } from 'lucide-react';
import type { ThemeMode, ViewportMode } from '../types/store';

interface PreviewBarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  viewportMode: ViewportMode;
  onChangeViewportMode: (mode: ViewportMode) => void;
  actualWidth: number;
  activeBreakpoint: 'Mobile' | 'Tablet' | 'Desktop';
}

export const PreviewBar: React.FC<PreviewBarProps> = ({
  theme,
  onToggleTheme,
  viewportMode,
  onChangeViewportMode,
  actualWidth,
  activeBreakpoint,
}) => {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'var(--bg-glass-heavy)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-md)',
        padding: '0.6rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        transition: 'all var(--transition-normal)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, var(--emerald-600), var(--emerald-500))',
            color: '#fff',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--border-radius-pill)',
            fontWeight: 700,
            fontSize: 'var(--fz-xs)',
            letterSpacing: '0.04em',
            boxShadow: 'var(--shadow-emerald)',
          }}
        >
          <Sparkles size={15} />
          <span>Vayyari Emerald</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--fz-2xs)', color: 'var(--text-muted)' }}>
          <span className="emerald-badge" style={{ fontSize: 'var(--fz-3xs)' }}>
            <Layers size={12} style={{ marginRight: '0.2rem' }} /> No-Line Surface Shift
          </span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
            {activeBreakpoint} ({actualWidth}px)
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'var(--bg-surface-2)',
          padding: '0.25rem',
          borderRadius: 'var(--border-radius-pill)',
        }}
      >
        <button
          onClick={() => onChangeViewportMode('auto')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--border-radius-pill)',
            border: 'none',
            background: viewportMode === 'auto' ? 'var(--bg-surface-1)' : 'transparent',
            color: viewportMode === 'auto' ? 'var(--accent-primary)' : 'var(--text-muted)',
            boxShadow: viewportMode === 'auto' ? 'var(--shadow-sm)' : 'none',
            fontWeight: viewportMode === 'auto' ? 700 : 500,
            fontSize: 'var(--fz-2xs)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title="Responsive Fluid Mode"
        >
          <Sliders size={13} />
          <span>Auto Fluid</span>
        </button>

        <button
          onClick={() => onChangeViewportMode('mobile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--border-radius-pill)',
            border: 'none',
            background: viewportMode === 'mobile' ? 'var(--bg-surface-1)' : 'transparent',
            color: viewportMode === 'mobile' ? 'var(--accent-primary)' : 'var(--text-muted)',
            boxShadow: viewportMode === 'mobile' ? 'var(--shadow-sm)' : 'none',
            fontWeight: viewportMode === 'mobile' ? 700 : 500,
            fontSize: 'var(--fz-2xs)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title="Mobile Simulation (<768px)"
        >
          <Smartphone size={13} />
          <span>Mobile (&lt;768px)</span>
        </button>

        <button
          onClick={() => onChangeViewportMode('tablet')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--border-radius-pill)',
            border: 'none',
            background: viewportMode === 'tablet' ? 'var(--bg-surface-1)' : 'transparent',
            color: viewportMode === 'tablet' ? 'var(--accent-primary)' : 'var(--text-muted)',
            boxShadow: viewportMode === 'tablet' ? 'var(--shadow-sm)' : 'none',
            fontWeight: viewportMode === 'tablet' ? 700 : 500,
            fontSize: 'var(--fz-2xs)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title="Tablet Simulation (768px-1024px)"
        >
          <Tablet size={13} />
          <span>Tablet (768-1024px)</span>
        </button>

        <button
          onClick={() => onChangeViewportMode('desktop')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--border-radius-pill)',
            border: 'none',
            background: viewportMode === 'desktop' ? 'var(--bg-surface-1)' : 'transparent',
            color: viewportMode === 'desktop' ? 'var(--accent-primary)' : 'var(--text-muted)',
            boxShadow: viewportMode === 'desktop' ? 'var(--shadow-sm)' : 'none',
            fontWeight: viewportMode === 'desktop' ? 700 : 500,
            fontSize: 'var(--fz-2xs)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title="Desktop Simulation (>1024px)"
        >
          <Monitor size={13} />
          <span>Desktop (&gt;1024px)</span>
        </button>
      </div>

      <button
        onClick={onToggleTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.85rem',
          borderRadius: 'var(--border-radius-pill)',
          border: 'none',
          background: 'var(--bg-surface-2)',
          color: 'var(--text-primary)',
          fontSize: 'var(--fz-2xs)',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all var(--transition-bounce)',
        }}
        title="Toggle Light / Dark Dual Palette"
      >
        {theme === 'dark' ? <Sun size={15} color="var(--emerald-400)" /> : <Moon size={15} color="var(--emerald-600)" />}
        <span>{theme === 'dark' ? 'Dark Palette' : 'Light Palette'}</span>
      </button>
    </div>
  );
};
