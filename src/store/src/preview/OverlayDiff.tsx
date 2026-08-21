import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './OverlayDiff.css';

/* -------------------------------------------------------------------------- */
/* TYPES & INTERFACES                                                         */
/* -------------------------------------------------------------------------- */

export type ComparisonMode = 'overlay' | 'split' | 'swipe' | 'difference';

export type BlendMode =
  | 'normal'
  | 'difference'
  | 'exclusion'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten';

export type HighlightColor = 'magenta' | 'cyan' | 'red' | 'green' | 'yellow';

export interface ViewportPreset {
  id: string;
  name: string;
  width: number;
  height?: number;
  description: string;
}

export interface OverlayDiffProps {
  /** Baseline reference mockup image URL or data URI */
  defaultBaselineUrl?: string;
  /** Live application target URL (rendered in iframe) or live screenshot URL */
  liveUrl?: string;
  /** Custom React element for live component preview */
  liveNode?: React.ReactNode;
  /** Initial comparison mode (default: 'overlay') */
  initialMode?: ComparisonMode;
  /** Initial opacity for overlay mode (0 to 1, default: 0.5) */
  initialOpacity?: number;
  /** Initial viewport width in pixels (default: 1280) */
  initialViewportWidth?: number;
  /** Callback when baseline image is updated */
  onBaselineChange?: (url: string | null) => void;
  /** Additional CSS class names */
  className?: string;
  /** Custom title for the preview bar */
  title?: string;
}

export interface DiffResultStats {
  mismatchPixels: number;
  totalPixels: number;
  mismatchPercentage: number;
  isDiffCalculated: boolean;
}

/* -------------------------------------------------------------------------- */
/* VIEWPORT PRESETS                                                           */
/* -------------------------------------------------------------------------- */

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { id: '360', name: '360px', width: 360, height: 740, description: 'Mobile Small (360x740)' },
  { id: '430', name: '430px', width: 430, height: 932, description: 'Mobile Large (430x932)' },
  { id: '768', name: '768px', width: 768, height: 1024, description: 'Tablet (768x1024)' },
  { id: '1280', name: '1280px', width: 1280, height: 800, description: 'Desktop (1280x800)' },
  { id: '1440', name: '1440px', width: 1440, height: 900, description: 'Wide Screen (1440x900)' },
];

/* -------------------------------------------------------------------------- */
/* SAMPLE MOCK & LIVE FALLBACK DATA                                           */
/* -------------------------------------------------------------------------- */

// Built-in mock mockup SVG baseline generator data URL
const SAMPLE_BASELINE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#0f172a"/>
  <!-- Header -->
  <rect width="1280" height="64" fill="#1e293b"/>
  <circle cx="48" cy="32" r="14" fill="#8b5cf6"/>
  <text x="74" y="38" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">DeepLens Store Mockup Baseline</text>
  <rect x="1080" y="20" width="140" height="28" rx="6" fill="#8b5cf6"/>
  <text x="1115" y="39" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold">Checkout</text>
  <!-- Hero Section -->
  <rect x="64" y="100" width="1152" height="240" rx="12" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <text x="100" y="170" fill="#f8fafc" font-family="sans-serif" font-size="32" font-weight="bold">Visual Regression Verification</text>
  <text x="100" y="210" fill="#94a3b8" font-family="sans-serif" font-size="16">Compare pixel-perfect design specifications with live UI build.</text>
  <rect x="100" y="240" width="160" height="42" rx="8" fill="#ec4899"/>
  <text x="135" y="266" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">Explore Products</text>
  <!-- Product Cards Grid -->
  <g transform="translate(64, 380)">
    <!-- Card 1 -->
    <rect width="360" height="340" rx="10" fill="#1e293b" stroke="#334155"/>
    <rect x="20" y="20" width="320" height="180" rx="6" fill="#334155"/>
    <text x="180" y="115" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">Product Banner 1</text>
    <text x="20" y="235" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">DeepLens AI Optics Unit</text>
    <text x="20" y="265" fill="#8b5cf6" font-family="sans-serif" font-size="20" font-weight="bold">$499.00</text>
    <rect x="20" y="285" width="320" height="36" rx="6" fill="#8b5cf6"/>
    <text x="180" y="308" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Add to Cart</text>
    <!-- Card 2 -->
    <g transform="translate(396, 0)">
      <rect width="360" height="340" rx="10" fill="#1e293b" stroke="#334155"/>
      <rect x="20" y="20" width="320" height="180" rx="6" fill="#334155"/>
      <text x="180" y="115" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">Product Banner 2</text>
      <text x="20" y="235" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">Neural Edge Processor</text>
      <text x="20" y="265" fill="#8b5cf6" font-family="sans-serif" font-size="20" font-weight="bold">$299.00</text>
      <rect x="20" y="285" width="320" height="36" rx="6" fill="#8b5cf6"/>
      <text x="180" y="308" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Add to Cart</text>
    </g>
    <!-- Card 3 -->
    <g transform="translate(792, 0)">
      <rect width="360" height="340" rx="10" fill="#1e293b" stroke="#334155"/>
      <rect x="20" y="20" width="320" height="180" rx="6" fill="#334155"/>
      <text x="180" y="115" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">Product Banner 3</text>
      <text x="20" y="235" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">High Precision Sensor</text>
      <text x="20" y="265" fill="#8b5cf6" font-family="sans-serif" font-size="20" font-weight="bold">$189.00</text>
      <rect x="20" y="285" width="320" height="36" rx="6" fill="#8b5cf6"/>
      <text x="180" y="308" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Add to Cart</text>
    </g>
  </g>
</svg>
`)}`;

// Built-in live template SVG (with intentional slight differences for diff preview!)
const SAMPLE_LIVE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#0f172a"/>
  <!-- Header (Difference: Cyan button instead of purple) -->
  <rect width="1280" height="64" fill="#1e293b"/>
  <circle cx="48" cy="32" r="14" fill="#06b6d4"/>
  <text x="74" y="38" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">DeepLens Store Mockup Baseline</text>
  <rect x="1080" y="20" width="140" height="28" rx="6" fill="#06b6d4"/>
  <text x="1115" y="39" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold">Checkout</text>
  <!-- Hero Section -->
  <rect x="64" y="100" width="1152" height="240" rx="12" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <text x="100" y="170" fill="#f8fafc" font-family="sans-serif" font-size="32" font-weight="bold">Visual Regression Verification</text>
  <text x="100" y="210" fill="#94a3b8" font-family="sans-serif" font-size="16">Compare pixel-perfect design specifications with live UI build.</text>
  <!-- Difference: Moved button 20px right and cyan background -->
  <rect x="120" y="240" width="160" height="42" rx="8" fill="#06b6d4"/>
  <text x="155" y="266" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">Explore Products</text>
  <!-- Product Cards Grid -->
  <g transform="translate(64, 380)">
    <!-- Card 1 -->
    <rect width="360" height="340" rx="10" fill="#1e293b" stroke="#334155"/>
    <rect x="20" y="20" width="320" height="180" rx="6" fill="#334155"/>
    <text x="180" y="115" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">Product Banner 1</text>
    <text x="20" y="235" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">DeepLens AI Optics Unit</text>
    <!-- Difference: Price changed from $499 to $449 -->
    <text x="20" y="265" fill="#10b981" font-family="sans-serif" font-size="20" font-weight="bold">$449.00</text>
    <rect x="20" y="285" width="320" height="36" rx="6" fill="#06b6d4"/>
    <text x="180" y="308" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Add to Cart</text>
    <!-- Card 2 -->
    <g transform="translate(396, 0)">
      <rect width="360" height="340" rx="10" fill="#1e293b" stroke="#334155"/>
      <rect x="20" y="20" width="320" height="180" rx="6" fill="#334155"/>
      <text x="180" y="115" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">Product Banner 2</text>
      <text x="20" y="235" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">Neural Edge Processor</text>
      <text x="20" y="265" fill="#8b5cf6" font-family="sans-serif" font-size="20" font-weight="bold">$299.00</text>
      <rect x="20" y="285" width="320" height="36" rx="6" fill="#8b5cf6"/>
      <text x="180" y="308" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Add to Cart</text>
    </g>
    <!-- Card 3 -->
    <g transform="translate(792, 0)">
      <rect width="360" height="340" rx="10" fill="#1e293b" stroke="#334155"/>
      <rect x="20" y="20" width="320" height="180" rx="6" fill="#334155"/>
      <text x="180" y="115" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">Product Banner 3</text>
      <text x="20" y="235" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">High Precision Sensor</text>
      <text x="20" y="265" fill="#8b5cf6" font-family="sans-serif" font-size="20" font-weight="bold">$189.00</text>
      <rect x="20" y="285" width="320" height="36" rx="6" fill="#8b5cf6"/>
      <text x="180" y="308" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Add to Cart</text>
    </g>
  </g>
</svg>
`)}`;

/* -------------------------------------------------------------------------- */
/* HOOK: useSwipeSlider                                                       */
/* -------------------------------------------------------------------------- */

export function useSwipeSlider(initialPos = 50) {
  const [position, setPosition] = useState<number>(initialPos);
  const isDraggingRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let pct = (x / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    setPosition(pct);
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      handleMove(e.clientX);
    },
    [handleMove]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDraggingRef.current = true;
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    },
    [handleMove]
  );

  useEffect(() => {
    const onWindowMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleMove(e.clientX);
      }
    };

    const onWindowTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const onWindowUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', onWindowMove);
    window.addEventListener('mouseup', onWindowUp);
    window.addEventListener('touchmove', onWindowTouchMove);
    window.addEventListener('touchend', onWindowUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMove);
      window.removeEventListener('mouseup', onWindowUp);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowUp);
    };
  }, [handleMove]);

  return { position, setPosition, containerRef, onMouseDown, onTouchStart };
}

/* -------------------------------------------------------------------------- */
/* HOOK: usePixelDiff                                                         */
/* -------------------------------------------------------------------------- */

export function usePixelDiff(
  baselineUrl: string,
  liveUrl: string,
  threshold: number = 15,
  highlightColor: HighlightColor = 'magenta'
) {
  const [stats, setStats] = useState<DiffResultStats>({
    mismatchPixels: 0,
    totalPixels: 0,
    mismatchPercentage: 0,
    isDiffCalculated: false,
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderDiff = useCallback(() => {
    if (!baselineUrl || !liveUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgBase = new Image();
    const imgLive = new Image();

    imgBase.crossOrigin = 'Anonymous';
    imgLive.crossOrigin = 'Anonymous';

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount += 1;
      if (loadedCount === 2) {
        const width = imgBase.naturalWidth || 1280;
        const height = imgBase.naturalHeight || 800;

        canvas.width = width;
        canvas.height = height;

        // Create offscreen canvas for base & live
        const offBase = document.createElement('canvas');
        offBase.width = width;
        offBase.height = height;
        const ctxBase = offBase.getContext('2d', { willReadFrequently: true });

        const offLive = document.createElement('canvas');
        offLive.width = width;
        offLive.height = height;
        const ctxLive = offLive.getContext('2d', { willReadFrequently: true });

        if (!ctxBase || !ctxLive) return;

        ctxBase.drawImage(imgBase, 0, 0, width, height);
        ctxLive.drawImage(imgLive, 0, 0, width, height);

        const dataBase = ctxBase.getImageData(0, 0, width, height);
        const dataLive = ctxLive.getImageData(0, 0, width, height);
        const diffData = ctx.createImageData(width, height);

        let mismatchCount = 0;
        const total = width * height;

        // Select RGB for highlight color
        let hr = 236, hg = 72, hb = 153; // magenta default
        if (highlightColor === 'cyan') { hr = 6; hg = 182; hb = 212; }
        else if (highlightColor === 'red') { hr = 239; hg = 68; hb = 68; }
        else if (highlightColor === 'green') { hr = 16; hg = 185; hb = 129; }
        else if (highlightColor === 'yellow') { hr = 245; hg = 158; hb = 11; }

        for (let i = 0; i < dataBase.data.length; i += 4) {
          const r1 = dataBase.data[i];
          const g1 = dataBase.data[i + 1];
          const b1 = dataBase.data[i + 2];

          const r2 = dataLive.data[i];
          const g2 = dataLive.data[i + 1];
          const b2 = dataLive.data[i + 2];

          const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

          if (diff > threshold * 3) {
            mismatchCount++;
            diffData.data[i] = hr;
            diffData.data[i + 1] = hg;
            diffData.data[i + 2] = hb;
            diffData.data[i + 3] = 240; // High visibility highlight
          } else {
            // Render subtle desaturated live background
            const avg = (r2 + g2 + b2) / 3;
            diffData.data[i] = avg * 0.3;
            diffData.data[i + 1] = avg * 0.3;
            diffData.data[i + 2] = avg * 0.3;
            diffData.data[i + 3] = 160;
          }
        }

        ctx.putImageData(diffData, 0, 0);

        const pct = parseFloat(((mismatchCount / total) * 100).toFixed(2));
        setStats({
          mismatchPixels: mismatchCount,
          totalPixels: total,
          mismatchPercentage: pct,
          isDiffCalculated: true,
        });
      }
    };

    imgBase.onload = checkLoaded;
    imgLive.onload = checkLoaded;
    imgBase.onerror = () => setStats((s) => ({ ...s, isDiffCalculated: false }));
    imgLive.onerror = () => setStats((s) => ({ ...s, isDiffCalculated: false }));

    imgBase.src = baselineUrl;
    imgLive.src = liveUrl;
  }, [baselineUrl, liveUrl, threshold, highlightColor]);

  useEffect(() => {
    renderDiff();
  }, [renderDiff]);

  return { canvasRef, stats, recalculate: renderDiff };
}

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENT: ViewportSelector                                            */
/* -------------------------------------------------------------------------- */

export function ViewportSelector({
  activeWidth,
  onSelectWidth,
  isLandscape,
  onToggleOrientation,
}: {
  activeWidth: number;
  onSelectWidth: (w: number) => void;
  isLandscape: boolean;
  onToggleOrientation: () => void;
}) {
  const [customWidth, setCustomWidth] = useState<string>(activeWidth.toString());

  useEffect(() => {
    setCustomWidth(activeWidth.toString());
  }, [activeWidth]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customWidth, 10);
    if (!isNaN(val) && val >= 320 && val <= 3840) {
      onSelectWidth(val);
    }
  };

  return (
    <div className="od-viewport-group">
      {VIEWPORT_PRESETS.map((vp) => (
        <button
          key={vp.id}
          className={`od-vp-btn ${activeWidth === vp.width ? 'active' : ''}`}
          onClick={() => onSelectWidth(vp.width)}
          title={vp.description}
        >
          {vp.name}
        </button>
      ))}

      <form onSubmit={handleCustomSubmit} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <input
          type="number"
          className="od-vp-custom-input"
          value={customWidth}
          onChange={(e) => setCustomWidth(e.target.value)}
          onBlur={handleCustomSubmit}
          placeholder="px"
          title="Custom Viewport Width (px)"
        />
      </form>

      <button
        type="button"
        className={`od-icon-btn ${isLandscape ? 'active' : ''}`}
        onClick={onToggleOrientation}
        title={isLandscape ? 'Landscape Mode' : 'Portrait Mode'}
        style={{ marginLeft: 4, width: 28, height: 28 }}
      >
        📱
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENT: ControlBar                                                  */
/* -------------------------------------------------------------------------- */

export function ControlBar({
  mode,
  onModeChange,
  opacity,
  onOpacityChange,
  blendMode,
  onBlendModeChange,
  viewportWidth,
  onViewportWidthChange,
  isLandscape,
  onToggleOrientation,
  autoScale,
  onToggleAutoScale,
  highlightColor,
  onHighlightColorChange,
  sensitivity,
  onSensitivityChange,
  onUploadClick,
  onResetBaseline,
  hasBaseline,
  title,
}: {
  mode: ComparisonMode;
  onModeChange: (m: ComparisonMode) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
  blendMode: BlendMode;
  onBlendModeChange: (b: BlendMode) => void;
  viewportWidth: number;
  onViewportWidthChange: (w: number) => void;
  isLandscape: boolean;
  onToggleOrientation: () => void;
  autoScale: boolean;
  onToggleAutoScale: () => void;
  highlightColor: HighlightColor;
  onHighlightColorChange: (c: HighlightColor) => void;
  sensitivity: number;
  onSensitivityChange: (s: number) => void;
  onUploadClick: () => void;
  onResetBaseline: () => void;
  hasBaseline: boolean;
  title?: string;
}) {
  return (
    <div className="od-control-bar">
      {/* Brand Header */}
      <div className="od-brand">
        <div className="od-brand-icon">👁️</div>
        <div>
          <div className="od-brand-title">{title || 'Visual Regression Preview'}</div>
          <div className="od-brand-subtitle">Mockup vs Live Comparator</div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="od-mode-tabs">
        <button
          className={`od-tab-btn ${mode === 'overlay' ? 'active' : ''}`}
          onClick={() => onModeChange('overlay')}
          title="Adjustable Opacity Overlay Mode [1]"
        >
          <span>🥞</span> Overlay
        </button>
        <button
          className={`od-tab-btn ${mode === 'swipe' ? 'active' : ''}`}
          onClick={() => onModeChange('swipe')}
          title="Interactive Swipe Split Slider Mode [2]"
        >
          <span>↔️</span> Swipe
        </button>
        <button
          className={`od-tab-btn ${mode === 'split' ? 'active' : ''}`}
          onClick={() => onModeChange('split')}
          title="Side-by-Side Dual Viewport Mode [3]"
        >
          <span>🌗</span> Split
        </button>
        <button
          className={`od-tab-btn ${mode === 'difference' ? 'active' : ''}`}
          onClick={() => onModeChange('difference')}
          title="Pixel Difference Heatmap Engine [4]"
        >
          <span>🔥</span> Canvas Diff
        </button>
      </div>

      {/* Controls Group */}
      <div className="od-controls-group">
        {/* Viewport Presets */}
        <ViewportSelector
          activeWidth={viewportWidth}
          onSelectWidth={onViewportWidthChange}
          isLandscape={isLandscape}
          onToggleOrientation={onToggleOrientation}
        />

        <button
          type="button"
          className={`od-icon-btn ${autoScale ? 'active' : ''}`}
          onClick={onToggleAutoScale}
          title={autoScale ? 'Auto-Fit Scale: Enabled' : 'Auto-Fit Scale: Disabled'}
        >
          🔍
        </button>

        {/* Mode Specific Controls */}
        {mode === 'overlay' && (
          <>
            <div className="od-slider-control">
              <span>Opacity: {Math.round(opacity * 100)}%</span>
              <input
                type="range"
                className="od-range-slider"
                min="0"
                max="1"
                step="0.02"
                value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              />
            </div>

            <select
              className="od-select"
              value={blendMode}
              onChange={(e) => onBlendModeChange(e.target.value as BlendMode)}
              title="CSS Blend Mode"
            >
              <option value="normal">Blend: Normal</option>
              <option value="difference">Blend: Difference</option>
              <option value="exclusion">Blend: Exclusion</option>
              <option value="multiply">Blend: Multiply</option>
              <option value="screen">Blend: Screen</option>
              <option value="overlay">Blend: Overlay</option>
            </select>
          </>
        )}

        {mode === 'difference' && (
          <>
            <div className="od-slider-control">
              <span>Sens: {sensitivity}</span>
              <input
                type="range"
                className="od-range-slider"
                min="1"
                max="40"
                step="1"
                value={sensitivity}
                onChange={(e) => onSensitivityChange(parseInt(e.target.value, 10))}
              />
            </div>

            <select
              className="od-select"
              value={highlightColor}
              onChange={(e) => onHighlightColorChange(e.target.value as HighlightColor)}
              title="Diff Highlight Color"
            >
              <option value="magenta">Color: Magenta</option>
              <option value="cyan">Color: Cyan</option>
              <option value="red">Color: Red</option>
              <option value="green">Color: Green</option>
              <option value="yellow">Color: Yellow</option>
            </select>
          </>
        )}

        {/* Baseline File Action */}
        <button
          type="button"
          className="od-btn-upload"
          onClick={onUploadClick}
          title="Upload baseline mockup image"
        >
          <span>📁</span> {hasBaseline ? 'Change Mockup' : 'Upload Mockup'}
        </button>

        {hasBaseline && (
          <button
            type="button"
            className="od-icon-btn"
            onClick={onResetBaseline}
            title="Reset to default baseline sample"
          >
            🔄
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT: OverlayDiff                                                */
/* -------------------------------------------------------------------------- */

export const OverlayDiff: React.FC<OverlayDiffProps> = ({
  defaultBaselineUrl = SAMPLE_BASELINE_SVG,
  liveUrl = SAMPLE_LIVE_SVG,
  liveNode,
  initialMode = 'overlay',
  initialOpacity = 0.5,
  initialViewportWidth = 1280,
  onBaselineChange,
  className = '',
  title,
}) => {
  const [baselineUrl, setBaselineUrl] = useState<string>(defaultBaselineUrl);
  const [mode, setMode] = useState<ComparisonMode>(initialMode);
  const [opacity, setOpacity] = useState<number>(initialOpacity);
  const [blendMode, setBlendMode] = useState<BlendMode>('normal');
  const [viewportWidth, setViewportWidth] = useState<number>(initialViewportWidth);
  const [isLandscape, setIsLandscape] = useState<boolean>(true);
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('magenta');
  const [sensitivity, setSensitivity] = useState<number>(15);
  const [autoScale, setAutoScale] = useState<boolean>(true);
  const [scaleFactor, setScaleFactor] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Swipe Hook
  const { position: swipePos, containerRef: swipeContainerRef, onMouseDown: onSwipeMouseDown, onTouchStart: onSwipeTouchStart } = useSwipeSlider(50);

  // Pixel Diff Hook
  const { canvasRef: diffCanvasRef, stats: diffStats } = usePixelDiff(
    baselineUrl,
    liveUrl,
    sensitivity,
    highlightColor
  );

  // Handle baseline file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const newUrl = evt.target.result as string;
          setBaselineUrl(newUrl);
          if (onBaselineChange) onBaselineChange(newUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetBaseline = () => {
    setBaselineUrl(defaultBaselineUrl);
    if (onBaselineChange) onBaselineChange(defaultBaselineUrl);
  };

  // Calculate auto-scale to fit container width seamlessly
  useEffect(() => {
    const calculateScale = () => {
      if (!workspaceRef.current || !autoScale) {
        setScaleFactor(1);
        return;
      }
      const containerW = workspaceRef.current.clientWidth - 48; // padding
      if (containerW < viewportWidth) {
        setScaleFactor(containerW / viewportWidth);
      } else {
        setScaleFactor(1);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [viewportWidth, autoScale]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === '1') setMode('overlay');
      if (e.key === '2') setMode('swipe');
      if (e.key === '3') setMode('split');
      if (e.key === '4') setMode('difference');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeHeight = useMemo(() => {
    const preset = VIEWPORT_PRESETS.find((v) => v.width === viewportWidth);
    if (preset && preset.height) return preset.height;
    return Math.round(viewportWidth * (9 / 16));
  }, [viewportWidth]);

  return (
    <div className={`overlay-diff-container ${className}`}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Control Bar */}
      <ControlBar
        mode={mode}
        onModeChange={setMode}
        opacity={opacity}
        onOpacityChange={setOpacity}
        blendMode={blendMode}
        onBlendModeChange={setBlendMode}
        viewportWidth={viewportWidth}
        onViewportWidthChange={setViewportWidth}
        isLandscape={isLandscape}
        onToggleOrientation={() => setIsLandscape(!isLandscape)}
        autoScale={autoScale}
        onToggleAutoScale={() => setAutoScale(!autoScale)}
        highlightColor={highlightColor}
        onHighlightColorChange={setHighlightColor}
        sensitivity={sensitivity}
        onSensitivityChange={setSensitivity}
        onUploadClick={() => fileInputRef.current?.click()}
        onResetBaseline={handleResetBaseline}
        hasBaseline={baselineUrl !== defaultBaselineUrl}
        title={title}
      />

      {/* Workspace Area */}
      <div className="od-workspace" ref={workspaceRef}>
        <div
          className="od-viewport-wrapper"
          style={{
            width: viewportWidth,
            height: isLandscape ? activeHeight : viewportWidth,
            transform: scaleFactor < 1 ? `scale(${scaleFactor})` : 'none',
            transformOrigin: 'top center',
          }}
        >
          {/* MODE 1: OVERLAY */}
          {mode === 'overlay' && (
            <div className="od-overlay-stack">
              {/* Live Layer */}
              <div className="od-live-layer">
                {liveNode ? (
                  liveNode
                ) : liveUrl.startsWith('http') && !liveUrl.match(/\.(jpeg|jpg|gif|png|svg)$/) ? (
                  <iframe
                    src={liveUrl}
                    title="Live Preview Iframe"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <img
                    src={liveUrl}
                    alt="Live Target UI"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>

              {/* Baseline Reference Mockup Layer */}
              <img
                src={baselineUrl}
                alt="Baseline Reference Mockup"
                className="od-baseline-layer"
                style={{
                  opacity,
                  mixBlendMode: blendMode,
                }}
              />
            </div>
          )}

          {/* MODE 2: SWIPE SLIDER */}
          {mode === 'swipe' && (
            <div
              className="od-swipe-container"
              ref={swipeContainerRef}
              onMouseDown={onSwipeMouseDown}
              onTouchStart={onSwipeTouchStart}
            >
              <div className="od-swipe-badge od-badge-left">Mockup ({Math.round(swipePos)}%)</div>
              <div className="od-swipe-badge od-badge-right">Live ({Math.round(100 - swipePos)}%)</div>

              {/* Baseline Layer (Clipped) */}
              <div
                className="od-swipe-baseline"
                style={{
                  clipPath: `inset(0 ${100 - swipePos}% 0 0)`,
                }}
              >
                <img src={baselineUrl} alt="Baseline Mockup" />
              </div>

              {/* Live Layer */}
              <div className="od-swipe-live">
                {liveNode ? (
                  liveNode
                ) : liveUrl.startsWith('http') && !liveUrl.match(/\.(jpeg|jpg|gif|png|svg)$/) ? (
                  <iframe
                    src={liveUrl}
                    title="Live Preview"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <img src={liveUrl} alt="Live View" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                )}
              </div>

              {/* Divider Line */}
              <div className="od-swipe-divider" style={{ left: `${swipePos}%` }}>
                <div className="od-swipe-handle">↔</div>
              </div>
            </div>
          )}

          {/* MODE 3: SPLIT SIDE-BY-SIDE */}
          {mode === 'split' && (
            <div className="od-split-container">
              {/* Left Panel: Mockup */}
              <div className="od-split-panel">
                <div className="od-split-header">
                  <span>📐 Mockup Baseline Reference</span>
                </div>
                <div className="od-split-content">
                  <img src={baselineUrl} alt="Mockup Baseline" />
                </div>
              </div>

              {/* Right Panel: Live Target */}
              <div className="od-split-panel">
                <div className="od-split-header">
                  <span>⚡ Live Active Build</span>
                </div>
                <div className="od-split-content">
                  {liveNode ? (
                    liveNode
                  ) : liveUrl.startsWith('http') && !liveUrl.match(/\.(jpeg|jpg|gif|png|svg)$/) ? (
                    <iframe
                      src={liveUrl}
                      title="Live Target"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  ) : (
                    <img src={liveUrl} alt="Live Target" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODE 4: DIFFERENCE CANVAS ENGINE */}
          {mode === 'difference' && (
            <div className="od-diff-canvas-wrapper">
              <canvas ref={diffCanvasRef} className="od-diff-canvas" />
            </div>
          )}
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="od-footer-bar">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="od-stat-chip">
            Viewport: {viewportWidth}px × {isLandscape ? activeHeight : viewportWidth}px
          </span>
          {scaleFactor < 1 && (
            <span className="od-stat-chip od-chip-warning">
              Scale: {Math.round(scaleFactor * 100)}% (Auto-Fit)
            </span>
          )}
          <span className="od-stat-chip">Mode: {mode.toUpperCase()}</span>
        </div>

        {mode === 'difference' && diffStats.isDiffCalculated && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="od-stat-chip">
              Mismatch Pixels: {diffStats.mismatchPixels.toLocaleString()} / {diffStats.totalPixels.toLocaleString()}
            </span>
            <span
              className={`od-stat-chip ${
                diffStats.mismatchPercentage === 0
                  ? 'od-chip-success'
                  : diffStats.mismatchPercentage < 2
                  ? 'od-chip-warning'
                  : 'od-chip-alert'
              }`}
            >
              Regression Discrepancy: {diffStats.mismatchPercentage}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverlayDiff;
