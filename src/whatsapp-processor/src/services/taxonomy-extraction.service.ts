/**
 * Multi-Dimensional Metadata Extraction Engine
 * ADO Work Item: #682 (Parent: #680)
 *
 * Extracts canonical taxonomy facets and sizing dimensions from ethnic fashion product text
 * and WhatsApp message groups using public.taxonomy_facets.
 *
 * Dimensions Extracted:
 * - fabric_base (canonical fabric name)
 * - craft_technique (canonical craft name)
 * - motif_pattern (canonical motif pattern)
 * - border_pallu (canonical border/pallu design)
 * - blouse_format (canonical blouse format)
 * - stitch_type (canonical stitch type)
 * - occasions (canonical occasion list)
 * - dimensions (saree length, blouse cut, size/bust, flare)
 */

import { Client, Pool, PoolClient } from 'pg';

export interface TaxonomyFacet {
  id: string;
  dimension: string; // 'fabric' | 'craft' | 'embellishment' | 'border' | 'blouse' | 'stitch' | 'occasion' | 'motif' | 'zari'
  canonical_name: string;
  aliases: string[];
  usage_count: number;
  is_verified: boolean;
  metadata?: Record<string, any>;
}

export interface CompiledFacetMatcher {
  facet: TaxonomyFacet;
  terms: { term: string; regex: RegExp; length: number }[];
}

export interface ExtractedDimensions {
  saree_length_m?: number;
  blouse_length_m?: number;
  total_length_m?: number;
  flare_m?: number;
  width_in?: number;
  size_bust_in?: number;
  size_label?: string;
  [key: string]: any;
}

export interface ExtractedMetadataResult {
  fabric_base: string | null;
  craft_technique: string | null;
  craft_techniques: string[];
  motif_pattern: string | null;
  motif_patterns: string[];
  border_pallu: string | null;
  border_pallus: string[];
  blouse_format: string | null;
  stitch_type: string | null;
  base_stitch_type: string | null;
  occasions: string[];
  dimensions: ExtractedDimensions;
  tags: string[];
  matchedFacetIds: string[];
  matchedFacetsSummary: { dimension: string; canonical_name: string }[];
  confidence: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createWordRegex(term: string): RegExp {
  const escaped = escapeRegex(term.trim());
  return new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:$|[^a-zA-Z0-9])`, 'i');
}

/**
 * In-memory compiled registry of taxonomy facets for ultra-fast matching
 */
export class TaxonomyRegistry {
  private facets: TaxonomyFacet[] = [];
  private matchersByDimension: Map<string, CompiledFacetMatcher[]> = new Map();
  private isLoaded: boolean = false;

  constructor(facets?: TaxonomyFacet[]) {
    if (facets && facets.length > 0) {
      this.initFromFacets(facets);
    }
  }

  /**
   * Load facets from PostgreSQL database
   */
  public async loadFromDb(clientOrPool: Client | Pool | PoolClient): Promise<void> {
    const res = await clientOrPool.query<TaxonomyFacet>(`
      SELECT id, dimension, canonical_name, aliases, usage_count, is_verified, metadata
      FROM public.taxonomy_facets
      ORDER BY usage_count DESC, canonical_name ASC
    `);
    this.initFromFacets(res.rows);
  }

  /**
   * Initialize in-memory compiled matchers
   */
  public initFromFacets(facets: TaxonomyFacet[]): void {
    this.facets = facets;
    this.matchersByDimension.clear();

    for (const facet of facets) {
      const allTerms = [facet.canonical_name, ...(facet.aliases || [])];
      // Deduplicate terms and sort by length descending
      const uniqueTerms = Array.from(new Set(allTerms.map(t => t.trim()).filter(Boolean)));
      const terms = uniqueTerms
        .map(term => ({
          term,
          regex: createWordRegex(term),
          length: term.length,
        }))
        .sort((a, b) => b.length - a.length);

      const matcher: CompiledFacetMatcher = { facet, terms };
      const dim = facet.dimension.toLowerCase();

      if (!this.matchersByDimension.has(dim)) {
        this.matchersByDimension.set(dim, []);
      }
      this.matchersByDimension.get(dim)!.push(matcher);
    }

    // Sort matchers in each dimension so that longer terms match first
    this.matchersByDimension.forEach((matchers) => {
      matchers.sort((a, b) => {
        const maxLenA = Math.max(...a.terms.map(t => t.length), 0);
        const maxLenB = Math.max(...b.terms.map(t => t.length), 0);
        return maxLenB - maxLenA;
      });
    });

    this.isLoaded = true;
  }

  public getMatchers(dimension: string): CompiledFacetMatcher[] {
    return this.matchersByDimension.get(dimension.toLowerCase()) || [];
  }

  public getAllFacets(): TaxonomyFacet[] {
    return this.facets;
  }

  public get ready(): boolean {
    return this.isLoaded;
  }
}

/**
 * Parse explicit ethnic wear product listing sections
 */
interface ParsedSections {
  sareeFabricText: string | null;
  blouseFabricText: string | null;
  workText: string | null;
  borderText: string | null;
  sareeCutText: string | null;
  blouseCutText: string | null;
  blouseText: string | null;
  rawCombined: string;
}

function parseListingSections(text: string): ParsedSections {
  const clean = text.replace(/[*_~`]/g, ' ');
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let sareeFabricText: string | null = null;
  let blouseFabricText: string | null = null;
  let workText: string | null = null;
  let borderText: string | null = null;
  let sareeCutText: string | null = null;
  let blouseCutText: string | null = null;
  let blouseText: string | null = null;

  let currentSection: 'saree' | 'blouse' | 'work' | 'general' = 'general';

  for (const line of lines) {
    // Section headers
    if (/(?:saree|sari)/i.test(line) && !/fabric|work|cut|blouse/i.test(line)) {
      currentSection = 'saree';
    } else if (/blouse/i.test(line) && !/fabric|work|cut|saree/i.test(line)) {
      currentSection = 'blouse';
    }

    // Explicit Fabric line (e.g. "Fabric :-", "Fabric. :-", "Saree Fabric:")
    const fabricMatch = line.match(/(?:saree\s+)?fabric[^\w\s]*\s*[:.\-–—=]+\s*(.+)/i);
    if (fabricMatch) {
      const val = fabricMatch[1].trim();
      if (currentSection === 'blouse' || /blouse/i.test(line)) {
        blouseFabricText = val;
      } else {
        sareeFabricText = val;
      }
    }

    // Explicit Work line (e.g. "Work :-", "Work. :-")
    const workMatch = line.match(/(?:work|craft|embroidery)[^\w\s]*\s*[:.\-–—=]+\s*(.+)/i);
    if (workMatch) {
      workText = (workText ? `${workText} ` : '') + workMatch[1].trim();
    }

    // Explicit Border line (e.g. "Border :-", "Pallu :-")
    const borderMatch = line.match(/(?:border|pallu|palla)[^\w\s]*\s*[:.\-–—=]+\s*(.+)/i);
    if (borderMatch) {
      borderText = (borderText ? `${borderText} ` : '') + borderMatch[1].trim();
    }

    // Explicit Cut / Length line (e.g. "Cut :-", "Cut. :-", "Length :-")
    const cutMatch = line.match(/(?:cut|length|meter|mtr)[^\w\s]*\s*[:.\-–—=]+\s*(.+)/i);
    if (cutMatch) {
      const val = cutMatch[1].trim();
      if (currentSection === 'blouse' || /blouse/i.test(line)) {
        blouseCutText = val;
      } else {
        sareeCutText = val;
      }
    }

    // Explicit Blouse line
    const blouseMatch = line.match(/blouse[^\w\s]*\s*[:.\-–—=]+\s*(.+)/i);
    if (blouseMatch && !blouseFabricText) {
      blouseText = blouseMatch[1].trim();
    }
  }

  return {
    sareeFabricText,
    blouseFabricText,
    workText,
    borderText,
    sareeCutText,
    blouseCutText,
    blouseText,
    rawCombined: clean,
  };
}

/**
 * Extract numerical dimensions (saree length, blouse cut, bust size, flare)
 */
function extractDimensions(sections: ParsedSections, fullText: string): ExtractedDimensions {
  const dimensions: ExtractedDimensions = {};
  const searchSource = `${sections.rawCombined} ${fullText}`.toLowerCase();

  // 1. Saree length from explicit saree cut section or full text
  if (sections.sareeCutText) {
    const m = sections.sareeCutText.match(/(\d+(?:\.\d+)?)/);
    if (m) {
      const val = parseFloat(m[1]);
      if (val >= 4.5 && val <= 9.0) dimensions.saree_length_m = val;
    }
  }
  if (!dimensions.saree_length_m) {
    const sareeCutMatch = fullText.match(/(?:saree\s*(?:cut|length)?\s*[:.\-–—=]?\s*|cut\s*[:.\-–—=]?\s*)(\d+(?:\.\d+)?)\s*(?:mtr|meter|m\b)/i);
    if (sareeCutMatch) {
      const val = parseFloat(sareeCutMatch[1]);
      if (val >= 4.5 && val <= 9.0) dimensions.saree_length_m = val;
    }
  }

  // 2. Blouse cut from explicit blouse cut section or full text
  if (sections.blouseCutText) {
    const m = sections.blouseCutText.match(/(\d+(?:\.\d+)?)/);
    if (m) {
      const val = parseFloat(m[1]);
      if (val >= 0.7 && val <= 2.0) dimensions.blouse_length_m = val;
    }
  }
  if (!dimensions.blouse_length_m) {
    const blouseCutMatch = fullText.match(/(?:blouse\s*(?:cut|length)?\s*[:.\-–—=]?\s*)(\d+(?:\.\d+)?)\s*(?:mtr|meter|m\b)/i);
    if (blouseCutMatch) {
      const val = parseFloat(blouseCutMatch[1]);
      if (val >= 0.7 && val <= 2.0) dimensions.blouse_length_m = val;
    }
  }

  // 3. Total saree + blouse cut (6.3m or 6.30m)
  const totalCutMatch = searchSource.match(/(\d+(?:\.\d+)?)\s*(?:mtr|meter|m\b)\s*(?:saree with blouse|total cut|combo cut|saree\s*\+\s*blouse)/i);
  if (totalCutMatch) {
    const val = parseFloat(totalCutMatch[1]);
    if (val >= 6.0 && val <= 7.0) {
      dimensions.total_length_m = val;
      if (!dimensions.saree_length_m) dimensions.saree_length_m = 5.5;
      if (!dimensions.blouse_length_m) dimensions.blouse_length_m = 0.8;
    }
  }

  // Default saree length if cut is 5.5m
  if (!dimensions.saree_length_m && searchSource.includes('5.5')) {
    dimensions.saree_length_m = 5.5;
  }
  if (!dimensions.blouse_length_m && (searchSource.includes('0.8') || searchSource.includes('0.80'))) {
    dimensions.blouse_length_m = 0.8;
  }

  // 4. Stitched size / bust (e.g. "stitched up to 40", "up to 40", "size 38-42", "bust 40", "40 bust")
  const sizeMatch =
    searchSource.match(/(?:(?:stitched[^\d\n]*?)?up\s+to|bust|size|chest)\s*[:.\-–—=]?\s*(\d{2})\b/i) ||
    searchSource.match(/\b(\d{2})\s*(?:inch|in|"|bust)\b/i);
  if (sizeMatch) {
    const num = parseInt(sizeMatch[1], 10);
    if (num >= 28 && num <= 54) {
      dimensions.size_bust_in = num;
      dimensions.size_label = `${num}" Bust`;
    }
  }

  // 5. Flare / Gher (e.g. "3.5 mtr flare", "3 meter gher")
  const flareMatch = searchSource.match(/(\d+(?:\.\d+)?)\s*(?:mtr|meter|m\b)?\s*(?:flare|flair|gher)/i);
  if (flareMatch) {
    const val = parseFloat(flareMatch[1]);
    if (val >= 2.0 && val <= 8.0) {
      dimensions.flare_m = val;
    }
  }

  return dimensions;
}

interface CandidateFacetMatch {
  facet: TaxonomyFacet;
  matchedTerm: string;
  matchLength: number;
}

/**
 * Match a target text against a dimension's compiled matchers.
 * Ranks matched facets by the length of the matched term (longest, most specific match wins).
 */
function findMatchingFacets(
  text: string,
  matchers: CompiledFacetMatcher[],
  matchedFacetIds: Set<string>,
  maxMatches: number = 5
): { primary: string | null; all: string[] } {
  const candidates: CandidateFacetMatch[] = [];
  const normalizedText = ` ${text} `;

  for (const item of matchers) {
    let bestTermForFacet: { term: string; length: number } | null = null;
    for (const termObj of item.terms) {
      if (termObj.regex.test(normalizedText)) {
        if (!bestTermForFacet || termObj.length > bestTermForFacet.length) {
          bestTermForFacet = termObj;
        }
      }
    }
    if (bestTermForFacet) {
      candidates.push({
        facet: item.facet,
        matchedTerm: bestTermForFacet.term,
        matchLength: bestTermForFacet.length,
      });
    }
  }

  // Sort candidates by matchLength descending (e.g. "pure katan silk" > "silk")
  // Secondary sort by facet usage_count descending
  candidates.sort((a, b) => {
    if (b.matchLength !== a.matchLength) {
      return b.matchLength - a.matchLength;
    }
    return (b.facet.usage_count || 0) - (a.facet.usage_count || 0);
  });

  const matchedCanonicalNames: string[] = [];
  for (const cand of candidates) {
    if (!matchedCanonicalNames.includes(cand.facet.canonical_name)) {
      matchedCanonicalNames.push(cand.facet.canonical_name);
      matchedFacetIds.add(cand.facet.id);
    }
    if (matchedCanonicalNames.length >= maxMatches) {
      break;
    }
  }

  return {
    primary: matchedCanonicalNames[0] || null,
    all: matchedCanonicalNames,
  };
}

/**
 * Main Multi-Dimensional Extraction Engine
 * Takes concatenated text (from title, description, vendor listing, message group)
 * and extracts all canonical dimensions using the TaxonomyRegistry.
 */
export function extractMultiDimensionalMetadata(
  text: string,
  existingAttributes?: Record<string, any> | null,
  registry?: TaxonomyRegistry
): ExtractedMetadataResult {
  if (!text || typeof text !== 'string') {
    return {
      fabric_base: null,
      craft_technique: null,
      craft_techniques: [],
      motif_pattern: null,
      motif_patterns: [],
      border_pallu: null,
      border_pallus: [],
      blouse_format: null,
      stitch_type: null,
      base_stitch_type: null,
      occasions: ['Festive Celebrations'],
      dimensions: {},
      tags: [],
      matchedFacetIds: [],
      matchedFacetsSummary: [],
      confidence: 0,
    };
  }

  const sections = parseListingSections(text);
  const matchedFacetIds = new Set<string>();
  const fullText = sections.rawCombined;

  // 1. FABRIC BASE
  let fabricBase: string | null = null;
  const fabricMatchers = registry?.getMatchers('fabric') || [];

  // Check explicit Saree Fabric section first
  if (sections.sareeFabricText && fabricMatchers.length > 0) {
    const res = findMatchingFacets(sections.sareeFabricText, fabricMatchers, matchedFacetIds, 1);
    fabricBase = res.primary;
  }

  // Fallback to full text search for fabric
  if (!fabricBase && fabricMatchers.length > 0) {
    const res = findMatchingFacets(fullText, fabricMatchers, matchedFacetIds, 1);
    fabricBase = res.primary;
  }

  // 2. CRAFT & EMBELLISHMENT
  const craftMatchers = registry?.getMatchers('craft') || [];
  const embMatchers = registry?.getMatchers('embellishment') || [];
  const combinedCraftMatchers = [...craftMatchers, ...embMatchers];

  let matchedCrafts: string[] = [];
  if (sections.workText && combinedCraftMatchers.length > 0) {
    const res = findMatchingFacets(sections.workText, combinedCraftMatchers, matchedFacetIds, 4);
    matchedCrafts.push(...res.all);
  }
  if (combinedCraftMatchers.length > 0) {
    const res = findMatchingFacets(fullText, combinedCraftMatchers, matchedFacetIds, 4);
    for (const c of res.all) {
      if (!matchedCrafts.includes(c)) matchedCrafts.push(c);
    }
  }
  const craftTechnique = matchedCrafts[0] || null;

  // 3. MOTIF & PATTERN
  const motifMatchers = registry?.getMatchers('motif') || [];
  let matchedMotifs: string[] = [];
  if (motifMatchers.length > 0) {
    const res = findMatchingFacets(fullText, motifMatchers, matchedFacetIds, 3);
    matchedMotifs = res.all;
  }
  const motifPattern = matchedMotifs[0] || null;

  // 4. BORDER & PALLU
  const borderMatchers = registry?.getMatchers('border') || [];
  let matchedBorders: string[] = [];
  if (sections.borderText && borderMatchers.length > 0) {
    const res = findMatchingFacets(sections.borderText, borderMatchers, matchedFacetIds, 2);
    matchedBorders.push(...res.all);
  }
  if (borderMatchers.length > 0) {
    const res = findMatchingFacets(fullText, borderMatchers, matchedFacetIds, 2);
    for (const b of res.all) {
      if (!matchedBorders.includes(b)) matchedBorders.push(b);
    }
  }
  const borderPallu = matchedBorders[0] || null;

  // 5. BLOUSE FORMAT
  const blouseMatchers = registry?.getMatchers('blouse') || [];
  let blouseFormat: string | null = null;
  const blouseSearchText = `${sections.blouseText || ''} ${sections.blouseFabricText || ''} ${fullText}`;

  if (blouseMatchers.length > 0) {
    const res = findMatchingFacets(blouseSearchText, blouseMatchers, matchedFacetIds, 1);
    blouseFormat = res.primary;
  }

  // Heuristic blouse format if not explicitly matched from registry
  if (!blouseFormat) {
    const lower = blouseSearchText.toLowerCase();
    if (lower.includes('running blouse') || lower.includes('same fabric blouse')) {
      blouseFormat = 'Unstitched Running Blouse';
    } else if (lower.includes('contrast blouse') || lower.includes('mono banglory') || lower.includes('heavy blouse')) {
      blouseFormat = 'Unstitched Contrast Blouse';
    } else if (lower.includes('stitched blouse') || lower.includes('readymade blouse') || lower.includes('ready blouse')) {
      blouseFormat = 'Pre-Stitched Designer Blouse';
    } else if (lower.includes('without blouse')) {
      blouseFormat = 'Without Blouse';
    }
  }

  // 6. STITCH TYPE
  const stitchMatchers = registry?.getMatchers('stitch') || [];
  let stitchType: string | null = null;
  let baseStitchType: string | null = null;

  if (stitchMatchers.length > 0) {
    const res = findMatchingFacets(fullText, stitchMatchers, matchedFacetIds, 1);
    stitchType = res.primary;
  }

  // Refine stitch type and assign base product column stitch_type
  const lowerFull = fullText.toLowerCase();
  if (
    lowerFull.includes('ready to wear') ||
    lowerFull.includes('pre-pleated') ||
    lowerFull.includes('1-minute saree') ||
    lowerFull.includes('pre-stitched')
  ) {
    stitchType = 'Pre-Stitched / Ready to Wear';
    baseStitchType = 'Pre-Stitched / Ready to Wear';
  } else if (lowerFull.includes('semi-stitched') || lowerFull.includes('semi stitched')) {
    stitchType = 'Semi-Stitched Lehenga + Canvas';
    baseStitchType = 'Semi-Stitched';
  } else if (lowerFull.includes('stitched 3-piece') || lowerFull.includes('kurti pant dupatta')) {
    stitchType = 'Stitched Suit + Elastic Pant + Dupatta';
    baseStitchType = 'Stitched';
  } else if (lowerFull.includes('stitched blouse') && lowerFull.includes('saree')) {
    stitchType = 'Unstitched Saree + Stitched Blouse';
    baseStitchType = 'Unstitched (Saree), Stitched (Blouse)';
  } else if (
    lowerFull.includes('unstitched') ||
    lowerFull.includes('un-stitch') ||
    lowerFull.includes('unstitch') ||
    lowerFull.includes('5.5 mtr') ||
    lowerFull.includes('saree with blouse')
  ) {
    stitchType = stitchType || 'Unstitched Saree + Blouse';
    baseStitchType = 'Unstitched';
  } else if (lowerFull.includes('fully stitched') || lowerFull.includes('full stitched')) {
    stitchType = stitchType || 'Stitched';
    baseStitchType = 'Fully Stitched';
  } else if (lowerFull.includes('stitched')) {
    stitchType = stitchType || 'Stitched';
    baseStitchType = 'Stitched';
  } else if (stitchType) {
    if (stitchType.includes('Unstitched')) baseStitchType = 'Unstitched';
    else if (stitchType.includes('Ready to Wear')) baseStitchType = 'Pre-Stitched / Ready to Wear';
    else if (stitchType.includes('Semi-Stitched')) baseStitchType = 'Semi-Stitched';
    else baseStitchType = stitchType;
  }

  // 7. OCCASIONS
  const occasionMatchers = registry?.getMatchers('occasion') || [];
  let matchedOccasions: string[] = [];
  if (occasionMatchers.length > 0) {
    const res = findMatchingFacets(fullText, occasionMatchers, matchedFacetIds, 3);
    matchedOccasions = res.all;
  }
  if (matchedOccasions.length === 0) {
    // Default contextual occasions
    if (lowerFull.includes('wedding') || lowerFull.includes('bridal') || lowerFull.includes('shaadi')) {
      matchedOccasions.push('Wedding & Bridal Trousseau');
    }
    if (lowerFull.includes('party') || lowerFull.includes('cocktail')) {
      matchedOccasions.push('Party & Cocktail Wear');
    }
    if (lowerFull.includes('puja') || lowerFull.includes('pooja') || lowerFull.includes('festive') || lowerFull.includes('diwali')) {
      matchedOccasions.push('Festive Celebrations');
    }
    if (matchedOccasions.length === 0) {
      matchedOccasions.push('Festive Celebrations');
    }
  }

  // 8. DIMENSIONS
  const dimensions = extractDimensions(sections, fullText);

  // 9. SYNTHESIZED TAGS
  const tagSet = new Set<string>();
  if (fabricBase) tagSet.add(fabricBase.toLowerCase());
  matchedCrafts.forEach(c => tagSet.add(c.toLowerCase()));
  matchedMotifs.forEach(m => tagSet.add(m.toLowerCase()));
  matchedBorders.forEach(b => tagSet.add(b.toLowerCase()));
  if (blouseFormat) tagSet.add(blouseFormat.toLowerCase());
  if (baseStitchType) tagSet.add(baseStitchType.toLowerCase());
  matchedOccasions.forEach(o => tagSet.add(o.toLowerCase()));

  // Confidence score based on number of dimensions extracted
  let score = 50;
  if (fabricBase) score += 20;
  if (craftTechnique) score += 10;
  if (borderPallu) score += 5;
  if (blouseFormat) score += 5;
  if (stitchType) score += 5;
  if (Object.keys(dimensions).length > 0) score += 5;

  // Summarize matched facets for DB usage count updates
  const summary: { dimension: string; canonical_name: string }[] = [];
  if (registry) {
    const allFacets = registry.getAllFacets();
    matchedFacetIds.forEach(id => {
      const found = allFacets.find(f => f.id === id);
      if (found) {
        summary.push({ dimension: found.dimension, canonical_name: found.canonical_name });
      }
    });
  }

  return {
    fabric_base: fabricBase,
    craft_technique: craftTechnique,
    craft_techniques: matchedCrafts,
    motif_pattern: motifPattern,
    motif_patterns: matchedMotifs,
    border_pallu: borderPallu,
    border_pallus: matchedBorders,
    blouse_format: blouseFormat,
    stitch_type: stitchType,
    base_stitch_type: baseStitchType,
    occasions: matchedOccasions,
    dimensions,
    tags: Array.from(tagSet),
    matchedFacetIds: Array.from(matchedFacetIds),
    matchedFacetsSummary: summary,
    confidence: Math.min(score, 100),
  };
}

/**
 * Merge extracted metadata into unified_attributes JSONB
 */
export function formatUnifiedAttributesWithTaxonomy(
  existingAttributes: Record<string, any> | null | undefined,
  extracted: ExtractedMetadataResult
): Record<string, any> {
  const current = existingAttributes || {};

  return {
    ...current,
    fabric: extracted.fabric_base || current.fabric || 'Unknown',
    fabric_base: extracted.fabric_base || current.fabric_base || null,
    craft_technique: extracted.craft_technique || current.craft_technique || null,
    craft_techniques: extracted.craft_techniques.length > 0 ? extracted.craft_techniques : current.craft_techniques || [],
    motif_pattern: extracted.motif_pattern || current.motif_pattern || null,
    motif_patterns: extracted.motif_patterns.length > 0 ? extracted.motif_patterns : current.motif_patterns || [],
    border_pallu: extracted.border_pallu || current.border_pallu || null,
    border_pallus: extracted.border_pallus.length > 0 ? extracted.border_pallus : current.border_pallus || [],
    blouse_format: extracted.blouse_format || current.blouse_format || null,
    stitch_type: extracted.stitch_type || current.stitch_type || 'Unstitched',
    occasions: extracted.occasions.length > 0 ? extracted.occasions : current.occasions || ['Festive Celebrations'],
    dimensions: {
      ...(current.dimensions || {}),
      ...extracted.dimensions,
    },
    taxonomy_version: '2.0',
    taxonomy_derived_at: new Date().toISOString(),
    confidence_score: extracted.confidence,
  };
}
