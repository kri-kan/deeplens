import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TaxonomyRegistry,
  extractMultiDimensionalMetadata,
  formatUnifiedAttributesWithTaxonomy,
  TaxonomyFacet,
} from '../src/services/taxonomy-extraction.service';

const MOCK_FACETS: TaxonomyFacet[] = [
  {
    id: 'f1',
    dimension: 'fabric',
    canonical_name: 'Georgette',
    aliases: ['Micro Georgette', 'Faux Georgette', 'Fox Georgette', 'Pure Georgette', 'Soft Star Georgette'],
    usage_count: 1288,
    is_verified: true,
  },
  {
    id: 'f2',
    dimension: 'fabric',
    canonical_name: 'Pure Katan Silk',
    aliases: ['Katan Silk', 'Katan', 'Pure Katan', 'Banarasi Katan'],
    usage_count: 310,
    is_verified: true,
  },
  {
    id: 'f3',
    dimension: 'fabric',
    canonical_name: 'Silk',
    aliases: ['Pure Silk', 'Art Silk', 'Soft Silk', 'Japan Silk', 'Mono Banglory Silk'],
    usage_count: 576,
    is_verified: true,
  },
  {
    id: 'c1',
    dimension: 'craft',
    canonical_name: 'Cutwork & Scallop (Aarco)',
    aliases: ['Cutwork', 'Scallop Work', 'Aarco Work', 'Scalloped Border', 'Cutwork Scallop'],
    usage_count: 95,
    is_verified: true,
  },
  {
    id: 'c2',
    dimension: 'craft',
    canonical_name: 'Ajrakh Block Print',
    aliases: ['Ajrakh', 'Ajrak', 'Ajarakh Print', 'Ajrakh Print'],
    usage_count: 193,
    is_verified: true,
  },
  {
    id: 'e1',
    dimension: 'embellishment',
    canonical_name: 'Mirror Work (Real & Foil)',
    aliases: ['Mirror Work', 'Real Mirror', 'Foil Mirror'],
    usage_count: 551,
    is_verified: true,
  },
  {
    id: 'b1',
    dimension: 'border',
    canonical_name: 'Cutwork Scallop Border',
    aliases: ['Scallop Border', 'Cutwork Border', 'Aarco Border'],
    usage_count: 140,
    is_verified: true,
  },
  {
    id: 'b2',
    dimension: 'border',
    canonical_name: 'Tassels / Latkan Attached Pallu',
    aliases: ['Tassel Pallu', 'Latkan Pallu', 'Latkab in Border', 'Latkan in Border'],
    usage_count: 235,
    is_verified: true,
  },
  {
    id: 'bl1',
    dimension: 'blouse',
    canonical_name: 'Unstitched Contrast Blouse',
    aliases: ['Contrast Blouse', 'Contrast Blouse Piece', 'Separate Contrast Blouse'],
    usage_count: 820,
    is_verified: true,
  },
  {
    id: 'bl2',
    dimension: 'blouse',
    canonical_name: 'Pre-Stitched Designer Blouse',
    aliases: ['Ready Blouse', 'Readymade Blouse', 'Stitched Designer Blouse', 'Padded Blouse'],
    usage_count: 340,
    is_verified: true,
  },
  {
    id: 's1',
    dimension: 'stitch',
    canonical_name: 'Unstitched Saree + Blouse',
    aliases: ['Unstitched', 'Saree with Blouse Piece', '5.5m + 0.8m Blouse'],
    usage_count: 2850,
    is_verified: true,
  },
  {
    id: 's2',
    dimension: 'stitch',
    canonical_name: 'Pre-Stitched / Ready to Wear',
    aliases: ['Ready to Wear', '1-Minute Saree', 'Pre-Pleated Saree', 'Pre-Stitched'],
    usage_count: 420,
    is_verified: true,
  },
  {
    id: 'o1',
    dimension: 'occasion',
    canonical_name: 'Wedding & Bridal Trousseau',
    aliases: ['Wedding', 'Bridal', 'Shaadi Wear', 'Trousseau'],
    usage_count: 780,
    is_verified: true,
  },
  {
    id: 'o2',
    dimension: 'occasion',
    canonical_name: 'Party & Cocktail Wear',
    aliases: ['Party Wear', 'Cocktail', 'Evening Party'],
    usage_count: 410,
    is_verified: true,
  },
];

describe('Multi-Dimensional Taxonomy Extraction Engine', () => {
  const registry = new TaxonomyRegistry(MOCK_FACETS);

  it('extracts multi-dimensional attributes from structured WhatsApp listing', () => {
    const rawText = `
*Party Wear Soft Star Georgette Saree*
Looking some one for this same padding colour beautiful Saree for wedding on premium Soft Star Georgette fabric with Embroidery cut Work aarco Border With mono banglory silk Work blouse Peice.

*🥻🥻 Saree 🥻🥻*
Fabric.     :- Soft Star Georgette
Work        :- Embroidery Cutwork work aarco border
Cut           :- 5.5 mtr

*👚👚 Blouse 👚👚*
Fabric.     :- Mono Banglory Silk
Work        :- Embroidery 
Cut.          :- 1.10 mtr (Un-stitch)
 
No of clrs: 03
Price : 1099+ship
    `;

    const extracted = extractMultiDimensionalMetadata(rawText, null, registry);

    assert.strictEqual(extracted.fabric_base, 'Georgette', 'Fabric base should be Georgette');
    assert.strictEqual(extracted.border_pallu, 'Cutwork Scallop Border', 'Border should match Cutwork Scallop Border');
    assert.ok(extracted.craft_techniques.includes('Cutwork & Scallop (Aarco)'), 'Crafts should include Cutwork');
    assert.ok(extracted.occasions.includes('Party & Cocktail Wear') || extracted.occasions.includes('Wedding & Bridal Trousseau'), 'Occasions should match wedding or party');
    assert.strictEqual(extracted.dimensions.saree_length_m, 5.5, 'Saree cut should be 5.5m');
    assert.strictEqual(extracted.dimensions.blouse_length_m, 1.1, 'Blouse cut should be 1.1m');
    assert.strictEqual(extracted.base_stitch_type, 'Unstitched', 'Base stitch should be Unstitched');
  });

  it('extracts craft and embellishment from unformatted product description', () => {
    const rawText = `
🌸 Fresh Arrival – ajarakh print with real mirror work 🌸
✨ Premium japan silk fabric with ajarakh print with real mirror work in all over sarees latkab in border nd negative print blouse with real mirror work
💖 Price – ₹750+$
    `;

    const extracted = extractMultiDimensionalMetadata(rawText, null, registry);

    assert.strictEqual(extracted.fabric_base, 'Silk', 'Fabric should resolve to Silk');
    assert.ok(extracted.craft_techniques.includes('Ajrakh Block Print'), 'Should extract Ajrakh Print');
    assert.ok(extracted.craft_techniques.includes('Mirror Work (Real & Foil)'), 'Should extract Mirror Work');
    assert.strictEqual(extracted.border_pallu, 'Tassels / Latkan Attached Pallu', 'Should match Latkan attached pallu');
  });

  it('correctly merges into unified_attributes', () => {
    const existingUa = {
      price: 1199,
      is_plus_shipping: true,
      color: 'Peach',
    };

    const extracted = extractMultiDimensionalMetadata(
      'Ready to wear 1-minute saree pure katan silk wedding wear',
      existingUa,
      registry
    );

    const merged = formatUnifiedAttributesWithTaxonomy(existingUa, extracted);

    assert.strictEqual(merged.price, 1199, 'Original price preserved');
    assert.strictEqual(merged.color, 'Peach', 'Original color preserved');
    assert.strictEqual(merged.fabric_base, 'Pure Katan Silk', 'Fabric base populated');
    assert.strictEqual(merged.stitch_type, 'Pre-Stitched / Ready to Wear', 'Stitch type set to Ready to Wear');
    assert.ok(merged.occasions.includes('Wedding & Bridal Trousseau'), 'Occasion contains Wedding');
    assert.strictEqual(merged.taxonomy_version, '2.0', 'Taxonomy version marked');
    assert.ok(merged.taxonomy_derived_at, 'Derived at timestamp exists');
  });

  it('extracts dimensions including flare and bust size', () => {
    const rawText = `
Semi-Stitched Heavy Bridal Lehenga with 3.5 mtr flair
Stitched blouse up to 40 bust with heavy moti sequins work
    `;

    const extracted = extractMultiDimensionalMetadata(rawText, null, registry);

    assert.strictEqual(extracted.dimensions.flare_m, 3.5, 'Flare should be 3.5m');
    assert.strictEqual(extracted.dimensions.size_bust_in, 40, 'Bust size should be 40');
    assert.strictEqual(extracted.base_stitch_type, 'Semi-Stitched', 'Stitch type should be Semi-Stitched');
  });

  it('synthesizes search tags without duplicates', () => {
    const rawText = `
Soft Star Georgette Saree with embroidery cut work aarco border
Cut 5.5 mtr wedding party wear
    `;

    const extracted = extractMultiDimensionalMetadata(rawText, null, registry);

    assert.ok(extracted.tags.includes('georgette'));
    assert.ok(extracted.tags.includes('cutwork scallop border'));
    // Verify all tags are lowercased
    for (const tag of extracted.tags) {
      assert.strictEqual(tag, tag.toLowerCase(), `Tag ${tag} should be lowercased`);
    }
  });
});
