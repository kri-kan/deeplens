import {
  SwatchTemplateType,
  STANDARD_PALETTE,
} from '../constants/palette';
import { StoreColorGroup, ExtractedColorCentroid } from '../components/tamagui-ui/organisms/StoreCuration/types';

export const FALLBACK_PALETTE: readonly string[] = [
  '#1B4D3E', // Emerald
  '#D4AF37', // Antique Gold
  '#C0392B', // Ruby Red
  '#1A2875', // Navy Blue
  '#E91E63', // Magenta / Rani Pink
  '#6B7C3A', // Olive Khaki
  '#38B4B4', // Turquoise
  '#E07A5C', // Coral Salmon
  '#7A2E8C', // Violet Plum
];

export interface SwatchSlotLimits {
  min: number;
  max: number;
  fixed: boolean;
  name: string;
}

/**
 * Get slot count limits strictly based on swatch template type
 * - solid: exactly 1 slot (fixed)
 * - contrast-border: exactly 2 slots (Body + Border, fixed)
 * - multi-tone / dual-tone: 2 to 4 color stops (variable)
 * - multi-shade / half-and-half: 2 to 4 split wedges (variable)
 * - multicolor: pattern mosaic (fixed 1)
 */
export function getSlotLimits(template: SwatchTemplateType): SwatchSlotLimits {
  switch (template) {
    case 'solid':
      return { min: 1, max: 1, fixed: true, name: 'Solid' };
    case 'contrast-border':
      return { min: 2, max: 2, fixed: true, name: 'Contrast Border' };
    case 'multi-tone':
    case 'dual-tone':
      return { min: 2, max: 4, fixed: false, name: 'Gradient' };
    case 'multi-shade':
    case 'half-and-half':
      return { min: 2, max: 4, fixed: false, name: 'Split Shade' };
    case 'multicolor':
    default:
      return { min: 1, max: 1, fixed: true, name: 'Multicolor' };
  }
}

/**
 * Extract or generate initial array of slot colors strictly limited by the template limits
 */
export function getInitialSlotColors(
  group: StoreColorGroup | null,
  template: SwatchTemplateType,
  overrideCount?: number
): string[] {
  const limits = getSlotLimits(template);
  if (!group) {
    const defaultColors = ['#1B4D3E', '#D4AF37', '#C0392B', '#1A2875'];
    return defaultColors.slice(0, limits.min);
  }

  // 1. Collect defined individual slots or existing colors
  let collected: string[] = [];
  if (group.colors && group.colors.length > 0) {
    collected = [...group.colors];
  } else {
    collected = [group.slotA || '#1B4D3E'];
    if (group.slotB) collected.push(group.slotB);
    if (group.slotC) collected.push(group.slotC);
    if (group.slotD) collected.push(group.slotD);
  }

  // 2. Determine target slot count bounded strictly by template min & max
  let desired = overrideCount || (limits.fixed ? limits.min : group.colorCount || collected.length);
  desired = Math.min(Math.max(desired, limits.min), limits.max);

  while (collected.length < desired) {
    collected.push(FALLBACK_PALETTE[collected.length % FALLBACK_PALETTE.length]);
  }

  return collected.slice(0, desired);
}

/**
 * Resolve friendly display name for any given hex code from photo centroids or standard palette
 */
export function resolveColorName(
  hex: string,
  extractedColors: ExtractedColorCentroid[] = []
): string {
  if (!hex) return '';
  const clean = hex.trim().toLowerCase();

  // 1. Check extracted colors
  const matchedExtracted = extractedColors.find(
    (c) => c.hex.toLowerCase() === clean
  );
  if (matchedExtracted && matchedExtracted.name) {
    return matchedExtracted.name;
  }

  // 2. Check STANDARD_PALETTE
  const matchedPalette = Object.entries(STANDARD_PALETTE).find(
    ([_, val]) => val.toLowerCase() === clean
  );
  if (matchedPalette) {
    return matchedPalette[0];
  }

  return hex.toUpperCase();
}

/**
 * Discards a color group by ID and returns the updated array.
 * Enforces a minimum of 1 color group.
 */
export function discardColorGroup(
  colorGroups: StoreColorGroup[],
  discardId: string
): StoreColorGroup[] {
  if (colorGroups.length <= 1) return colorGroups;
  return colorGroups.filter((g) => g.id !== discardId);
}
