# Decision: Retain Existing Product IDs & Eliminate Sequence Consumption Leaks

- **Decision Date:** 2026-10-29
- **Decider:** Krishna (Squad Lead)
- **Status:** Implemented, Built & Deployed to `deeplens-worker`

## Context & Problem
Product SKUs are formatted as `VF{sequence_id:X3}`. When the sequence crossed 65,536 (`0xFFFF`), IDs naturally widened to 5 hex characters (`VF10000` to `VF1FC22`). 
Although only ~13,750 products exist in the catalog, the sequence had reached 130,243 due to high sequence churn (~89% waste):
1. In `WhatsAppGroupWorker.cs`, `SELECT nextval('productid_id_seq')` and product insertion were executed BEFORE verifying incoming media downloads.
2. When groups had `< 2` verified downloaded media files in storage (115,337 historical aborts), the transaction was rolled back. Because PostgreSQL sequences do not roll back, sequence IDs were permanently burned.
3. Payloads with fewer than 2 media files were still opening DB transactions and running AI extraction before aborting.
4. `MetadataService.cs` and `SequencedIdGenerator.cs` had unquoted/quoted casing discrepancies (`\"productId_id_seq\"` vs `productid_id_seq`).

## Decision
1. **Preserve Existing IDs:** Do not renumber existing products. There are ~918,333 slots remaining before 6-digit hex (`0x100000` / 1,048,576), providing decades of headroom.
2. **Fast-Fail on Ingestion Payloads:** Check `evt.MediaFiles == null || evt.MediaFiles.Count < 2` at entry of `HandleGroupProductCreate` before opening DB transactions or calling AI service.
3. **Defer Sequence Allocation Until Post-Validation:** In `WhatsAppGroupWorker.cs`, move `nextval('productid_id_seq')` and `INSERT INTO products` to after the `successfulMediaCount < 2` gate. Only products that have passed media validation and are guaranteed to commit will draw a sequence ID.
4. **Pre-validate Media in API Ingestion:** In `ProductService.CreateProductAsync`, reject empty/null media payloads before opening transactions.
5. **Sequence Name Alignment:** Aligned all services to standard `productid_id_seq`.
