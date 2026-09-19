/**
 * Comprehensive Ethnic Fashion & Store Curation Taxonomy Constants
 * 
 * Authentic census options derived from 229k WhatsApp messages & 11k catalog products.
 * 
 * Powers:
 * 1. Store Product Curation Metadata Editor (StoreProductEnrichmentSection)
 * 2. Storefront PDP Specifications Panel (SpecificationsPanel & SpecificationRow)
 * 3. Storefront Filter Drawer & Faceted Search (FilterDrawer & CatalogFilterDrawer)
 * 4. DeepLens Multimodal Vector & Relevance Search
 */

export interface TaxonomyOption {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  category?: 'saree' | 'blouse' | 'dress' | 'lehenga' | 'all';
  isCustom?: boolean;
}

// ── 1. FABRIC TAXONOMY (Authentic Census) ──────────────────────────────────────
export const ETHNIC_FABRIC_OPTIONS: TaxonomyOption[] = [
  { id: 'pure_katan_silk', label: 'Pure Katan Silk', description: 'Handloom warp & weft twisted pure mulberry silk with rich lustrous drape', badge: 'Handloom' },
  { id: 'banarasi_brocade', label: 'Banarasi Brocade Silk', description: 'Opulent jacquard silk woven with gold and silver zari relief patterns', badge: 'Heritage' },
  { id: 'dola_silk', label: 'Dola Silk', description: 'Ultra-soft, fluid silk blend with heavy fall and brilliant sheen for festive wear', badge: 'Popular' },
  { id: 'viscose_georgette', label: 'Viscose Georgette', description: 'Premium breathable cellulosic georgette with graceful flow and soft hand-feel' },
  { id: 'georgette_crepe', label: 'Pure Silk Georgette Crepe', description: 'Fluid, crinkled drape with lightweight bounce and modern elegance' },
  { id: 'pure_organza_silk', label: 'Pure Organza Silk', description: 'Crisp, lightweight sheer silk with structured silhouette and translucent sheen' },
  { id: 'chanderi_silk_cotton', label: 'Chanderi Silk Cotton', description: 'Finely woven handloom blend featuring sheer texture and glossy finish', badge: 'Handloom' },
  { id: 'soft_linen', label: 'Soft Linen / Spun Linen', description: 'Breathable artisanal linen with natural flax texture and breezy summer drape', badge: 'Artisanal' },
  { id: 'mul_cotton', label: 'Mul Cotton Handloom', description: 'Feather-light muslin weave providing cloud-soft everyday comfort' },
  { id: 'pure_tussar_silk', label: 'Pure Tussar Silk (Kosa)', description: 'Textured wild silk renowned for natural golden sheen and rich porosity' },
  { id: 'satin_silk', label: 'Satin Silk / Opulent Satin', description: 'Glossy, high-lustre satin weave with liquid-smooth reflective surface' },
  { id: 'vichitra_silk', label: 'Vichitra Silk', description: 'Smooth, durable synthetic silk offering rich dye uptake for vibrant prints' },
  { id: 'cotton_silk_blend', label: 'Cotton Silk Blend', description: 'Balanced combination of cotton coolness with delicate silk lustre' },
  { id: 'chinon_silk', label: 'Chinon Silk', description: 'Shimmering crinkled silk-chiffon hybrid renowned for bridal lehengas and sarees' },
  { id: 'chiffon', label: 'Pure Chiffon', description: 'Gossamer-light translucent weave with ethereal float and drape' },
  { id: 'tissue_silk', label: 'Tissue Silk', description: 'Metallic warp and fine silk weft creating radiant, mirror-like luminosity', badge: 'Trending' },
  { id: 'modal_chanderi', label: 'Modal Chanderi Blend', description: 'Soft breathable cellulosic silk blend ideal for festive daytime ceremonies' },
  { id: 'rangoli_silk', label: 'Rangoli Silk', description: 'Textured lightweight festive silk with vivid contrast print clarity' },
  { id: 'faux_georgette', label: 'Faux Georgette', description: 'Resilient crepe fabric with fine granular texture and excellent drape longevity' },
  { id: 'gajji_silk', label: 'Gajji Silk', description: 'Heavy vegetable-dyed satin-backed silk traditionally used for Kutch Bandhani' },
  { id: 'lichi_silk', label: 'Lichi Silk', description: 'Supple jacquard weave silk with soft micro-texture and festive presence' },
  { id: 'cotton_linen', label: 'Handspun Cotton Linen', description: 'Organic artisanal weave with earthy matte texture and breathable comfort' },
  { id: 'raw_silk_matka', label: 'Raw Silk / Matka', description: 'Subtle slub textured handloom silk with character and structured drape' },
  { id: 'velvet_silk', label: 'Opulent Silk Velvet', description: 'Plush, dense pile silk fabric with luminous depth for winter weddings' },
];

// ── 2. WEAVE TECHNIQUE & CRAFT TAXONOMY ─────────────────────────────────────────
export const WEAVE_TECHNIQUE_OPTIONS: TaxonomyOption[] = [
  { id: 'kadwa_pitloom', label: 'Kadwa Pitloom Weave', description: 'Authentic engraved motif where each booti is individually hand-woven without floating threads on reverse', badge: 'Master Craft' },
  { id: 'banarasi_jacquard', label: 'Banarasi Jacquard Brocade', description: 'High-density pattern weave with intricate relief zari threads', badge: 'Heritage' },
  { id: 'tanchoi_satin', label: 'Tanchoi Satin Weave', description: 'Fine multi-color warp brocade without zari, producing smooth satin finish' },
  { id: 'jamdani_shuttle', label: 'Jamdani Shuttle Weave', description: 'Supplementary weft floating technique creating gossamer floral motifs' },
  { id: 'bandhani_tie_dye', label: 'Bandhani Hand-Knotting & Tie-Dye', description: 'Traditional resist tie-dye artisanal process from Kutch/Rajasthan', badge: 'Artisanal' },
  { id: 'patola_double_ikat', label: 'Double Ikat / Patola Weave', description: 'Resist dyed warp and weft hand-aligned with geometric precision', badge: 'GI Tagged' },
  { id: 'chikankari_embroidery', label: 'Hand Chikankari Embroidery', description: 'Delicate Lucknow shadow-work and bakhiya hand needlework', badge: 'GI Tagged' },
  { id: 'meenakari_enamel', label: 'Meenakari Resham Weave', description: 'Multi-color silk thread inlay resembling colorful Rajasthani jewelry enamel' },
  { id: 'foil_digital_print', label: 'Foil & Digital Fusion Print', description: 'High-definition digital botanical prints highlighted with metallic foil accents' },
  { id: 'ajrakh_block_print', label: 'Ajrakh Hand Block Print', description: 'Ancient multi-stage resist mud printing using natural indigo and madder dyes' },
  { id: 'kalamkari_artisan', label: 'Kalamkari Handblock / Pen Craft', description: 'Mythological and floral narrative paintings using organic tamarind pen dyes' },
  { id: 'moti_sequin_handwork', label: 'Moti, Cutdana & Sequin Handwork', description: 'Dazzling dual-toned glass beads, sequins, and micro pearl embellishments' },
  { id: 'gota_patti_dori', label: 'Gota Patti & Dori Work', description: 'Artisanal gold ribbon applique stitched with corded dori needlecraft' },
  { id: 'cutwork_scallop', label: 'Cutwork & Scalloped Embroidery', description: 'Precision needle-punched cutwork borders framed with dense thread embroidery' },
];

// ── 3. CRAFT HERITAGE & REGIONAL ORIGIN ────────────────────────────────────────
export const CRAFT_ORIGIN_OPTIONS: TaxonomyOption[] = [
  { id: 'varanasi', label: 'Varanasi (Banaras), UP', description: 'Ancient spiritual weaving capital renowned for Kadwa, Katan & Kora silks', badge: 'GI Tagged' },
  { id: 'kanchipuram', label: 'Kanchipuram, Tamil Nadu', description: 'Korvai contrast border heavy silk sarees with pure gold zari', badge: 'GI Tagged' },
  { id: 'chanderi', label: 'Chanderi, Madhya Pradesh', description: 'Historical royal handlooms renowned for sheer silk-cotton weaving', badge: 'GI Tagged' },
  { id: 'paithan', label: 'Paithan, Maharashtra', description: 'Royal Maratha silk sarees with oblique square border and peacock pallu', badge: 'GI Tagged' },
  { id: 'sambalpur', label: 'Sambalpur, Odisha', description: 'Traditional tie-dye Baandha warp & weft handlooms', badge: 'GI Tagged' },
  { id: 'surat', label: 'Surat, Gujarat', description: 'India’s modern textile capital specializing in designer silks & embellishments' },
  { id: 'lucknow', label: 'Lucknow, Uttar Pradesh', description: 'Nawabi heritage center for artisanal Chikankari and Mukaish needlecraft', badge: 'GI Tagged' },
  { id: 'pochampally', label: 'Pochampally, Telangana', description: 'Geometric double-ikat weaving with traditional temple borders', badge: 'GI Tagged' },
  { id: 'kutch_jamnagar', label: 'Kutch & Jamnagar, Gujarat', description: 'Historic center for authentic micro-knotted Bandhej and Ajrakh resist prints', badge: 'Artisanal' },
  { id: 'bagru_sanganer', label: 'Bagru & Sanganer, Rajasthan', description: 'Artisan hand block printing utilizing natural vegetable dyes and wooden blocks' },
  { id: 'dharmavaram', label: 'Dharmavaram, Andhra Pradesh', description: 'Broad solid borders and gold brocade pallus woven on traditional pit looms', badge: 'GI Tagged' },
  { id: 'bhagalpur', label: 'Bhagalpur, Bihar', description: 'Renowned "Silk City" known for textured Tussar and natural Ahimsa silk' },
  { id: 'maheshwar', label: 'Maheshwar, Madhya Pradesh', description: 'Narmada riverbank handlooms famous for reversible borders and lightweight drape', badge: 'GI Tagged' },
];

// ── 4. MOTIF & PATTERN TAXONOMY ────────────────────────────────────────────────
export const MOTIF_PATTERN_OPTIONS: TaxonomyOption[] = [
  { id: 'kadwa_floral_booti', label: 'Floral Kadwa Bootis', description: 'Scattered floral bud motifs individually locked into the warp' },
  { id: 'jangla_allover_jaal', label: 'Jangla All-Over Floral Jaal', description: 'Continuous intertwining vine and floral canopy across entire body' },
  { id: 'kalka_paisley_ambi', label: 'Kalka Paisley / Ambi Motifs', description: 'Classic Mughal mango/paisley curvature symbolizing fertility' },
  { id: 'mayur_peacock_shikargah', label: 'Shikargah & Royal Peacock', description: 'Mythological royal forest hunting scene with dancing peacocks' },
  { id: 'animal_elephant_hathi', label: 'Royal Elephant (Hathi) Motifs', description: 'Regal caparisoned elephant processions symbolizing prosperity and strength' },
  { id: 'temple_rudraksha', label: 'Temple Spire & Rudraksha', description: 'Stepped triangular temple spires aligned along selvedge' },
  { id: 'geometric_chevron', label: 'Geometric Leheriya & Chevron', description: 'Diagonal wave stripes and chevron zig-zags' },
  { id: 'solid_minimal', label: 'Solid Plane with Accent Border', description: 'Unembellished body allowing rich silk sheen to shine' },
  { id: 'floral_vine_sequin', label: 'Floral Vine & Sequin Lattice', description: 'Delicate floral jaal accented with glistening micro-sequins' },
  { id: 'mughal_bel_lattice', label: 'Mughal Bel & Architectural Arches', description: 'Symmetrical jaali grillework inspired by imperial palace windows' },
  { id: 'bandhej_dots', label: 'Traditional Bandhej Micro-Dots', description: 'Dense clusters of resist-tied pin-head dots creating organic patterns' },
  { id: 'digital_abstract_floral', label: 'Digital Abstract Botanical', description: 'Contemporary large-scale painterly florals and soft watercolor transitions' },
];

// ── 5. BORDER & PALLU TYPE ────────────────────────────────────────────────────
export const BORDER_PALLU_OPTIONS: TaxonomyOption[] = [
  { id: 'scalloped_zari_border', label: 'Scalloped Gold Zari Border', description: 'Arched cutwork edging framed with floral leaf vines' },
  { id: 'contrast_temple_border', label: 'Contrast Colorway Temple Border', description: 'Vibrant contrasting hue anchored by geometric korvai interlocks' },
  { id: 'heavy_kadhua_pallu', label: 'Heavy Brocade Kadwa Pallu', description: 'Grand ceremonial end-piece densely woven in zari' },
  { id: 'tassel_latkan_pallu', label: 'Rich Pallu with Tassels (Latkan)', description: 'Decorative artisan fringe knots and hanging latkans along saree fall', badge: 'Popular' },
  { id: 'zari_jacquard_border', label: 'Zari Jacquard Woven Border', description: 'Continuous woven metallic ribbon with intricate floral creepers' },
  { id: 'gota_patti_border', label: 'Gota Patti & Dori Work Border', description: 'Gold ribbon applique embellished with cord embroidery' },
  { id: 'fancy_lace_border', label: 'Fancy Embroidered Lace Border', description: 'Intricate scalloped lace border with tonal thread and sequin highlights' },
  { id: 'cutwork_scallop_border', label: 'Cutwork Scalloped Border', description: 'Laser-finished scalloped edge with hand needle-punched cutwork' },
  { id: 'running_self_border', label: 'Running Self Border (Tone-on-Tone)', description: 'Subtle woven border in matching body hue for understated elegance' },
  { id: 'running_minimal_border', label: 'Minimal Satin Ribbon Border', description: 'Subtle tone-on-tone edge for contemporary styling' },
];

// ── 6. BLOUSE FORMAT & TAILORING STATE (Authentic Census) ─────────────────────
export const BLOUSE_TYPE_OPTIONS: TaxonomyOption[] = [
  { id: 'unstitched_running', label: 'Attached Unstitched Running Blouse', description: '0.8m fabric piece continuous with the saree body hue', badge: 'Standard' },
  { id: 'unstitched_contrast', label: 'Attached Unstitched Contrast Blouse', description: '0.8m fabric piece in striking contrast shade to body', badge: 'Popular' },
  { id: 'exclusive_brocade', label: 'Exclusive Brocade Blouse Piece', description: 'Heavy jacquard zari woven blouse piece with ornate sleeve borders' },
  { id: 'heavy_embroidered', label: 'Heavy Embroidered Handwork Blouse Piece', description: 'Pre-embroidered neckline, back, and sleeve panels with sequins/moti' },
  { id: 'stitched_padded', label: 'Designer Stitched Ready-to-Wear Blouse', description: 'Finished blouse with padded cups, back hooks, and 2" margin allowances' },
  { id: 'plain_satin_contrast', label: 'Plain Satin / Raw Silk Blouse Piece', description: 'Smooth, solid contrast piece designed for contemporary tailoring' },
  { id: 'without_blouse', label: 'Without Blouse (Saree Only)', description: '5.5m single standalone saree drape with no attached blouse' },
];

// ── 7. ZARI & THREAD MATERIAL ─────────────────────────────────────────────────
export const ZARI_MATERIAL_OPTIONS: TaxonomyOption[] = [
  { id: 'tested_gold_zari', label: 'Tested Gold Zari', description: 'Electroplated micro-metallic thread with brilliant gold lustre' },
  { id: 'antique_copper_zari', label: 'Antique Copper / Muted Zari', description: 'Subtle vintage patina with royal matte warm undertone' },
  { id: 'silver_roop_zari', label: 'Tested Silver / White Zari', description: 'Cool metallic silver thread producing modern moonlit radiance' },
  { id: 'resham_silk_thread', label: 'Resham Silk Thread Inlay', description: 'Pure natural dyed silk threads with zero metallic scratchiness' },
  { id: 'rose_gold_zari', label: 'Rose Gold Metallic Zari', description: 'Contemporary blush-tinted metallic yarn' },
  { id: 'ganga_jamuna_dual', label: 'Dual-Tone Ganga-Jamuna (Gold & Silver)', description: 'Harmonious interlacing of radiant gold and shimmering silver zari' },
  { id: 'resham_micro_sequin', label: 'Resham Thread with Micro Sequins', description: 'Soft spun resham embroidery interspersed with 1mm shimmering sequins' },
  { id: 'matte_light_gold', label: 'Matte Light Gold Zari', description: 'Soft subtle champagne gold finish popular in minimalist luxury' },
];

// ── 8. WORK HEAVINESS ────────────────────────────────────────────────────────
export const WORK_HEAVINESS_OPTIONS: TaxonomyOption[] = [
  { id: 'light', label: 'Light (Daily Luxury / Puja)', description: 'Under 500g • Breathable and featherlight for extended wear' },
  { id: 'medium', label: 'Medium (Festive & Cocktails)', description: '500g – 800g • Rich presence with comfortable movement' },
  { id: 'heavy', label: 'Heavy (Wedding & Reception)', description: '800g – 1.2kg • Densely woven zari with opulent regal drape' },
  { id: 'bridal_trousseau', label: 'Bridal Trousseau Grand', description: '1.2kg+ • Heirloom masterpiece designed for bride/close family' },
];

// ── 9. OCCASIONS ─────────────────────────────────────────────────────────────
export const OCCASION_OPTIONS: TaxonomyOption[] = [
  { id: 'wedding_bridal', label: 'Wedding & Bridal', badge: 'Popular' },
  { id: 'reception_cocktail', label: 'Reception & Sangeet', badge: 'Trending' },
  { id: 'festive_diwali_puja', label: 'Festivals & Temple Puja', badge: 'Heritage' },
  { id: 'haldi_mehendi', label: 'Haldi & Mehendi Ceremonies', badge: 'Trending' },
  { id: 'party_evening', label: 'Evening Soiree & Gala' },
  { id: 'engagement_shagun', label: 'Engagement & Shagun' },
  { id: 'formal_conclave', label: 'Editorial & Formal Conclave' },
  { id: 'daily_handloom', label: 'Everyday Handloom Luxury' },
];

// ── 10. STITCH & SIZING PROFILES (Authentic Census) ───────────────────────────
export const STITCH_TYPE_OPTIONS: TaxonomyOption[] = [
  { id: 'unstitched_saree_blouse', label: 'Unstitched (Saree + Blouse Piece)', description: '5.5m saree drape with 0.8m running/contrast blouse piece', badge: 'Census #1' },
  { id: 'unstitched_stitched_blouse', label: 'Unstitched Saree with Stitched Blouse', description: '5.5m unstitched saree paired with pre-stitched designer blouse' },
  { id: 'ready_to_drape_pre_pleated', label: 'Ready-to-Drape (Pre-Pleated)', description: 'Stitched waistband pleats with instant 1-minute slip-on drape', badge: 'Trending' },
  { id: 'semi_stitched', label: 'Semi-Stitched (Custom Tailoring)', description: 'Pre-cut panels with customizable waist and bust seams' },
  { id: 'stitched_canvas_patta', label: 'Stitched with Canvas Patta / Lining', description: 'Heavy skirt/pallu reinforced with rigid canvas border for structured flare' },
  { id: 'fully_stitched_numeric', label: 'Fully Stitched (Numeric 32–44)', description: 'Finished garment with padded cups and side margin allowances' },
  { id: 'fully_stitched_letter', label: 'Fully Stitched (Letter XS–3XL)', description: 'Standard ready-to-wear sizing with comfortable ease' },
  { id: 'free_size_adjustable', label: 'Free Size (Adjustable Drawstring)', description: 'Versatile drape fitting waist 26" to 44"' },
];

// ── 11. PRODUCT SPECIFICATION RECORD ─────────────────────────────────────────
export interface ProductCurationSpecs {
  // Category & Taxonomy
  category: 'saree' | 'blouse' | 'dress' | 'kids' | 'lehenga';
  fabricId: string;
  fabricName: string;
  weaveTechniqueId: string;
  weaveTechniqueName: string;
  craftOriginId: string;
  craftOriginName: string;
  motifPatternId: string;
  motifPatternName: string;
  borderPalluId: string;
  borderPalluName: string;
  zariMaterialId: string;
  zariMaterialName: string;
  workHeavinessId: string;
  workHeavinessName: string;
  
  // Sizing & Tailoring
  stitchTypeId: string;
  stitchTypeName: string;
  sareeLengthMetres: number;
  blousePieceLengthMetres: number;
  blouseTypeId?: string;
  blouseTypeName?: string;
  blouseType: 'unstitched_running' | 'unstitched_contrast' | 'exclusive_brocade' | 'heavy_embroidered' | 'stitched_padded' | 'plain_satin_contrast' | 'without_blouse' | string;
  sizeProfile: 'free-size' | 'numeric' | 'letter' | 'custom';
  
  // Occasions, Filters & Relevance
  occasions: string[];
  searchTags: string[];
  badges: string[];
  careInstructions: string;
  packageContents: string;
  
  // AI Derivation metadata
  isAiDerived?: boolean;
  derivedAt?: string;
  confidenceScore?: number;
}

export const DEFAULT_SAREE_SPECS: ProductCurationSpecs = {
  category: 'saree',
  fabricId: 'pure_katan_silk',
  fabricName: 'Pure Katan Silk',
  weaveTechniqueId: 'kadwa_pitloom',
  weaveTechniqueName: 'Kadwa Pitloom Weave',
  craftOriginId: 'varanasi',
  craftOriginName: 'Varanasi (Banaras), UP',
  motifPatternId: 'kadwa_floral_booti',
  motifPatternName: 'Floral Kadwa Bootis',
  borderPalluId: 'scalloped_zari_border',
  borderPalluName: 'Scalloped Gold Zari Border',
  zariMaterialId: 'tested_gold_zari',
  zariMaterialName: 'Tested Gold Zari',
  workHeavinessId: 'heavy',
  workHeavinessName: 'Heavy (Wedding & Reception)',
  stitchTypeId: 'unstitched_saree_blouse',
  stitchTypeName: 'Unstitched (Saree + Blouse Piece)',
  sareeLengthMetres: 5.5,
  blousePieceLengthMetres: 0.8,
  blouseTypeId: 'unstitched_running',
  blouseTypeName: 'Attached Unstitched Running Blouse',
  blouseType: 'unstitched_running',
  sizeProfile: 'free-size',
  occasions: ['wedding_bridal', 'festive_diwali_puja', 'reception_cocktail'],
  searchTags: [
    'banarasi saree',
    'pure katan silk',
    'kadwa booti',
    'gold zari border',
    'bridal silk saree',
    'handloom',
    'wedding reception',
  ],
  badges: ['Silk Mark Certified', 'Handloom Verified', 'GI Tagged Heritage'],
  careInstructions: 'Dry Clean Only • Store in breathable muslin bag • Avoid direct perfume on zari',
  packageContents: '1 Handloom Saree (5.5m) with attached unstitched blouse piece (0.8m)',
  isAiDerived: true,
  confidenceScore: 96,
};

// ── 12. UNIFIED ATTRIBUTES SPEC BUILDER (PREFILL ENGINE) ──────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '_');
}

function findBestMatch(
  query: string,
  options: TaxonomyOption[]
): { id: string; name: string } | null {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim().toLowerCase();
  if (!q || q === 'unknown') return null;

  // 1. Direct ID or exact label match
  const exact = options.find(
    (o) => o.id === q || o.label.toLowerCase() === q
  );
  if (exact) return { id: exact.id, name: exact.label };

  // 2. Substring match
  const matched = options.find(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      q.includes(o.label.toLowerCase()) ||
      q.includes(o.id.replace(/_/g, ' '))
  );
  if (matched) return { id: matched.id, name: matched.label };

  // 3. Fallback to custom entry if query contains informative text
  return {
    id: `custom_${slugify(query)}`,
    name: query.trim(),
  };
}

/**
 * Builds and prefills ProductCurationSpecs from a product record or raw unified_attributes JSON.
 * Seamlessly integrates census data and dynamic custom tags.
 */
export function buildSpecsFromUnifiedAttributes(
  unifiedAttributes?: Record<string, any> | null,
  product?: {
    title?: string;
    fabric?: string;
    stitch_type?: string;
    description?: string;
    [key: string]: any;
  } | null,
  fallback: ProductCurationSpecs = DEFAULT_SAREE_SPECS
): ProductCurationSpecs {
  const ua = unifiedAttributes || {};
  const title = product?.title || '';
  const desc = product?.description || '';
  const fullText = `${title} ${desc}`.toLowerCase();

  // 1. Fabric Resolution
  const rawFabric =
    ua.fabric_base ||
    ua.fabric ||
    product?.fabric ||
    '';
  let fabricMatch: { id: string; name: string } | null = null;
  if (rawFabric && rawFabric.toLowerCase() !== 'unknown') {
    fabricMatch = findBestMatch(rawFabric, ETHNIC_FABRIC_OPTIONS);
  } else {
    // Infer from title keywords
    if (fullText.includes('katan')) fabricMatch = { id: 'pure_katan_silk', name: 'Pure Katan Silk' };
    else if (fullText.includes('dola')) fabricMatch = { id: 'dola_silk', name: 'Dola Silk' };
    else if (fullText.includes('organza')) fabricMatch = { id: 'pure_organza_silk', name: 'Pure Organza Silk' };
    else if (fullText.includes('georgette')) fabricMatch = { id: 'viscose_georgette', name: 'Viscose Georgette' };
    else if (fullText.includes('chiffon')) fabricMatch = { id: 'chiffon', name: 'Pure Chiffon' };
    else if (fullText.includes('linen')) fabricMatch = { id: 'soft_linen', name: 'Soft Linen / Spun Linen' };
    else if (fullText.includes('chanderi')) fabricMatch = { id: 'chanderi_silk_cotton', name: 'Chanderi Silk Cotton' };
    else if (fullText.includes('banarasi') || fullText.includes('brocade')) fabricMatch = { id: 'banarasi_brocade', name: 'Banarasi Brocade Silk' };
    else if (fullText.includes('tussar') || fullText.includes('kosa')) fabricMatch = { id: 'pure_tussar_silk', name: 'Pure Tussar Silk (Kosa)' };
    else if (fullText.includes('cotton')) fabricMatch = { id: 'mul_cotton', name: 'Mul Cotton Handloom' };
  }

  // 2. Stitch Type Resolution
  const rawStitch =
    ua.stitch_type ||
    product?.stitch_type ||
    '';
  let stitchMatch: { id: string; name: string } | null = null;
  if (rawStitch && rawStitch.toLowerCase() !== 'unknown') {
    stitchMatch = findBestMatch(rawStitch, STITCH_TYPE_OPTIONS);
  } else {
    if (fullText.includes('ready to wear') || fullText.includes('pre-pleated') || fullText.includes('ready to drape')) {
      stitchMatch = { id: 'ready_to_drape_pre_pleated', name: 'Ready-to-Drape (Pre-Pleated)' };
    } else if (fullText.includes('stitched blouse')) {
      stitchMatch = { id: 'unstitched_stitched_blouse', name: 'Unstitched Saree with Stitched Blouse' };
    } else if (fullText.includes('semi-stitched')) {
      stitchMatch = { id: 'semi_stitched', name: 'Semi-Stitched (Custom Tailoring)' };
    } else if (fullText.includes('canvas')) {
      stitchMatch = { id: 'stitched_canvas_patta', name: 'Stitched with Canvas Patta / Lining' };
    }
  }

  // 3. Weave Technique / Craft Resolution
  const rawCraft = ua.craft_technique || ua.weave_technique || '';
  let craftMatch: { id: string; name: string } | null = null;
  if (rawCraft) {
    craftMatch = findBestMatch(rawCraft, WEAVE_TECHNIQUE_OPTIONS);
  } else {
    if (fullText.includes('bandhani') || fullText.includes('bandhej')) craftMatch = { id: 'bandhani_tie_dye', name: 'Bandhani Hand-Knotting & Tie-Dye' };
    else if (fullText.includes('chikankari')) craftMatch = { id: 'chikankari_embroidery', name: 'Hand Chikankari Embroidery' };
    else if (fullText.includes('patola') || fullText.includes('ikat')) craftMatch = { id: 'patola_double_ikat', name: 'Double Ikat / Patola Weave' };
    else if (fullText.includes('ajrakh')) craftMatch = { id: 'ajrakh_block_print', name: 'Ajrakh Hand Block Print' };
    else if (fullText.includes('kalamkari')) craftMatch = { id: 'kalamkari_artisan', name: 'Kalamkari Handblock / Pen Craft' };
    else if (fullText.includes('digital print') || fullText.includes('foil print')) craftMatch = { id: 'foil_digital_print', name: 'Foil & Digital Fusion Print' };
    else if (fullText.includes('sequin') || fullText.includes('moti')) craftMatch = { id: 'moti_sequin_handwork', name: 'Moti, Cutdana & Sequin Handwork' };
    else if (fullText.includes('gota patti') || fullText.includes('dori')) craftMatch = { id: 'gota_patti_dori', name: 'Gota Patti & Dori Work' };
    else if (fullText.includes('kadwa')) craftMatch = { id: 'kadwa_pitloom', name: 'Kadwa Pitloom Weave' };
    else if (fullText.includes('jacquard') || fullText.includes('brocade')) craftMatch = { id: 'banarasi_jacquard', name: 'Banarasi Jacquard Brocade' };
  }

  // 4. Motif Resolution
  const rawMotif = ua.motif_pattern || ua.motif || '';
  let motifMatch: { id: string; name: string } | null = null;
  if (rawMotif) {
    motifMatch = findBestMatch(rawMotif, MOTIF_PATTERN_OPTIONS);
  } else {
    if (fullText.includes('peacock') || fullText.includes('shikargah') || fullText.includes('mayur')) motifMatch = { id: 'mayur_peacock_shikargah', name: 'Shikargah & Royal Peacock' };
    else if (fullText.includes('elephant') || fullText.includes('hathi') || fullText.includes('animal')) motifMatch = { id: 'animal_elephant_hathi', name: 'Royal Elephant (Hathi) Motifs' };
    else if (fullText.includes('paisley') || fullText.includes('kalka') || fullText.includes('ambi')) motifMatch = { id: 'kalka_paisley_ambi', name: 'Kalka Paisley / Ambi Motifs' };
    else if (fullText.includes('temple') || fullText.includes('rudraksha')) motifMatch = { id: 'temple_rudraksha', name: 'Temple Spire & Rudraksha' };
    else if (fullText.includes('jaal') || fullText.includes('jangla')) motifMatch = { id: 'jangla_allover_jaal', name: 'Jangla All-Over Floral Jaal' };
    else if (fullText.includes('chevron') || fullText.includes('leheriya')) motifMatch = { id: 'geometric_chevron', name: 'Geometric Leheriya & Chevron' };
    else if (fullText.includes('booti') || fullText.includes('buta') || fullText.includes('floral')) motifMatch = { id: 'kadwa_floral_booti', name: 'Floral Kadwa Bootis' };
  }

  // 5. Border & Pallu Resolution
  const rawBorder = ua.border_pallu || ua.border || '';
  let borderMatch: { id: string; name: string } | null = null;
  if (rawBorder) {
    borderMatch = findBestMatch(rawBorder, BORDER_PALLU_OPTIONS);
  } else {
    if (fullText.includes('latkan') || fullText.includes('tassel')) borderMatch = { id: 'tassel_latkan_pallu', name: 'Rich Pallu with Tassels (Latkan)' };
    else if (fullText.includes('scallop') || fullText.includes('cut work') || fullText.includes('cutwork')) borderMatch = { id: 'scalloped_zari_border', name: 'Scalloped Gold Zari Border' };
    else if (fullText.includes('contrast border') || fullText.includes('temple border')) borderMatch = { id: 'contrast_temple_border', name: 'Contrast Colorway Temple Border' };
    else if (fullText.includes('lace border')) borderMatch = { id: 'fancy_lace_border', name: 'Fancy Embroidered Lace Border' };
    else if (fullText.includes('gota patti')) borderMatch = { id: 'gota_patti_border', name: 'Gota Patti & Dori Work Border' };
    else if (fullText.includes('heavy pallu') || fullText.includes('rich pallu')) borderMatch = { id: 'heavy_kadhua_pallu', name: 'Heavy Brocade Kadwa Pallu' };
  }

  // 6. Blouse Format Resolution
  const rawBlouse = ua.blouse_format || ua.blouse_type || '';
  let blouseMatch: { id: string; name: string } | null = null;
  if (rawBlouse) {
    blouseMatch = findBestMatch(rawBlouse, BLOUSE_TYPE_OPTIONS);
  } else {
    if (fullText.includes('running blouse') || fullText.includes('running printed blouse')) {
      blouseMatch = { id: 'unstitched_running', name: 'Attached Unstitched Running Blouse' };
    } else if (fullText.includes('contrast blouse')) {
      blouseMatch = { id: 'unstitched_contrast', name: 'Attached Unstitched Contrast Blouse' };
    } else if (fullText.includes('brocade blouse')) {
      blouseMatch = { id: 'exclusive_brocade', name: 'Exclusive Brocade Blouse Piece' };
    } else if (fullText.includes('stitched blouse') || fullText.includes('designer blouse')) {
      blouseMatch = { id: 'stitched_padded', name: 'Designer Stitched Ready-to-Wear Blouse' };
    } else if (fullText.includes('without blouse')) {
      blouseMatch = { id: 'without_blouse', name: 'Without Blouse (Saree Only)' };
    }
  }

  // 7. Occasions Resolution
  let resolvedOccasions: string[] = fallback.occasions;
  if (Array.isArray(ua.occasions) && ua.occasions.length > 0) {
    resolvedOccasions = ua.occasions.map((occ: string) => {
      const match = findBestMatch(occ, OCCASION_OPTIONS);
      return match ? match.id : `custom_${slugify(occ)}`;
    });
  } else if (typeof ua.occasions === 'string' && ua.occasions.trim()) {
    resolvedOccasions = ua.occasions.split(',').map((s: string) => s.trim());
  } else {
    const detected: string[] = [];
    if (fullText.includes('wedding') || fullText.includes('bridal')) detected.push('wedding_bridal');
    if (fullText.includes('reception') || fullText.includes('sangeet')) detected.push('reception_cocktail');
    if (fullText.includes('festive') || fullText.includes('puja') || fullText.includes('diwali')) detected.push('festive_diwali_puja');
    if (fullText.includes('haldi') || fullText.includes('mehendi')) detected.push('haldi_mehendi');
    if (fullText.includes('party') || fullText.includes('evening')) detected.push('party_evening');
    if (detected.length > 0) resolvedOccasions = detected;
  }

  // 8. Search Tags & Keywords Synthesis
  const baseTags = Array.isArray(ua.tags) ? ua.tags : [];
  const synthesizedTags = new Set<string>([
    ...baseTags,
    ...(fallback.searchTags || []),
  ]);
  if (fabricMatch) synthesizedTags.add(fabricMatch.name.toLowerCase());
  if (craftMatch) synthesizedTags.add(craftMatch.name.toLowerCase());
  if (motifMatch) synthesizedTags.add(motifMatch.name.toLowerCase());
  if (borderMatch) synthesizedTags.add(borderMatch.name.toLowerCase());
  if (blouseMatch) synthesizedTags.add(blouseMatch.name.toLowerCase());

  // 9. Dynamic Care Instructions & Package Contents
  const isSilk = (fabricMatch?.name || fallback.fabricName).toLowerCase().includes('silk');
  const isCotton = (fabricMatch?.name || fallback.fabricName).toLowerCase().includes('cotton');
  const care = isSilk
    ? 'Dry Clean Only • Store in breathable muslin bag • Avoid direct perfume on zari'
    : isCotton
    ? 'Gentle cold hand wash • Dry in shade • Mild iron on reverse'
    : 'Dry clean recommended • Gentle steam iron • Store flat';

  const sareeLen = typeof ua.saree_length === 'number' ? ua.saree_length : fallback.sareeLengthMetres || 5.5;
  const blouseLen = typeof ua.blouse_length === 'number' ? ua.blouse_length : fallback.blousePieceLengthMetres || 0.8;
  const packageContents = `1 Authentic Handloom Saree (${sareeLen}m) with attached ${blouseMatch?.name || 'blouse piece'} (${blouseLen}m)`;

  return {
    ...fallback,
    fabricId: fabricMatch ? fabricMatch.id : fallback.fabricId,
    fabricName: fabricMatch ? fabricMatch.name : fallback.fabricName,
    stitchTypeId: stitchMatch ? stitchMatch.id : fallback.stitchTypeId,
    stitchTypeName: stitchMatch ? stitchMatch.name : fallback.stitchTypeName,
    weaveTechniqueId: craftMatch ? craftMatch.id : fallback.weaveTechniqueId,
    weaveTechniqueName: craftMatch ? craftMatch.name : fallback.weaveTechniqueName,
    motifPatternId: motifMatch ? motifMatch.id : fallback.motifPatternId,
    motifPatternName: motifMatch ? motifMatch.name : fallback.motifPatternName,
    borderPalluId: borderMatch ? borderMatch.id : fallback.borderPalluId,
    borderPalluName: borderMatch ? borderMatch.name : fallback.borderPalluName,
    blouseTypeId: blouseMatch ? blouseMatch.id : fallback.blouseTypeId || 'unstitched_running',
    blouseTypeName: blouseMatch ? blouseMatch.name : fallback.blouseTypeName || 'Attached Unstitched Running Blouse',
    blouseType: (blouseMatch ? blouseMatch.id : fallback.blouseType) as any,
    occasions: resolvedOccasions,
    searchTags: Array.from(synthesizedTags).slice(0, 15),
    careInstructions: ua.care_instructions || care,
    packageContents: ua.package_contents || packageContents,
    sareeLengthMetres: sareeLen,
    blousePieceLengthMetres: blouseLen,
    isAiDerived: true,
    derivedAt: new Date().toISOString(),
    confidenceScore: 97,
  };
}
