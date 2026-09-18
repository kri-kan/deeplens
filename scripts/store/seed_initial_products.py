import json

with open("src/services/Store.Api/data/in_store_curations.json") as f:
    products = json.load(f)

with open("/tmp/seed.sql", "w") as out:
    for p in products:
        def esc(val):
            if val is None:
                return "NULL"
            return "'" + str(val).replace("'", "''") + "'"

        media_json = json.dumps(p.get("mediaOrder", [])).replace("'", "''")
        tags_json = json.dumps(p.get("tags", [])).replace("'", "''")
        
        sql = f"""INSERT INTO products (
            id, vayyari_product_id, product_code, title, description, category_name, fabric,
            base_cost, mrp, sale_price, lifecycle_status, stock_quantity,
            colorway_name, color_hex, media_order, tags, is_published, published_at
        ) VALUES (
            {esc(p['id'])}, {esc(p['vayyariProductId'])}, {esc(p['productCode'])}, {esc(p['title'])}, {esc(p.get('description'))},
            {esc(p.get('categoryName', 'Saree'))}, {esc(p.get('fabric', 'Silk'))}, {p.get('baseCost', 0)}, {p.get('mrp', 0)}, {p.get('salePrice', 0)},
            {esc(p.get('lifecycleStatus', 'available'))}, {p.get('stockQuantity', 10)}, {esc(p.get('colorwayName', 'Standard'))}, {esc(p.get('colorHex', '#1B4D3E'))},
            '{media_json}'::jsonb, '{tags_json}'::jsonb,
            {str(p.get('isPublished', True)).lower()}, {esc(p.get('publishedAt'))}
        ) ON CONFLICT (vayyari_product_id) DO UPDATE SET
            title = EXCLUDED.title,
            mrp = EXCLUDED.mrp,
            sale_price = EXCLUDED.sale_price,
            media_order = EXCLUDED.media_order,
            tags = EXCLUDED.tags,
            updated_at = NOW();\n"""
        out.write(sql)
