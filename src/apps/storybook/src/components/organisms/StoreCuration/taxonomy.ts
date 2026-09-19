/**
 * Comprehensive Ethnic Fashion & Store Curation Taxonomy Constants
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
}

// ── 1. FABRIC TAXONOMY ────────────────────────────────────────────────────────
export const ETHNIC_FABRIC_OPTIONS: TaxonomyOption[] = [
  { id: 'pure_katan_silk', label: 'Pure Katan Silk', description: 'Handloom warp & weft twisted pure mulberry silk with rich lustrous drape', badge: 'Handloom' },
  { id: 'banarasi_brocade', label: 'Banarasi Brocade Silk', description: 'Opulent jacquard silk woven with gold and silver zari relief patterns', badge: 'Heritage' },
  { id: 'pure_organza_silk', label: 'Pure Organza Silk', description: 'Crisp, lightweight sheer silk with structured silhouette and translucent sheen' },
  { id: 'chanderi_silk_cotton', label: 'Chanderi Silk Cotton', description: 'Finely woven handloom blend featuring sheer texture and glossy finish', badge: 'Handloom' },
  { id: 'tussar_kosa_silk', label: 'Pure Tussar Silk (Kosa)', description: 'Textured wild silk renowned for natural golden sheen and rich porosity' },
  { id: 'georgette_crepe', label: 'Pure Silk Georgette Crepe', description: 'Fluid, crinkled drape with lightweight bounce and modern elegance' },
  { id: 'modal_chanderi', label: 'Modal Chanderi Blend', description: 'Soft breathable cellulosic silk blend ideal for summer festivities' },
  { id: 'cotton_linen', label: 'Handspun Cotton Linen', description: 'Organic artisanal weave with earthy matte texture and breathable comfort' },
  { id: 'raw_silk_matka', label: 'Raw Silk / Matka', description: 'Subtle slub textured handloom silk with character and structured drape' },
  { id: 'velvet_silk', label: 'Opulent Silk Velvet', description: 'Plush, dense pile silk fabric with luminous depth for winter weddings' },
];

// ── 2. WEAVE TECHNIQUE TAXONOMY ───────────────────────────────────────────────
export const WEAVE_TECHNIQUE_OPTIONS: TaxonomyOption[] = [
  { id: 'kadwa_pitloom', label: 'Kadwa Pitloom Weave', description: 'Authentic engraved motif where each booti is individually hand-woven without floating threads on reverse', badge: 'Master Craft' },
  { id: 'tanchoi_satin', label: 'Tanchoi Satin Weave', description: 'Fine multi-color warp brocade without zari, producing smooth satin finish' },
  { id: 'jamdani_shuttle', label: 'Jamdani Shuttle Weave', description: 'Supplementary weft floating technique creating gossamer floral motifs' },
  { id: 'jacquard_brocade', label: 'Jacquard Zari Brocade', description: 'High-density pattern weave with intricate relief zari threads' },
  { id: 'meenakari_enamel', label: 'Meenakari Resham Weave', description: 'Multi-color silk thread inlay resembling colorful Rajasthani jewelry enamel' },
  { id: 'bandhani_tie_dye', label: 'Bandhani Hand-Knotting', description: 'Traditional resist tie-dye artisanal process from Kutch/Rajasthan' },
  { id: 'patola_double_ikat', label: 'Double Ikat Weave', description: 'Resist dyed warp and weft hand-aligned with geometric precision' },
  { id: 'chikankari_embroidery', label: 'Hand Chikankari Embroidery', description: 'Delicate Lucknow shadow-work and bakhiya hand needlework' },
];

// ── 3. CRAFT HERITAGE & ORIGIN ────────────────────────────────────────────────
export const CRAFT_ORIGIN_OPTIONS: TaxonomyOption[] = [
  { id: 'varanasi', label: 'Varanasi (Banaras), UP', description: 'Ancient spiritual weaving capital renowned for Kadwa, Katan & Kora silks', badge: 'GI Tagged' },
  { id: 'kanchipuram', label: 'Kanchipuram, Tamil Nadu', description: 'Korvai contrast border heavy silk sarees with pure gold zari', badge: 'GI Tagged' },
  { id: 'chanderi', label: 'Chanderi, Madhya Pradesh', description: 'Historical royal handlooms renowned for sheer silk-cotton weaving', badge: 'GI Tagged' },
  { id: 'paithan', label: 'Paithan, Maharashtra', description: 'Royal Maratha silk sarees with oblique square border and kaleidoscopic peacock pallu', badge: 'GI Tagged' },
  { id: 'sambalpur', label: 'Sambalpur, Odisha', description: 'Traditional tie-dye Baandha warp & weft handlooms', badge: 'GI Tagged' },
  { id: 'surat', label: 'Surat, Gujarat', description: 'India’s modern textile capital specializing in designer silks & embellishments' },
  { id: 'lucknow', label: 'Lucknow, Uttar Pradesh', description: 'Nawabi heritage center for artisanal Chikankari and Mukaish needlecraft', badge: 'GI Tagged' },
  { id: 'pochampally', label: 'Pochampally, Telangana', description: 'Geometric double-ikat weaving with traditional temple borders', badge: 'GI Tagged' },
];

// ── 4. MOTIF & PATTERN TAXONOMY ───────────────────────────────────────────────
export const MOTIF_PATTERN_OPTIONS: TaxonomyOption[] = [
  { id: 'kadwa_floral_booti', label: 'Floral Kadwa Bootis', description: 'Scattered floral bud motifs individually locked into the warp' },
  { id: 'jangla_allover_jaal', label: 'Jangla All-Over Floral Jaal', description: 'Continuous intertwining vine and floral canopy across entire body' },
  { id: 'kalka_paisley_ambi', label: 'Kalka Paisley / Ambi Motifs', description: 'Classic Mughal mango/paisley curvature symbolizing fertility' },
  { id: 'mayur_peacock_shikargah', label: 'Shikargah & Royal Peacock', description: 'Mythological royal forest hunting scene with dancing peacocks' },
  { id: 'temple_rudraksha', label: 'Temple Spire & Rudraksha', description: 'Stepped triangular temple spires aligned along selvedge' },
  { id: 'geometric_chevron', label: 'Geometric Leheriya & Chevron', description: 'Diagonal wave stripes and chevron zig-zags' },
  { id: 'solid_minimal', label: 'Solid Plane with Accent Border', description: 'Unembellished body allowing rich silk sheen to shine' },
];

// ── 5. BORDER & PALLU TYPE ───────────────────────────────────────────────────
export const BORDER_PALLU_OPTIONS: TaxonomyOption[] = [
  { id: 'scalloped_zari_border', label: 'Scalloped Gold Zari Border', description: 'Arched cutwork edging framed with floral leaf vines' },
  { id: 'contrast_temple_border', label: 'Contrast Colorway Temple Border', description: 'Vibrant contrasting hue anchored by geometric korvai interlocks' },
  { id: 'heavy_kadhua_pallu', label: 'Heavy Brocade Kadwa Pallu', description: 'Grand ceremonial end-piece densely woven in zari' },
  { id: 'running_minimal_border', label: 'Minimal Satin Ribbon Border', description: 'Subtle tone-on-tone edge for contemporary styling' },
  { id: 'gota_patti_border', label: 'Gota Patti & Dori Work Border', description: 'Gold ribbon applique embellished with cord embroidery' },
  { id: 'tassel_latkan_pallu', label: 'Hand-Knotted Resham Tassel Pallu', description: 'Decorative artisan fringe knots along saree fall' },
];

// ── 6. ZARI & THREAD MATERIAL ─────────────────────────────────────────────────
export const ZARI_MATERIAL_OPTIONS: TaxonomyOption[] = [
  { id: 'tested_gold_zari', label: 'Tested Gold Zari', description: 'Electroplated micro-metallic thread with brilliant gold lustre' },
  { id: 'antique_copper_zari', label: 'Antique Copper / Muted Zari', description: 'Subtle vintage patina with royal matte warm undertone' },
  { id: 'silver_roop_zari', label: 'Tested Silver / White Zari', description: 'Cool metallic silver thread producing modern moonlit radiance' },
  { id: 'resham_silk_thread', label: 'Resham Silk Thread Inlay', description: 'Pure natural dyed silk threads with zero metallic scratchiness' },
  { id: 'rose_gold_zari', label: 'Rose Gold Metallic Zari', description: 'Contemporary blush-tinted metallic yarn' },
];

// ── 7. WORK HEAVINESS ────────────────────────────────────────────────────────
export const WORK_HEAVINESS_OPTIONS: TaxonomyOption[] = [
  { id: 'light', label: 'Light (Daily Luxury / Puja)', description: 'Under 500g • Breathable and featherlight for extended wear' },
  { id: 'medium', label: 'Medium (Festive & Cocktails)', description: '500g – 800g • Rich presence with comfortable movement' },
  { id: 'heavy', label: 'Heavy (Wedding & Reception)', description: '800g – 1.2kg • Densely woven zari with opulent regal drape' },
  { id: 'bridal_trousseau', label: 'Bridal Trousseau Grand', description: '1.2kg+ • Heirloom masterpiece designed for bride/close family' },
];

// ── 8. OCCASIONS ─────────────────────────────────────────────────────────────
export const OCCASION_OPTIONS: TaxonomyOption[] = [
  { id: 'wedding_bridal', label: 'Wedding & Bridal', badge: 'Popular' },
  { id: 'reception_cocktail', label: 'Reception & Sangeet', badge: 'Trending' },
  { id: 'festive_diwali_puja', label: 'Festivals & Temple Puja', badge: 'Heritage' },
  { id: 'party_evening', label: 'Evening Soiree & Gala' },
  { id: 'formal_conclave', label: 'Editorial & Formal Conclave' },
  { id: 'daily_handloom', label: 'Everyday Handloom Luxury' },
];

// ── 9. STITCH & SIZING PROFILES ──────────────────────────────────────────────
export const STITCH_TYPE_OPTIONS: TaxonomyOption[] = [
  { id: 'unstitched_saree_blouse', label: 'Unstitched (Saree + Blouse Piece)', description: '5.5m saree drape with 0.8m running/contrast blouse piece' },
  { id: 'ready_to_drape_pre_pleated', label: 'Ready-to-Drape (Pre-Pleated)', description: 'Stitched waistband pleats with instant 1-minute slip-on drape' },
  { id: 'semi_stitched', label: 'Semi-Stitched (Custom Tailoring)', description: 'Pre-cut panels with customizable waist and bust seams' },
  { id: 'fully_stitched_numeric', label: 'Fully Stitched (Numeric 32–44)', description: 'Finished garment with padded cups and side margin allowances' },
  { id: 'fully_stitched_letter', label: 'Fully Stitched (Letter XS–3XL)', description: 'Standard ready-to-wear sizing with comfortable ease' },
  { id: 'free_size_adjustable', label: 'Free Size (Adjustable Drawstring)', description: 'Versatile drape fitting waist 26" to 44"' },
];

// ── 10. PRODUCT SPECIFICATION RECORD ─────────────────────────────────────────
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
  blouseType: 'unstitched_running' | 'unstitched_contrast' | 'stitched_padded' | 'without_blouse';
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
