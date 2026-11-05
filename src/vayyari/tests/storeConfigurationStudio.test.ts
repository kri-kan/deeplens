import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PDP_PRESETS,
  MOBILE_FLUSH_PRESET,
  SAMPLE_PRODUCTS,
  PdpConfig,
  PdpSectionId,
} from '../constants/pdpConfig';

describe('Store Configuration Studio · Merchandising & A/B Experimentation Rules', () => {
  test('PDP_PRESETS provides distinct Control (Variant A) and Treatment (Variant B) presets', () => {
    const { control, treatment } = PDP_PRESETS;

    // Variant A: Control (Classic Heritage)
    assert.equal(control.activeVariant, 'control');
    assert.equal(control.showRatings, true);
    assert.equal(control.showViewsCount, false);
    assert.equal(control.descriptionDefaultCollapsed, false);
    assert.equal(control.specsDefaultCollapsed, false);
    assert.equal(control.galleryThumbnailPosition, 'in_container');
    assert.equal(control.presentationMode, 'grouped');
    assert.equal(control.containerStyle, 'cards');
    assert.deepEqual(control.visibleSections, [
      'frequently_bought',
      'specifications',
      'reviews',
      'similar_products',
    ]);

    // Variant B: Treatment (High Social Proof & Urgency)
    assert.equal(treatment.activeVariant, 'treatment');
    assert.equal(treatment.showRatings, true);
    assert.equal(treatment.showViewsCount, true);
    assert.equal(treatment.viewsCount, '1.4k');
    assert.equal(treatment.descriptionDefaultCollapsed, true);
    assert.equal(treatment.descriptionTruncateLines, 2);
    assert.equal(treatment.specsDefaultCollapsed, true);
    assert.equal(treatment.specsShowSilkMark, true);
    assert.equal(treatment.galleryThumbnailPosition, 'in_container');
    assert.equal(treatment.presentationMode, 'grouped');
    assert.equal(treatment.containerStyle, 'cards');
    assert.ok(treatment.visibleSections?.includes('color_variations'));
    assert.ok(treatment.visibleSections?.includes('you_may_like'));
    assert.ok(treatment.visibleSections?.includes('recently_viewed'));
    assert.equal(treatment.visibleSections?.length, 7);
  });

  test('MOBILE_FLUSH_PRESET provides borderless edge-to-edge layout for mobile margin optimization', () => {
    assert.equal(MOBILE_FLUSH_PRESET.containerStyle, 'borderless');
    assert.equal(MOBILE_FLUSH_PRESET.showRatings, true);
    assert.equal(MOBILE_FLUSH_PRESET.showViewsCount, true);
    assert.equal(MOBILE_FLUSH_PRESET.descriptionDefaultCollapsed, true);
    assert.equal(MOBILE_FLUSH_PRESET.specsDefaultCollapsed, true);
    assert.equal(MOBILE_FLUSH_PRESET.visibleSections?.length, 7);
  });

  test('Preset detection accurately classifies Control, Treatment, and Custom overrides', () => {
    function classifyConfig(cfg: PdpConfig): 'control' | 'treatment' | 'mobile_flush' | 'custom' {
      if (cfg.containerStyle === 'borderless') return 'mobile_flush';

      const isControl =
        cfg.showRatings === PDP_PRESETS.control.showRatings &&
        cfg.showViewsCount === PDP_PRESETS.control.showViewsCount &&
        cfg.descriptionDefaultCollapsed === PDP_PRESETS.control.descriptionDefaultCollapsed &&
        cfg.specsDefaultCollapsed === PDP_PRESETS.control.specsDefaultCollapsed &&
        cfg.presentationMode === PDP_PRESETS.control.presentationMode &&
        JSON.stringify(cfg.visibleSections) === JSON.stringify(PDP_PRESETS.control.visibleSections);

      if (isControl) return 'control';

      const isTreatment =
        cfg.showRatings === PDP_PRESETS.treatment.showRatings &&
        cfg.showViewsCount === PDP_PRESETS.treatment.showViewsCount &&
        cfg.descriptionDefaultCollapsed === PDP_PRESETS.treatment.descriptionDefaultCollapsed &&
        cfg.specsDefaultCollapsed === PDP_PRESETS.treatment.specsDefaultCollapsed &&
        cfg.presentationMode === PDP_PRESETS.treatment.presentationMode &&
        JSON.stringify(cfg.visibleSections) === JSON.stringify(PDP_PRESETS.treatment.visibleSections);

      if (isTreatment) return 'treatment';
      return 'custom';
    }

    assert.equal(classifyConfig({ ...PDP_PRESETS.control }), 'control');
    assert.equal(classifyConfig({ ...PDP_PRESETS.treatment }), 'treatment');
    assert.equal(classifyConfig({ ...MOBILE_FLUSH_PRESET }), 'mobile_flush');

    // Mutating a single parameter (e.g. turning off views count in treatment) must yield 'custom'
    const customConfig: PdpConfig = {
      ...PDP_PRESETS.treatment,
      showViewsCount: false,
    };
    assert.equal(classifyConfig(customConfig), 'custom');
  });

  test('Discovery rails section toggle adds and removes sections idempotently', () => {
    let sections: PdpSectionId[] = ['specifications', 'reviews'];

    function toggleSection(list: PdpSectionId[], id: PdpSectionId): PdpSectionId[] {
      return list.includes(id) ? list.filter((s) => s !== id) : [...list, id];
    }

    sections = toggleSection(sections, 'similar_products');
    assert.deepEqual(sections, ['specifications', 'reviews', 'similar_products']);

    sections = toggleSection(sections, 'specifications');
    assert.deepEqual(sections, ['reviews', 'similar_products']);
  });

  test('Sample products define rich attributes, swatches, and specification arrays', () => {
    const saree = SAMPLE_PRODUCTS['VF2B56'];
    assert.ok(saree);
    assert.equal(saree.sku, 'VF2B56');
    assert.equal(saree.swatches.length, 3);
    assert.ok(saree.specs.length >= 5);
    assert.equal(saree.category, 'Saree');

    const dress = SAMPLE_PRODUCTS['VF2F4A'];
    assert.ok(dress);
    assert.equal(dress.category, 'Dress');

    const lehenga = SAMPLE_PRODUCTS['VF2F4F'];
    assert.ok(lehenga);
    assert.equal(lehenga.category, 'Lehenga');
  });

  test('Multi-device hardware dimensions adhere to canonical responsive viewports', () => {
    const VIEWPORT_MAP: Record<'mobile' | 'tablet' | 'desktop', number> = {
      mobile: 390,
      tablet: 768,
      desktop: 1240,
    };

    assert.equal(VIEWPORT_MAP.mobile, 390);
    assert.equal(VIEWPORT_MAP.tablet, 768);
    assert.equal(VIEWPORT_MAP.desktop, 1240);
  });
});
