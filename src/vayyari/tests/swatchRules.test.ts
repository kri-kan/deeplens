import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  getSlotLimits,
  getInitialSlotColors,
  resolveColorName,
  discardColorGroup,
  FALLBACK_PALETTE,
} from '../utils/swatchRules';
import { resolveColorHex, STANDARD_PALETTE } from '../constants/palette';
import { StoreColorGroup, ExtractedColorCentroid } from '../components/tamagui-ui/organisms/StoreCuration/types';

describe('Swatch Rules & Template Limit Validation', () => {
  test('solid template enforces exactly 1 fixed slot', () => {
    const limits = getSlotLimits('solid');
    assert.strictEqual(limits.min, 1);
    assert.strictEqual(limits.max, 1);
    assert.strictEqual(limits.fixed, true);
    assert.strictEqual(limits.name, 'Solid');
  });

  test('contrast-border template enforces exactly 2 fixed slots (Body & Border)', () => {
    const limits = getSlotLimits('contrast-border');
    assert.strictEqual(limits.min, 2);
    assert.strictEqual(limits.max, 2);
    assert.strictEqual(limits.fixed, true);
    assert.strictEqual(limits.name, 'Contrast Border');
  });

  test('multi-tone template supports 2 to 4 variable slots for smooth gradient stops', () => {
    const limits = getSlotLimits('multi-tone');
    assert.strictEqual(limits.min, 2);
    assert.strictEqual(limits.max, 4);
    assert.strictEqual(limits.fixed, false);
    assert.strictEqual(limits.name, 'Gradient');

    // Backwards compatibility alias
    const aliasLimits = getSlotLimits('dual-tone');
    assert.strictEqual(aliasLimits.min, 2);
    assert.strictEqual(aliasLimits.max, 4);
  });

  test('multi-shade template supports 2 to 4 variable slots for split wedges', () => {
    const limits = getSlotLimits('multi-shade');
    assert.strictEqual(limits.min, 2);
    assert.strictEqual(limits.max, 4);
    assert.strictEqual(limits.fixed, false);
    assert.strictEqual(limits.name, 'Split Shade');

    // Backwards compatibility alias
    const aliasLimits = getSlotLimits('half-and-half');
    assert.strictEqual(aliasLimits.min, 2);
    assert.strictEqual(aliasLimits.max, 4);
  });

  test('multicolor template defaults to 1 fixed slot', () => {
    const limits = getSlotLimits('multicolor');
    assert.strictEqual(limits.min, 1);
    assert.strictEqual(limits.max, 1);
    assert.strictEqual(limits.fixed, true);
  });
});

describe('getInitialSlotColors', () => {
  test('returns default colors sliced to template min when group is null', () => {
    const solid = getInitialSlotColors(null, 'solid');
    assert.strictEqual(solid.length, 1);
    assert.strictEqual(solid[0], '#1B4D3E');

    const contrast = getInitialSlotColors(null, 'contrast-border');
    assert.strictEqual(contrast.length, 2);
    assert.strictEqual(contrast[0], '#1B4D3E');
    assert.strictEqual(contrast[1], '#D4AF37');
  });

  test('pads missing slots with fallback palette if group has fewer colors than min', () => {
    const group: StoreColorGroup = {
      id: 'g1',
      name: 'Single Color Group',
      colorwayCode: 'VF2B56-01',
      template: 'contrast-border',
      slotA: '#FF0000',
    };

    const colors = getInitialSlotColors(group, 'contrast-border');
    assert.strictEqual(colors.length, 2);
    assert.strictEqual(colors[0], '#FF0000');
    assert.strictEqual(colors[1], FALLBACK_PALETTE[1]);
  });

  test('clamps colors to template max if group defines more than allowed', () => {
    const group: StoreColorGroup = {
      id: 'g2',
      name: 'Overfilled Group',
      colorwayCode: 'VF2B56-02',
      template: 'contrast-border',
      slotA: '#111111',
      colors: ['#111111', '#222222', '#333333', '#444444', '#555555'],
    };

    const colors = getInitialSlotColors(group, 'contrast-border');
    assert.strictEqual(colors.length, 2);
    assert.deepStrictEqual(colors, ['#111111', '#222222']);
  });

  test('resolves legacy slotA/slotB/slotC/slotD when colors array is not present', () => {
    const group: StoreColorGroup = {
      id: 'g3',
      name: 'Legacy Slots',
      colorwayCode: 'VF2B56-03',
      template: 'multi-tone',
      slotA: '#AAAAAA',
      slotB: '#BBBBBB',
      slotC: '#CCCCCC',
      colorCount: 3,
    };

    const colors = getInitialSlotColors(group, 'multi-tone');
    assert.strictEqual(colors.length, 3);
    assert.deepStrictEqual(colors, ['#AAAAAA', '#BBBBBB', '#CCCCCC']);
  });
});

describe('resolveColorName & resolveColorHex', () => {
  test('resolves from photo extracted centroids with highest priority', () => {
    const centroids: ExtractedColorCentroid[] = [
      { hex: '#c0392b', name: 'Handloom Scarlet', percentage: 45 },
    ];
    const resolved = resolveColorName('#C0392B', centroids);
    assert.strictEqual(resolved, 'Handloom Scarlet');
  });

  test('resolves standard color names from STANDARD_PALETTE when no photo centroid matches', () => {
    const emeraldHex = STANDARD_PALETTE['Emerald'];
    const resolved = resolveColorName(emeraldHex);
    assert.strictEqual(resolved, 'Emerald');
  });

  test('falls back to uppercase hex if color name is unknown', () => {
    const resolved = resolveColorName('#abcdef');
    assert.strictEqual(resolved, '#ABCDEF');
  });

  test('resolveColorHex maps standard color name to corresponding hex', () => {
    assert.strictEqual(resolveColorHex('Ruby Red'), '#C0392B');
    assert.strictEqual(resolveColorHex('Navy Blue'), '#1A2875');
    assert.strictEqual(resolveColorHex('#123456'), '#123456');
  });
});

describe('discardColorGroup', () => {
  test('discards specified color group by id and decrements count', () => {
    const groups: StoreColorGroup[] = [
      { id: 'cg-1', name: 'Color 1', colorwayCode: 'C1', template: 'solid', slotA: '#111' },
      { id: 'cg-2', name: 'Color 2', colorwayCode: 'C2', template: 'solid', slotA: '#222' },
      { id: 'cg-3', name: 'Color 3', colorwayCode: 'C3', template: 'solid', slotA: '#333' },
    ];
    const updated = discardColorGroup(groups, 'cg-2');
    assert.strictEqual(updated.length, 2);
    assert.deepStrictEqual(updated.map((g) => g.id), ['cg-1', 'cg-3']);
  });

  test('refuses to discard if only 1 color group remains (minimum 1 rule)', () => {
    const singleGroup: StoreColorGroup[] = [
      { id: 'cg-1', name: 'Solo Color', colorwayCode: 'C1', template: 'solid', slotA: '#111' },
    ];
    const updated = discardColorGroup(singleGroup, 'cg-1');
    assert.strictEqual(updated.length, 1);
    assert.strictEqual(updated[0].id, 'cg-1');
  });
});
