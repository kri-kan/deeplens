# Decision: Shipping Label Image Preview Rasterization & Delhivery From-Address Suppression

**Date:** 2026-10-11  
**Decision Maker:** Krishna (Squad Lead)  
**Contributors:** Bhishma (Architect), Viswakarma (Design), Abhimanyu (Testing), Sahadeva (Release)  
**Status:** Approved & Deployed

---

## 1. Problem Statement
1. **Blank Label Preview in Mobile App:**
   - In `ForwardOrderLabelModal.tsx`, `resolveLabelImageUrl` maps `labels/{awb}.pdf` to `labels/{awb}.png` for rendering in `<Image>` and `<ZoomableImage>`.
   - The backend previously only generated and stored `labels/{awb}.pdf` in MinIO; no `.png` file existed.
   - Consequently, HTTP requests to `/api/v1/Attachment/download?path=labels/{awb}.png` returned `404 Not Found`, causing both the compact preview card and fullscreen modal to show a blank canvas. When shared or opened externally, the PDF link worked because the PDF existed in MinIO.
2. **From Address Visible on Manifested Label:**
   - On the generated Delhivery thermal label, the seller address and return address displayed the physical warehouse address (`103,krcr Sri ganesh residency...`) even when the seller address was suppressed or when dropship/reseller boutique sender was specified.
   - Root cause: In `GenerateGroupLabelCommand.cs` and `ShipmentService.cs`, `PickupLocation.Address` was being populated with the physical warehouse street address. Delhivery's CMU backend template falls back to `pickup_location.add` if `shipment.seller_add` is empty, and defaults `return_add` to `pickup_location.add`.

---

## 2. Architectural Solution

### A. On-The-Fly PDF to PNG Streaming (Option A: Zero MinIO PNG Storage)
- **Zero MinIO PNG Storage:** MinIO strictly stores only the original `labels/{awb}.pdf` (~250 KB). No `.png` objects are persisted in MinIO.
- **On-Demand Streaming:** In `AttachmentController.Download`, requests for `labels/*.png` read the `.pdf` from MinIO, rasterize it in-memory via `PdfRasterizer.cs` using `pdftoppm` in ~200ms, and stream the PNG directly to the client.
- **Client-Side Disk Caching:** Returns `Cache-Control: public,max-age=604800,immutable` (7 days) so the mobile app's image cache stores it locally on the device disk after the first fetch.
- **MinIO Cleanup:** Removed all legacy `.png` files from the MinIO `labels` bucket.

### B. Delhivery From-Address & Return-Address Suppression
- In `GenerateGroupLabelCommand.cs` and `ShipmentService.cs`:
  - When `request.SellerAddress` is not explicitly provided (suppressed):
    - `SellerAddress` is set to `string.Empty`.
    - `PickupLocation.Address` is set to `string.Empty` (Delhivery resolves pickup warehouse facility via `PickupLocation.Name` registered in Delhivery).
    - `ReturnAddress` is set to `string.Empty`.
    - `ReturnName` is set to `sellerName`.
  - When `request.SellerAddress` is explicitly provided, the specified address is passed through to all fields.
- Verified in unit tests in `LabelGenerationSellerNameTests.cs`.

### C. Clean Preview UX (No Separate Full Preview Page)
- **Short Preview Card:** Removed the header bar ("DELHIVERY SHIPPING LABEL"). The preview square directly presents the label image with a subtle floating AWB tag.
- **Immersive Fullscreen Modal:** Removed top navigation bars and bottom action footers. Tapping the preview square opens directly into an immersive fullscreen pan & zoom overlay with `<ZoomableImage>`, dismissable on Android hardware back button/swipe or the floating back arrow.

---

## 3. Verification & Deployment
- `PdfRasterizerTests`: Passed (108/108 unit tests green).
- `DeepLens.ArchitectureTests`: Passed (1/1 green).
- Live verification: Verified on-demand conversion of `labels/35003110014895.png` on `deeplens-api` returning HTTP 200 OK (141KB).
- Frontend type safety: `npx tsc --noEmit` exited with code 0.
- Published & restarted `deeplens-api` container via docker compose.
- Sent reload signal to Expo packager via tmux.
