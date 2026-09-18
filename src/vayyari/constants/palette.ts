export type SwatchTemplateType =
  | 'solid'
  | 'contrast-border'
  | 'multi-tone'
  | 'multi-shade'
  | 'multicolor'
  // Backwards compatibility aliases:
  | 'dual-tone'
  | 'half-and-half';

// ---------------------------------------------------------------------------
// 32-Anchor Perceptually-Uniform Palette
// Anchors defined in Oklch space; hex values are closest sRGB approximations.
// Classification uses Delta E CIE2000 in CIELAB/Oklab space — NOT RGB Euclidean.
// Groups: Neutrals · Reds & Pinks · Oranges & Yellows · Greens · Blues & Teals
//         Purples · Metallics · Special
// ---------------------------------------------------------------------------
export type StandardColorName =
  // Neutrals
  | 'Pure White'       // oklch(0.99 0.00 0.0)
  | 'Cream Beige'      // oklch(0.93 0.05 85.0)
  | 'Sand Tan'         // oklch(0.79 0.09 76.0)
  | 'Taupe Brown'      // oklch(0.44 0.08 50.0)
  | 'Charcoal'         // oklch(0.40 0.00 0.0)
  | 'Jet Black'        // oklch(0.12 0.00 0.0)
  // Reds & Pinks
  | 'Ruby Red'         // oklch(0.53 0.24 26.0)
  | 'Wine Maroon'      // oklch(0.36 0.16 16.0)
  | 'Rose Pink'        // oklch(0.66 0.18 16.0)
  | 'Blush Pink'       // oklch(0.86 0.08 22.0)
  | 'Coral Salmon'     // oklch(0.70 0.16 41.0)
  | 'Magenta'          // oklch(0.56 0.27 345.0)
  // Oranges & Yellows
  | 'Rust Burnt'       // oklch(0.49 0.15 46.0)
  | 'Tangerine'        // oklch(0.69 0.21 56.0)
  | 'Mustard'          // oklch(0.73 0.14 81.0)
  | 'Pastel Lemon'     // oklch(0.91 0.09 96.0)
  // Greens
  | 'Olive Khaki'      // oklch(0.55 0.09 111.0)
  | 'Mint Seafoam'     // oklch(0.87 0.08 152.0)
  | 'Emerald'          // oklch(0.59 0.19 146.0)
  | 'Lime Moss'        // oklch(0.77 0.17 131.0)
  // Blues & Teals
  | 'Powder Blue'      // oklch(0.85 0.06 222.0)
  | 'Turquoise'        // oklch(0.71 0.14 196.0)
  | 'Teal Peacock'     // oklch(0.49 0.11 202.0)
  | 'Royal Blue'       // oklch(0.46 0.23 262.0)
  | 'Navy Blue'        // oklch(0.29 0.09 272.0)
  // Purples
  | 'Lavender'         // oklch(0.81 0.07 302.0)
  | 'Violet Plum'      // oklch(0.45 0.16 312.0)
  // Metallics
  | 'Antique Gold'     // oklch(0.75 0.10 83.0) — Zari, Brass
  | 'Rose Gold'        // oklch(0.73 0.08 46.0) — Coppery Bronze-Gold
  | 'Silver'           // oklch(0.81 0.00 0.0)  — Platinum
  // Special classifier
  | 'Multicolor';      // Gradient placeholder — Bandhani, digital prints, patchwork

export const STANDARD_PALETTE: Record<StandardColorName, string> = {
  // ── Neutrals ──────────────────────────────────────────────────────────────
  'Pure White':    '#FCFCFA',   // oklch(0.99 0.00 0.0)   Pristine white, ivory
  'Cream Beige':   '#EDE8D5',   // oklch(0.93 0.05 85.0)  Creams, off-white, linen
  'Sand Tan':      '#C8B07A',   // oklch(0.79 0.09 76.0)  Fawn, warm khaki, sand
  'Taupe Brown':   '#6B4E3D',   // oklch(0.44 0.08 50.0)  Coffee, chocolate, earth
  'Charcoal':      '#595959',   // oklch(0.40 0.00 0.0)   Slate, dark grey, graphite
  'Jet Black':     '#1A1A1A',   // oklch(0.12 0.00 0.0)   True black, obsidian

  // ── Reds & Pinks ──────────────────────────────────────────────────────────
  'Ruby Red':      '#C0392B',   // oklch(0.53 0.24 26.0)  Crimson, scarlet, primary red
  'Wine Maroon':   '#722B2B',   // oklch(0.36 0.16 16.0)  Burgundy, oxblood, deep wine
  'Rose Pink':     '#D4607C',   // oklch(0.66 0.18 16.0)  Traditional darker pink, rose
  'Blush Pink':    '#F0C8C4',   // oklch(0.86 0.08 22.0)  Baby pink, pastel rose
  'Coral Salmon':  '#E07A5C',   // oklch(0.70 0.16 41.0)  Living coral, salmon
  'Magenta':       '#CC2D72',   // oklch(0.56 0.27 345.0) Fuchsia, hot neon pink

  // ── Oranges & Yellows ─────────────────────────────────────────────────────
  'Rust Burnt':    '#A0522D',   // oklch(0.49 0.15 46.0)  Terracotta, deep copper, rust
  'Tangerine':     '#E8832A',   // oklch(0.69 0.21 56.0)  Vibrant orange, marigold
  'Mustard':       '#C9A227',   // oklch(0.73 0.14 81.0)  Ochre, warm Indian yellow
  'Pastel Lemon':  '#E8E084',   // oklch(0.91 0.09 96.0)  Butter yellow, chiffon, straw

  // ── Greens ────────────────────────────────────────────────────────────────
  'Olive Khaki':   '#6B7C3A',   // oklch(0.55 0.09 111.0) Sage, army green, dark olive
  'Mint Seafoam':  '#B4E0C8',   // oklch(0.87 0.08 152.0) Mint, light pistachio
  'Emerald':       '#1E8C4E',   // oklch(0.59 0.19 146.0) Deep bottle green, emerald
  'Lime Moss':     '#7AB82A',   // oklch(0.77 0.17 131.0) Chartreuse, bright moss green

  // ── Blues & Teals ─────────────────────────────────────────────────────────
  'Powder Blue':   '#B8D4E8',   // oklch(0.85 0.06 222.0) Ice blue, pale sky
  'Turquoise':     '#38B4B4',   // oklch(0.71 0.14 196.0) Aquamarine, clear cyan
  'Teal Peacock':  '#1A7A7A',   // oklch(0.49 0.11 202.0) Deep teal, peacock blue
  'Royal Blue':    '#2035C0',   // oklch(0.46 0.23 262.0) Cobalt, deep electric blue
  'Navy Blue':     '#1A2875',   // oklch(0.29 0.09 272.0) Midnight blue, indigo

  // ── Purples ───────────────────────────────────────────────────────────────
  'Lavender':      '#C8B0E0',   // oklch(0.81 0.07 302.0) Lilac, orchid, soft purple
  'Violet Plum':   '#7A2E8C',   // oklch(0.45 0.16 312.0) Eggplant, deep violet, grape

  // ── Metallics ─────────────────────────────────────────────────────────────
  'Antique Gold':  '#C4A43A',   // oklch(0.75 0.10 83.0)  Dull gold, brass, zari accents
  'Rose Gold':     '#C49678',   // oklch(0.73 0.08 46.0)  Soft coppery bronze-gold tones
  'Silver':        '#B8B8B8',   // oklch(0.81 0.00 0.0)   Muted grey metallics, platinum

  // ── Special ───────────────────────────────────────────────────────────────
  'Multicolor':    '#E91E63',   // Gradient placeholder — assigned manually by reviewer
};

export const STANDARD_COLOR_NAMES = Object.keys(STANDARD_PALETTE) as StandardColorName[];

// ---------------------------------------------------------------------------
// Static 16-Color Palette for 4x4 Multicolor Grid Swatch
// ---------------------------------------------------------------------------
export const STATIC_MULTICOLOR_PALETTE: readonly string[] = [
  '#C62828', // Row 1, Col 1: Ruby Red
  '#E65100', // Row 1, Col 2: Tangerine
  '#FBC02D', // Row 1, Col 3: Mustard
  '#827717', // Row 1, Col 4: Lime Moss
  '#2E7D32', // Row 2, Col 1: Emerald Green
  '#00695C', // Row 2, Col 2: Teal Peacock
  '#00838F', // Row 2, Col 3: Turquoise
  '#0277BD', // Row 2, Col 4: Powder Blue
  '#1565C0', // Row 3, Col 1: Royal Blue
  '#283593', // Row 3, Col 2: Indigo
  '#6A1B9A', // Row 3, Col 3: Violet Plum
  '#AD1457', // Row 3, Col 4: Magenta
  '#D81B60', // Row 4, Col 1: Rose Pink
  '#BF360C', // Row 4, Col 2: Rust Burnt
  '#D4AF37', // Row 4, Col 3: Antique Gold
  '#37474F', // Row 4, Col 4: Charcoal Slate
];

// Resolve hex or standard palette name
export function resolveColorHex(color: string): string {
  if (color in STANDARD_PALETTE) {
    return STANDARD_PALETTE[color as StandardColorName];
  }
  return color;
}
