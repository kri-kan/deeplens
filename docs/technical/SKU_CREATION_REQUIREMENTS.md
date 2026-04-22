# DeepLens SKU Creation Requirements

In DeepLens, **SKU (Product) creation is tightly coupled with Media Ingestion**. There is no standalone API to create a "shell" product. A product is created or updated when you upload visual assets associated with it.

---

## 🚀 API Endpoint

**`POST /api/v1/ingest/upload`**  
*(Consumes `multipart/form-data`)*

---

## 📋 Field Reference

### 1. Mandatory Fields (System)
These fields are strictly required for the API call to succeed.

| Field          | Type     | Description              | Notes                                            |
| -------------- | -------- | ------------------------ | ------------------------------------------------ |
| **`File`**     | `Binary` | Image or Video file      | Determines the visual identity of the SKU.       |
| **`SellerId`** | `String` | Unique Seller Identifier | Links the inventory to a specific vendor/seller. |

### 2. Core Identity Fields (Product)
These define the product itself.

| Field             | Type     | Description                    | Behavior if Omitted                      |
| ----------------- | -------- | ------------------------------ | ---------------------------------------- |
| **`Sku`**         | `String` | Unique Product Code            | **Auto-generated** as `SKU-XXXXXXXX`     |
| **`Description`** | `String` | Product details text           | Used as `Title` (truncated to 100 chars) |
| **`Category`**    | `String` | Broad category (e.g., "Saree") | Helps in attribute extraction fallback   |
| **`ExternalId`**  | `String` | ID from your external ERP/DB   | Useful for sync/mapping                  |

### 3. Variant Attributes (Specs)
Physical characteristics of this specific variation.

| Field               | Type     | Example                    |
| ------------------- | -------- | -------------------------- |
| **`Color`**         | `String` | "Red", "Navy Blue"         |
| **`Fabric`**        | `String` | "Silk", "Cotton"           |
| **`StitchType`**    | `String` | "Unstitched", "Ready-made" |
| **`WorkHeaviness`** | `String` | "Heavy", "Bridal", "Plain" |

### 4. Commercial Details (Listing)
Information related to the sale of this item.

| Field          | Type      | Default |
| -------------- | --------- | ------- |
| **`Price`**    | `Decimal` | `0`     |
| **`Currency`** | `String`  | `"INR"` |

### 5. Search & Discovery (Metadata)
Data used to power search filters and discovery.

| Field                    | Type            | Description                                            |
| ------------------------ | --------------- | ------------------------------------------------------ |
| **`Tags`**               | `List<String>`  | Custom search tags (e.g. `["wedding", "summer"]`)      |
| **`Occasion`**           | `String`        | Usage context (e.g., "Party Wear")                     |
| **`Patterns`**           | `List<String>`  | Visual patterns (e.g., `["floral", "geometric"]`)      |
| **`AdditionalMetadata`** | `Dict<Str,Str>` | Flexible key-value pairs (e.g. `{"shipping": "free"}`) |

---

## 💡 System Behavior

### **Scenario A: Creating a New SKU**
1. Send `POST /upload` with a **unique `Sku`** (e.g., "SKU-NEW-001").
2. System checks DB → SKU not found.
3. **Creates new Product** (SKU-NEW-001).
4. **Creates new Variant** based on Color/Fabric provided.
5. **Creates new Listing** with Price/Seller.

### **Scenario B: Adding Images to Existing SKU**
1. Send `POST /upload` with an **existing `Sku`** (e.g., "SKU-EXISTING-001").
2. System checks DB → **SKU Found**.
3. **Updates Product**: Merges new `Tags` with existing/old tags.
4. **Links Image**: Adds the new image to the existing Product.

### **Scenario C: Auto-Generation (Visual First)**
1. Send `POST /upload` **without** a `Sku`.
2. System generates `SKU-{GUID}`.
3. Creates new Product with this auto-generated code.
4. Useful for "dumping" unsorted inventory images.

---

## 🛠 JSON Payload Example (Metadata)

When using **Bulk Ingest**, the metadata structure looks like this:

```json
{
  "sellerId": "vendor_123",
  "category": "Apparel",
  "images": [
    {
      "fileName": "photo_001.jpg",
      "sku": "SAREE-SILK-001",
      "price": 1500,
      "color": "Red",
      "fabric": "Silk",
      "tags": ["bridal", "traditional"]
    }
  ]
}
```
