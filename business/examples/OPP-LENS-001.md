---
id: OPP-LENS-001
type: opportunity
title: Mobile Fabric Swatch Visual Similarity Matching
status: accepted
phase: discover
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-LENS-001
  initiatives:
    - INI-LENS-001
---

# Opportunity: Mobile Fabric Swatch Visual Similarity Matching

## 1. Problem or Opportunity Statement
Boutique saree buyers struggle to describe intricate zari patterns, embroidery motifs, and subtle silk color palettes with text search. When browsing Instagram Reels or WhatsApp feeds, they capture screenshots of sarees but cannot quickly locate exact or similar pieces in the catalog.

## 2. Who Experiences It
- Premium ethnic fashion shoppers on mobile devices.
- WhatsApp sales stylists manually searching inventory to answer buyer screenshots.

## 3. Potential Business Value
- Est. 20–30% uplift in visual search conversions.
- Significant reduction in manual stylist turnaround time (from 15 minutes to < 10 seconds).

## 4. Current Evidence & Provenance
- **Fact:** 68% of inbound customer inquiries on WhatsApp contain an image or video screenshot rather than a product SKU or text name (Source: WhatsApp Processor logs, Oct 2026).
- **Fact:** Existing PostgreSQL pgvector search over 50,000 catalog SKUs takes 750–920ms under concurrent traffic.
- **Assumption:** Mobile users will actively utilize an on-device swatch crop tool if latency is imperceptible (< 150ms).
- **Hypothesis:** Caching top 10,000 active SKU visual embeddings in an ephemeral in-memory cache will drop search latency below 120ms without significant infrastructure cost.

## 5. Alternatives Considered
1. **Client-side on-device feature extraction:** Heavy mobile bundle (>35MB model download), battery drain on mid-tier Android phones.
2. **Synchronous full-table PostgreSQL vector scan:** Low upfront engineering, but unacceptable latency under peak traffic.
3. **Hybrid Redis ephemeral embedding cache with fallback:** Fast response times, low architectural complexity, reuses existing Redis cluster.

## 6. Known Constraints & Risks
- Edge network latency on mobile connections in Tier-2 Indian cities.
- Memory consumption in Redis if catalog scale exceeds 200,000 items.

## 7. Recommended Next Step
Progress to `Decide` phase; formulate Decision record evaluating caching architecture and client crop tool.
