-- =============================================================================
-- Migration 023: Dynamic Taxonomy Registry Schema and Census Seeding
-- ADO Work Item: #681 (Parent Story: #680)
-- Target Database: deeplens_platform
--
-- Description:
-- Establishes the dynamic taxonomy facets registry for DeepLens platform.
-- Stores canonical dimensions, aliases, usage frequencies, and verification
-- status derived from the census of 229,205 WhatsApp messages, 10,981 groups,
-- and 11,354 catalog products.
-- =============================================================================

BEGIN;

-- 1. Create taxonomy_facets table
CREATE TABLE IF NOT EXISTS public.taxonomy_facets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension VARCHAR(50) NOT NULL,
    canonical_name VARCHAR(100) NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    usage_count INT NOT NULL DEFAULT 1,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes and Constraints
-- Case-insensitive unique constraint per dimension
CREATE UNIQUE INDEX IF NOT EXISTS uq_taxonomy_facets_dimension_canonical 
    ON public.taxonomy_facets (dimension, lower(canonical_name));

-- Fast filtering by dimension
CREATE INDEX IF NOT EXISTS idx_taxonomy_facets_dimension 
    ON public.taxonomy_facets (dimension);

-- Fast ordering by usage frequency
CREATE INDEX IF NOT EXISTS idx_taxonomy_facets_usage_count 
    ON public.taxonomy_facets (usage_count DESC);

-- GIN index on text array of aliases for fast multi-alias containment lookups
CREATE INDEX IF NOT EXISTS idx_taxonomy_facets_aliases_gin 
    ON public.taxonomy_facets USING GIN (aliases);

-- 3. Trigger for updated_at maintenance
DROP TRIGGER IF EXISTS trg_taxonomy_facets_updated_at ON public.taxonomy_facets;
CREATE TRIGGER trg_taxonomy_facets_updated_at
    BEFORE UPDATE ON public.taxonomy_facets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Seed Canonical Dimensions & Census Terms
INSERT INTO public.taxonomy_facets (dimension, canonical_name, aliases, usage_count, is_verified, metadata)
VALUES
    -- ── FABRICS (dimension: fabric) ──────────────────────────────────────────
    ('fabric', 'Georgette', ARRAY['Micro Georgette', 'Faux Georgette', 'Fox Georgette', 'Pure Georgette', 'Viscose Georgette', 'Georgette Silk'], 1288, true, '{"badge": "Popular", "weight_class": "light"}'::jsonb),
    ('fabric', 'Crepe Silk', ARRAY['Crepe', 'Silk Crepe', 'Pure Crepe Silk', 'French Crepe', 'Crepe Satin'], 241, true, '{"badge": "Trending", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Satin', ARRAY['Satin Silk', 'Silk Satin', 'Pure Satin', 'Barbie Satin', 'Glossy Satin'], 397, true, '{"badge": "Popular", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Rangoli Silk', ARRAY['Rangoli', 'Rangoli Georgette', 'Rangoli Satin', 'Rangoli Crepe'], 185, true, '{"badge": "Trending", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Micro Cotton', ARRAY['Micro', 'Pure Micro Cotton', 'Micro Blend', 'Micro Silk Cotton'], 142, true, '{"badge": "Daily", "weight_class": "light"}'::jsonb),
    ('fabric', 'Chinon Silk', ARRAY['Chinon', 'Pure Chinon', 'Chinnon', 'Chinnon Silk', 'Chinon Chiffon'], 212, true, '{"badge": "Trending", "weight_class": "light"}'::jsonb),
    ('fabric', 'Space Silk', ARRAY['Space', 'Space Satin', 'Space Cotton', 'Space Silk Georgette'], 95, true, '{"badge": "Modern", "weight_class": "light"}'::jsonb),
    ('fabric', 'Fendy Silk/Satin', ARRAY['Fendy', 'Fendy Silk', 'Fendy Satin', 'Fendi Silk', 'Fendi Satin'], 110, true, '{"badge": "Designer", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Tissue Silk', ARRAY['Tissue', 'Tissue Organza', 'Metallic Tissue', 'Gold Tissue', 'Silver Tissue'], 165, true, '{"badge": "Festive", "weight_class": "light"}'::jsonb),
    ('fabric', 'Linen Cotton', ARRAY['Linen', 'Cotton Linen', 'Pure Linen', 'Handspun Linen', 'Linen Slub'], 215, true, '{"badge": "Handloom", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Mul Cotton', ARRAY['Mulmul', 'Mulmul Cotton', 'Malmal', 'Malmal Cotton', 'Pure Mulmul'], 190, true, '{"badge": "Handloom", "weight_class": "light"}'::jsonb),
    ('fabric', 'Net', ARRAY['Soft Net', 'Super Net', 'Bridal Net', 'Butterfly Net', 'Designer Net'], 175, true, '{"badge": "Festive", "weight_class": "light"}'::jsonb),
    ('fabric', 'Dupion Silk', ARRAY['Dupion', 'Duppion', 'Raw Silk', 'Matka Silk', 'Dupion Art Silk'], 135, true, '{"badge": "Heritage", "weight_class": "heavy"}'::jsonb),
    ('fabric', 'Chanderi', ARRAY['Chanderi Silk', 'Chanderi Cotton', 'Pure Chanderi', 'Chanderi Katan', 'Chanderi Pattu'], 203, true, '{"badge": "Handloom", "weight_class": "light"}'::jsonb),
    ('fabric', 'Dola Silk', ARRAY['Dola', 'Pure Dola Silk', 'Dola Silk Jacquard', 'Dola Pattu'], 249, true, '{"badge": "Trending", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Gajji Silk', ARRAY['Gajji', 'Pure Gajji Silk', 'Gajji Satin', 'Bandhani Gajji'], 120, true, '{"badge": "Heritage", "weight_class": "heavy"}'::jsonb),
    ('fabric', 'Tussar Silk', ARRAY['Tussar', 'Kosa Silk', 'Wild Silk', 'Pure Tussar', 'Bhagalpuri Tussar'], 145, true, '{"badge": "Handloom", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Organza Silk', ARRAY['Organza', 'Pure Organza', 'Kora Organza', 'Glass Organza', 'Organza Sheer'], 122, true, '{"badge": "Trending", "weight_class": "light"}'::jsonb),
    ('fabric', 'Khadi Cotton', ARRAY['Khadi', 'Handspun Khadi', 'Khadi Silk', 'Artisanal Khadi'], 98, true, '{"badge": "Handloom", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Vichitra Silk', ARRAY['Vichitra', 'Vichitra Satin', 'Vichitra Art Silk'], 160, true, '{"badge": "Popular", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Lichi Silk', ARRAY['Lichi', 'Litchi Silk', 'Litchi', 'Lichi Jacquard Silk'], 140, true, '{"badge": "Popular", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Pure Katan Silk', ARRAY['Katan Silk', 'Katan', 'Pure Katan', 'Banarasi Katan', 'Katan Brocade'], 310, true, '{"badge": "Heritage", "weight_class": "heavy"}'::jsonb),
    ('fabric', 'Vari Chiffon', ARRAY['Chiffon', 'Pure Chiffon', 'Vari Silk', 'Silk Chiffon', '60gm Chiffon'], 180, true, '{"badge": "Popular", "weight_class": "light"}'::jsonb),
    ('fabric', 'Rayon', ARRAY['Heavy Rayon', '14kg Rayon', 'Viscose Rayon', 'Rayon Slub'], 220, true, '{"badge": "Daily", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Marshmallow Silk', ARRAY['Marshmallow', 'Marshmallow Crepe', 'Marshmallow Satin'], 75, true, '{"badge": "Modern", "weight_class": "medium"}'::jsonb),
    ('fabric', 'Teby Silk', ARRAY['Teby', 'Tabby Silk', 'Taby Silk', 'Tabby Organza'], 85, true, '{"badge": "Modern", "weight_class": "light"}'::jsonb),
    ('fabric', 'Kanchi Cotton', ARRAY['Kanchipuram Cotton', 'Kanchi', 'Kanchi Handloom Cotton'], 115, true, '{"badge": "Handloom", "weight_class": "heavy"}'::jsonb),
    ('fabric', 'Jute Silk', ARRAY['Jute', 'Jute Ghicha', 'Jute Blend', 'Jute Silk Cotton'], 65, true, '{"badge": "Handloom", "weight_class": "heavy"}'::jsonb),
    ('fabric', 'Russian Jacquard', ARRAY['Russian Silk', 'Russian Silk Jacquard', 'Russian Silk Brocade'], 130, true, '{"badge": "Festive", "weight_class": "heavy"}'::jsonb),

    -- ── CRAFTS & TECHNIQUES (dimension: craft) ───────────────────────────────
    ('craft', 'Digital High-Definition Print', ARRAY['Digital Print', 'HD Print', 'Digital Printed', 'Sublimation Print', 'Floral Digital Print'], 1270, true, '{"badge": "Popular"}'::jsonb),
    ('craft', 'Jacquard Weaving', ARRAY['Jacquard', 'Jacquard Weave', 'Brocade Weaving', 'Zari Jacquard', 'Woven Jacquard'], 279, true, '{"badge": "Heritage"}'::jsonb),
    ('craft', 'Bandhani & Tie-Dye', ARRAY['Bandhani', 'Tie-Dye', 'Bandhej', 'Knot Dye', 'Jaipuri Bandhani'], 137, true, '{"badge": "Handloom"}'::jsonb),
    ('craft', 'Kalamkari Art', ARRAY['Kalamkari', 'Pen Kalamkari', 'Hand Kalamkari', 'Kalamkari Print', 'Srikalahasti Kalamkari'], 167, true, '{"badge": "Artisanal"}'::jsonb),
    ('craft', 'Ajrakh Block Print', ARRAY['Ajrakh', 'Ajrak', 'Hand Block Print', 'Ajrakh Print', 'Natural Ajrakh'], 193, true, '{"badge": "Handloom"}'::jsonb),
    ('craft', 'Minakari / Alfi Weft Inlay', ARRAY['Minakari', 'Meenakari', 'Alfi Weave', 'Meenakari Weave', 'Resham Inlay', 'Meenakari Boota'], 115, true, '{"badge": "Master Craft"}'::jsonb),
    ('craft', 'Patola & Double Ikkat', ARRAY['Patola', 'Double Ikat', 'Patan Patola', 'Ikkat', 'Ikat', 'Pochampally Ikat'], 99, true, '{"badge": "Heritage"}'::jsonb),
    ('craft', 'Leheriya & Chevron Dye', ARRAY['Leheriya', 'Lehariya', 'Chevron Dye', 'Wave Dye', 'Mothda Leheriya'], 88, true, '{"badge": "Festive"}'::jsonb),
    ('craft', 'Hand / Vat Dyeing', ARRAY['Hand Dyeing', 'Vat Dye', 'Dip Dye', 'Natural Dyeing', 'Ombre Dye'], 72, true, '{"badge": "Artisanal"}'::jsonb),
    ('craft', 'Foil Stamping', ARRAY['Foil Print', 'Gold Foil', 'Silver Foil', 'Foil Stamped', 'Metallic Foil'], 155, true, '{"badge": "Festive"}'::jsonb),
    ('craft', 'Batik Wax Resist', ARRAY['Batik', 'Batik Print', 'Wax Resist Dye', 'Hand Batik'], 64, true, '{"badge": "Artisanal"}'::jsonb),
    ('craft', 'Jamdani Weave', ARRAY['Jamdani', 'Dhakai Jamdani', 'Jamdani Shuttle', 'Floral Jamdani'], 82, true, '{"badge": "Master Craft"}'::jsonb),
    ('craft', 'Chikankari & Lucknowi', ARRAY['Chikankari', 'Lucknowi Work', 'Chikan Work', 'Bakhiya Handwork', 'Shadow Work'], 148, true, '{"badge": "Artisanal"}'::jsonb),

    -- ── EMBELLISHMENTS & WORK (dimension: embellishment) ─────────────────────
    ('embellishment', 'Sequins (3mm/Micro)', ARRAY['Sequins Work', '3mm Sequins', 'Micro Sequins', 'Sitara Work', 'Tone-to-Tone Sequins'], 685, true, '{"badge": "Trending"}'::jsonb),
    ('embellishment', 'Mirror Work (Real & Foil)', ARRAY['Mirror Work', 'Foil Mirror', 'Real Mirror', 'Abhla Work', 'Sheesha Work'], 551, true, '{"badge": "Popular"}'::jsonb),
    ('embellishment', 'Latkan & Tassels (Pumpum)', ARRAY['Latkan', 'Tassels', 'Pumpum', 'Resham Latkan', 'Handmade Latkan', 'Designer Latkan'], 303, true, '{"badge": "Popular"}'::jsonb),
    ('embellishment', 'Cutwork & Scallop (Aarco)', ARRAY['Cutwork', 'Scallop Work', 'Aarco Work', 'Scalloped Border', 'Cutwork Scallop'], 95, true, '{"badge": "Designer"}'::jsonb),
    ('embellishment', 'Beads & Bhungali Work', ARRAY['Beads Work', 'Bhungali Work', 'Moti Work', 'Pipe Work', 'Bhungali Pipe'], 112, true, '{"badge": "Handwork"}'::jsonb),
    ('embellishment', 'Cutdana & Walmoti Handwork', ARRAY['Cutdana Work', 'Cutdana', 'Walmoti', 'Glass Beads Handwork', 'Cutdana Embroidery'], 138, true, '{"badge": "Handwork"}'::jsonb),
    ('embellishment', 'Khatli Frame Handwork', ARRAY['Khatli Work', 'Khatli Handwork', 'Aari Khatli', 'Adda Work', 'Frame Handwork'], 46, true, '{"badge": "Master Craft"}'::jsonb),
    ('embellishment', 'Dhaga / Thread Embroidery', ARRAY['Dhaga Work', 'Thread Work', 'Resham Embroidery', 'Cotton Thread Work', 'Multi Thread'], 260, true, '{"badge": "Popular"}'::jsonb),
    ('embellishment', 'Maggam Work', ARRAY['Maggam', 'Aari Work', 'Zardozi Maggam', 'Bridal Maggam', 'Hand Maggam'], 129, true, '{"badge": "Bridal"}'::jsonb),
    ('embellishment', 'Peacock & Bird Motifs', ARRAY['Peacock Motif', 'Mayur Motif', 'Mor Motif', 'Bird Motif', 'Shikargah', 'Dancing Peacock'], 178, true, '{"badge": "Heritage"}'::jsonb),
    ('embellishment', 'Gota Patti & Samosa Lace', ARRAY['Gota Patti', 'Samosa Lace', 'Gota Work', 'Lappe Ka Kaam', 'Gota Border'], 210, true, '{"badge": "Festive"}'::jsonb),
    ('embellishment', 'Dori & Multi-Coding Work', ARRAY['Dori Work', 'Coding Work', 'Multi-Coding', 'Cord Embroidery', 'Dori Embroidery'], 165, true, '{"badge": "Designer"}'::jsonb),
    ('embellishment', 'Elephant Motifs (Haathi)', ARRAY['Haathi Motif', 'Elephant Motif', 'Gaja Motif', 'Royal Elephant'], 92, true, '{"badge": "Heritage"}'::jsonb),
    ('embellishment', 'Dulha-Dulhan Motifs', ARRAY['Dulha Dulhan', 'Baraat Motif', 'Bridal Couple Motif', 'Doli Motif', 'Vivah Motif'], 58, true, '{"badge": "Bridal"}'::jsonb),

    -- ── BORDERS & PALLU (dimension: border) ──────────────────────────────────
    ('border', 'Jacquard Rich Pallu', ARRAY['Rich Pallu', 'Brocade Pallu', 'Heavy Jacquard Pallu', 'Zari Pallu', 'Grand Pallu'], 420, true, '{"badge": "Heritage"}'::jsonb),
    ('border', 'Woven Zari Border', ARRAY['Zari Border', 'Gold Zari Border', 'Silver Zari Border', 'Woven Border', 'Zari Weaving Border'], 380, true, '{"badge": "Traditional"}'::jsonb),
    ('border', 'Contrast Border & Pallu', ARRAY['Contrast Border', 'Contrast Pallu', 'Korvai Border', 'Two Tone Border'], 290, true, '{"badge": "Popular"}'::jsonb),
    ('border', 'Cutwork Scallop Border', ARRAY['Scallop Border', 'Cutwork Border', 'Aarco Border', 'Embroidered Scallop Border'], 140, true, '{"badge": "Trending"}'::jsonb),
    ('border', 'C-Pallu (Arched Pallu)', ARRAY['C-Pallu', 'Arched Pallu', 'C Pallu Shape', 'Curved Pallu'], 88, true, '{"badge": "Designer"}'::jsonb),
    ('border', 'Tassels / Latkan Attached Pallu', ARRAY['Tassel Pallu', 'Latkan Pallu', 'Fringe Pallu', 'Resham Tassels Pallu', 'Handmade Tassels Pallu'], 235, true, '{"badge": "Popular"}'::jsonb),
    ('border', 'Temple Border', ARRAY['Temple Design Border', 'Temple Spire Border', 'Gopuram Border', 'Korvai Temple Border'], 175, true, '{"badge": "Heritage"}'::jsonb),
    ('border', 'Contrast Piping Border', ARRAY['Piping Border', 'Satin Piping', 'Contrast Piping', 'Silk Piping'], 130, true, '{"badge": "Subtle"}'::jsonb),
    ('border', 'Cutdana & Moti Lace Border', ARRAY['Cutdana Border', 'Moti Lace Border', 'Handwork Lace Border', 'Designer Lace Border'], 115, true, '{"badge": "Festive"}'::jsonb),

    -- ── BLOUSES (dimension: blouse) ──────────────────────────────────────────
    ('blouse', 'Unstitched Running Blouse', ARRAY['Running Blouse', 'Running Blouse Piece', 'Matching Blouse', 'Same Fabric Blouse'], 1450, true, '{"type": "unstitched"}'::jsonb),
    ('blouse', 'Unstitched Contrast Blouse', ARRAY['Contrast Blouse', 'Contrast Blouse Piece', 'Separate Contrast Blouse', 'Contrast Heavy Blouse'], 820, true, '{"type": "unstitched"}'::jsonb),
    ('blouse', 'Pre-Stitched Designer Blouse', ARRAY['Ready Blouse', 'Readymade Blouse', 'Stitched Designer Blouse', 'Padded Blouse', 'Custom Fit Blouse'], 340, true, '{"type": "stitched"}'::jsonb),
    ('blouse', 'Brocade / Russian Jacquard', ARRAY['Brocade Blouse', 'Russian Jacquard Blouse', 'Heavy Brocade Blouse', 'Zari Brocade Blouse'], 280, true, '{"type": "unstitched"}'::jsonb),
    ('blouse', 'Embroidered / Khatli Blouse', ARRAY['Embroidered Blouse', 'Khatli Work Blouse', 'Handwork Blouse', 'Heavy Work Blouse', 'Maggam Work Blouse'], 215, true, '{"type": "embellished"}'::jsonb),

    -- ── STITCH TYPES (dimension: stitch) ─────────────────────────────────────
    ('stitch', 'Unstitched Saree + Blouse', ARRAY['Unstitched', 'Saree with Blouse Piece', 'Standard Saree 6.3m', '5.5m + 0.8m Blouse'], 2850, true, '{"category": "saree"}'::jsonb),
    ('stitch', 'Pre-Stitched / Ready to Wear', ARRAY['Ready to Wear', '1-Minute Saree', 'Pre-Pleated Saree', 'Pre-Stitched', 'Easy Drape Saree'], 420, true, '{"category": "saree"}'::jsonb),
    ('stitch', 'Semi-Stitched Lehenga + Canvas', ARRAY['Semi-Stitched', 'Semi-Stitched Lehenga', 'Lehenga with Canvas Patta', 'Can Can Lehenga'], 310, true, '{"category": "lehenga"}'::jsonb),
    ('stitch', 'Unstitched Saree + Stitched Blouse', ARRAY['Saree with Readymade Blouse', 'Unstitched Saree + Ready Blouse', 'Combo Saree Stitched Top'], 180, true, '{"category": "saree"}'::jsonb),
    ('stitch', 'Stitched Suit + Elastic Pant + Dupatta', ARRAY['Stitched 3-Piece Suit', 'Ready Suit Set', 'Kurti Pant Dupatta Set', 'Fully Stitched Salwar'], 260, true, '{"category": "dress"}'::jsonb),

    -- ── OCCASIONS (dimension: occasion) ──────────────────────────────────────
    ('occasion', 'Festive Celebrations', ARRAY['Festive', 'Diwali', 'Dussehra', 'Festive Wear', 'Festival', 'Pooja Celebration'], 620, true, '{"badge": "Heritage"}'::jsonb),
    ('occasion', 'Wedding & Bridal Trousseau', ARRAY['Wedding', 'Bridal', 'Shaadi Wear', 'Trousseau', 'Bridal Wear', 'Baraat Special'], 780, true, '{"badge": "Popular"}'::jsonb),
    ('occasion', 'Party & Cocktail Wear', ARRAY['Party Wear', 'Cocktail', 'Evening Party', 'Reception Party', 'Night Gala'], 410, true, '{"badge": "Trending"}'::jsonb),
    ('occasion', 'Navratri & Dandiya', ARRAY['Navratri', 'Dandiya Night', 'Garba Special', 'Chaniya Choli Festive', 'Navratri Collection'], 290, true, '{"badge": "Seasonal"}'::jsonb),
    ('occasion', 'Temple & Puja Heritage', ARRAY['Puja', 'Temple Wear', 'Pooja Special', 'Traditional Rituals', 'Spiritual Visit'], 350, true, '{"badge": "Heritage"}'::jsonb),
    ('occasion', 'Casual & Workday Handloom', ARRAY['Casual Wear', 'Office Wear', 'Daily Handloom', 'Workday', 'Daily Luxury'], 240, true, '{"badge": "Daily"}'::jsonb),
    ('occasion', 'Reception & Sangeet', ARRAY['Reception', 'Sangeet', 'Sangeet Ceremony', 'Engagement', 'Cocktail Sangeet'], 380, true, '{"badge": "Trending"}'::jsonb),
    ('occasion', 'Karwa Chauth & Teej', ARRAY['Karwa Chauth', 'Teej', 'Vrat Special', 'Karva Chauth Special', 'Haryali Teej'], 195, true, '{"badge": "Seasonal"}'::jsonb),
    ('occasion', 'Haldi & Mehendi Ceremonies', ARRAY['Haldi', 'Mehendi', 'Haldi Special', 'Mehendi Function', 'Yellow Ceremony', 'Green Ceremony'], 315, true, '{"badge": "Trending"}'::jsonb),

    -- ── MOTIFS & PATTERNS (dimension: motif) ─────────────────────────────────
    ('motif', 'Peacock & Bird Motifs', ARRAY['Peacock Motif', 'Mayur Motif', 'Mor Motif', 'Bird Motif', 'Shikargah', 'Dancing Peacock'], 178, true, '{"badge": "Heritage"}'::jsonb),
    ('motif', 'Elephant Motifs (Haathi)', ARRAY['Haathi Motif', 'Elephant Motif', 'Gaja Motif', 'Royal Elephant'], 92, true, '{"badge": "Heritage"}'::jsonb),
    ('motif', 'Dulha-Dulhan Motifs', ARRAY['Dulha Dulhan', 'Baraat Motif', 'Bridal Couple Motif', 'Doli Motif', 'Vivah Motif'], 58, true, '{"badge": "Bridal"}'::jsonb),
    ('motif', 'Floral Kadwa Bootis', ARRAY['Floral Booti', 'Kadwa Booti', 'Phool Buti', 'Small Boota', 'Malti Booti'], 145, true, '{"badge": "Handloom"}'::jsonb),
    ('motif', 'Jangla All-Over Jaal', ARRAY['Jangla Jaal', 'All-Over Floral Jaal', 'Floral Jaal', 'Dense Jaal Weave'], 120, true, '{"badge": "Master Craft"}'::jsonb),
    ('motif', 'Kalka Paisley / Ambi Motifs', ARRAY['Paisley', 'Ambi Motif', 'Kalka Motif', 'Mango Motif', 'Mughal Paisley'], 210, true, '{"badge": "Heritage"}'::jsonb),
    ('motif', 'Temple Spire & Rudraksha', ARRAY['Temple Spire', 'Rudraksha Motif', 'Gopuram Motif', 'Temple Booti'], 130, true, '{"badge": "Heritage"}'::jsonb),
    ('motif', 'Geometric Leheriya & Chevron', ARRAY['Leheriya Wave', 'Chevron Zigzag', 'Geometric Wave', 'Diagonal Chevron'], 95, true, '{"badge": "Modern"}'::jsonb),

    -- ── ZARI & METALLIC THREADS (dimension: zari) ───────────────────────────
    ('zari', 'Tested Gold Zari', ARRAY['Gold Zari', 'Tested Zari', 'Golden Thread', 'Half Fine Zari', 'Surat Gold Zari'], 520, true, '{"badge": "Traditional"}'::jsonb),
    ('zari', 'Antique Copper / Muted Zari', ARRAY['Antique Zari', 'Copper Zari', 'Muted Zari', 'Rose Gold Zari', 'Matte Zari'], 230, true, '{"badge": "Trending"}'::jsonb),
    ('zari', 'Tested Silver / White Zari', ARRAY['Silver Zari', 'White Zari', 'Roop Zari', 'Silver Thread'], 160, true, '{"badge": "Festive"}'::jsonb),
    ('zari', 'Resham Silk Thread Inlay', ARRAY['Resham Thread', 'Silk Thread Inlay', 'Pure Resham', 'Multicolor Resham'], 210, true, '{"badge": "Handloom"}'::jsonb),
    ('zari', 'Rose Gold Metallic Zari', ARRAY['Rose Gold', 'Rose Gold Zari', 'Pink Gold Metallic'], 95, true, '{"badge": "Modern"}'::jsonb)

ON CONFLICT (dimension, lower(canonical_name)) DO UPDATE
SET 
    aliases = EXCLUDED.aliases,
    usage_count = EXCLUDED.usage_count,
    is_verified = EXCLUDED.is_verified,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

COMMIT;
