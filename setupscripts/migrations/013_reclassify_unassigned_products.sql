-- Migration 013: Reclassify Unassigned Products (16-23 Aug Backfill & Category Rule Enhancement)
-- Target: public.products, public.categories, wa.message_groups
-- Azure DevOps: Bug #199 / Task #200 & Task #201

-- 1. Enrich classification_keywords in public.categories
UPDATE public.categories
SET classification_keywords = ARRAY[
    'saree', 'sari', 'saris', 'pattu', 'kanchi', 'kanjivaram', 'banarasi', 'georgette saree', 
    'silk saree', 'chanderi saree', 'organza saree', 'paithani', 'dola silk', 'tissue saree', 
    'tussar', 'pallu', 'gadwal', 'uppada', 'dharmavaram', 'pochampally', 'venkatagiri', 
    'kota silk', 'patola', 'bandhani saree', 'chiffon saree', 'handloom saree', 'designer saree',
    'pure silk', 'silk sarees', 'zari', 'blouse piece', 'running blouse'
]
WHERE slug = 'saree';

UPDATE public.categories
SET classification_keywords = ARRAY[
    'lehenga', 'lehanga', 'lehnga', 'lahenga', 'lehengha', 'choli', 'ghagra', 'chaniya', 
    'voni', 'crop top skirt', 'half saree', 'lehenga choli', 'designer lehenga', 'bridal lehenga'
]
WHERE slug = 'lehanga';

UPDATE public.categories
SET classification_keywords = ARRAY[
    'kids', 'kidwear', 'children', 'baby', 'toddler', 'infant', 'pattu pavadai', 'pavadai', 
    'lehenga for kids', 'kids wear', 'baby girl', 'baby boy', 'girl frock', 'kids saree',
    'yrs', 'boys', 'girls'
]
WHERE slug = 'kids';

UPDATE public.categories
SET classification_keywords = ARRAY[
    'dress', 'kurti', 'kurthi', 'kurta', 'suit', 'salwar', 'gown', 'frock', 'maxi', 
    'anarkali', 'top', 'tops', 'bottom', 'dupatta set', 'cord set', 'co-ord', 'readymade', 
    'churidar', 'palazzo', 'plazo', 'sharara', 'gharara', 'skirt', 'shrug', 'jacket', 
    'ethnic', 'tunic', 'kaftan', 'shirt', 'dhoti', 'panche', 'mens', 'menswear'
]
WHERE slug = 'dress';

-- 2. Execute Transactional Reclassification for Unassigned / 'Others' / NULL Products
DO $$
DECLARE
    v_kids_id UUID;
    v_lehanga_id UUID;
    v_saree_id UUID;
    v_dress_id UUID;
    v_others_general_id UUID;
    v_others_cat_id UUID;
    v_updated_count INT := 0;
    v_mg_updated_count INT := 0;
BEGIN
    -- Retrieve category IDs dynamically
    SELECT id INTO v_kids_id FROM public.categories WHERE slug = 'kids' LIMIT 1;
    SELECT id INTO v_lehanga_id FROM public.categories WHERE slug = 'lehanga' LIMIT 1;
    SELECT id INTO v_saree_id FROM public.categories WHERE slug = 'saree' LIMIT 1;
    SELECT id INTO v_dress_id FROM public.categories WHERE slug = 'dress' LIMIT 1;
    SELECT id INTO v_others_general_id FROM public.categories WHERE slug = 'general' LIMIT 1;
    SELECT id INTO v_others_cat_id FROM public.categories WHERE slug = 'others' LIMIT 1;

    -- Fallback safety check
    IF v_saree_id IS NULL OR v_dress_id IS NULL OR v_lehanga_id IS NULL OR v_kids_id IS NULL THEN
        RAISE EXCEPTION 'Core categories missing in public.categories table';
    END IF;

    -- Update products matching regex / keyword heuristics
    WITH target_products AS (
        SELECT 
            p.id,
            COALESCE(p.title, '') || ' ' ||
            COALESCE(p.description, '') || ' ' ||
            COALESCE(p.fabric, '') || ' ' ||
            COALESCE(array_to_string(p.tags, ' '), '') || ' ' ||
            COALESCE((SELECT string_agg(vl.description, ' ') FROM public.vendor_listings vl WHERE vl.product_id = p.id), '') || ' ' ||
            COALESCE((SELECT mg.description FROM wa.message_groups mg WHERE mg.deeplens_product_id = p.id LIMIT 1), '') AS combined_text
        FROM public.products p
        WHERE p.category_id IS NULL 
           OR p.category_id IN (v_others_general_id, v_others_cat_id, '3b292c9a-7cf5-4bd4-88e3-848baf147134'::uuid)
    ),
    categorized_products AS (
        SELECT 
            tp.id,
            CASE
                -- Priority 1: Kids
                WHEN tp.combined_text ~* '\m(kids|kidwear|children|baby|toddler|infant|pattu\s*pavadai|pavadai|lehenga\s+for\s+kids|kids\s+wear|baby\s+girl|baby\s+boy|girl\s+frock|girls?|boys?)\M'
                    THEN v_kids_id

                -- Priority 2: Lehanga
                WHEN tp.combined_text ~* '\m(lehenga|lehanga|lehnga|lahenga|lehengha|choli|ghagra|chaniya|voni|crop\s*top\s*skirt|half\s*saree|bridal\s*lehenga)\M'
                    THEN v_lehanga_id

                -- Priority 3: Saree
                WHEN tp.combined_text ~* '\m(saree|saris?|pattu|kanchi|kanjivaram|banarasi|georgette\s+saree|silk\s+saree|chanderi|organza\s+saree|paithani|dola\s+silk|tissue\s+saree|tussar|pallu|zari|blouse\s+piece|running\s+blouse|gadwal|uppada|dharmavaram|pochampally|venkatagiri|kota\s+silk|patola|bandhani\s+saree|chiffon\s+saree|handloom\s+saree|shiffon\s+saree)\M'
                    THEN v_saree_id

                -- Priority 4: Dress / Kurtis / Suits / Menswear
                WHEN tp.combined_text ~* '\m(dress|kurti|kurthi|kurta|suit|salwar|gown|frock|maxi|anarkali|top|tops|bottom|dupatta\s+set|cord\s+set|co-?ord|readymade|churidar|palazzo|plazo|sharara|gharara|skirt|shrug|jacket|kaftan|tunic|shirt|dhoti|panche|mens|menswear)\M'
                    THEN v_dress_id

                -- Priority 5: Fallback to Others (General)
                ELSE COALESCE(v_others_general_id, v_others_cat_id)
            END AS new_category_id
        FROM target_products tp
    )
    UPDATE public.products p
    SET 
        category_id = cp.new_category_id,
        updated_at = NOW()
    FROM categorized_products cp
    WHERE p.id = cp.id
      AND (p.category_id IS NULL OR p.category_id <> cp.new_category_id);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Total products reclassified: %', v_updated_count;

    -- Sync wa.message_groups category column
    UPDATE wa.message_groups mg
    SET category = c.name
    FROM public.products p
    JOIN public.categories c ON p.category_id = c.id
    WHERE mg.deeplens_product_id = p.id
      AND (mg.category IS NULL OR mg.category <> c.name);

    GET DIAGNOSTICS v_mg_updated_count = ROW_COUNT;
    RAISE NOTICE 'Total wa.message_groups category labels synced: %', v_mg_updated_count;
END $$;

-- 3. Verification Query: Post-reclassification Category Distribution
SELECT 
    COALESCE(c.name, 'Unassigned / NULL') AS category_name,
    COALESCE(c.slug, 'none') AS category_slug,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE p.is_deleted = false OR p.is_deleted IS NULL) AS active_count,
    COUNT(*) FILTER (WHERE p.created_at >= '2026-08-16 00:00:00' AND p.created_at <= '2026-08-23 23:59:59') AS window_16_23_aug_count
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
GROUP BY c.name, c.slug
ORDER BY total_count DESC;
