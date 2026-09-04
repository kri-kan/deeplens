using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Infrastructure.Clients.Delhivery;

// --- 1. Pincode Serviceability ---

public class DelhiveryPincodeResponse
{
    [JsonPropertyName("delivery_codes")]
    public List<DelhiveryDeliveryCode>? DeliveryCodes { get; set; }
}

public class DelhiveryDeliveryCode
{
    [JsonPropertyName("postal_code")]
    public DelhiveryPostalCodeDetail? PostalCode { get; set; }
}

public class DelhiveryPostalCodeDetail
{
    [JsonPropertyName("pin")]
    public int Pin { get; set; }

    [JsonPropertyName("district")]
    public string? District { get; set; }

    [JsonPropertyName("state_code")]
    public string? StateCode { get; set; }

    [JsonPropertyName("is_oda")]
    public string? IsOda { get; set; }

    [JsonPropertyName("sort_code")]
    public string? SortCode { get; set; }

    [JsonPropertyName("pre_paid")]
    public string? PrePaid { get; set; } // "Y" or "N"

    [JsonPropertyName("cash")]
    public string? Cash { get; set; } // "Y" or "N" (COD)

    [JsonPropertyName("pickup")]
    public string? Pickup { get; set; } // "Y" or "N"

    [JsonPropertyName("cod")]
    public string? Cod { get; set; } // "Y" or "N"

    [JsonPropertyName("rev_pickup")]
    public string? RevPickup { get; set; }

    [JsonPropertyName("country_code")]
    public string? CountryCode { get; set; }
}

// --- 2. CMU Shipment Manifesting ---

public class DelhiveryCmuPayload
{
    [JsonPropertyName("shipments")]
    public List<DelhiveryShipmentDetail> Shipments { get; set; } = new();

    [JsonPropertyName("pickup_location")]
    public DelhiveryPickupLocation? PickupLocation { get; set; }
}

public class DelhiveryShipmentDetail
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("add")]
    public string Address { get; set; } = string.Empty;

    [JsonPropertyName("pin")]
    public string Pin { get; set; } = string.Empty;

    [JsonPropertyName("city")]
    public string City { get; set; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; set; } = string.Empty;

    [JsonPropertyName("country")]
    public string Country { get; set; } = "India";

    [JsonPropertyName("phone")]
    public string Phone { get; set; } = string.Empty;

    [JsonPropertyName("order")]
    public string Order { get; set; } = string.Empty;

    [JsonPropertyName("payment_mode")]
    public string PaymentMode { get; set; } = "Pre-paid"; // "COD" or "Pre-paid"

    [JsonPropertyName("return_pin")]
    public string? ReturnPin { get; set; }

    [JsonPropertyName("return_city")]
    public string? ReturnCity { get; set; }

    [JsonPropertyName("return_phone")]
    public string? ReturnPhone { get; set; }

    [JsonPropertyName("return_add")]
    public string? ReturnAddress { get; set; }

    [JsonPropertyName("return_state")]
    public string? ReturnState { get; set; }

    [JsonPropertyName("return_country")]
    public string? ReturnCountry { get; set; } = "India";

    [JsonPropertyName("return_name")]
    public string? ReturnName { get; set; }

    [JsonPropertyName("products_desc")]
    public string? ProductsDesc { get; set; }

    [JsonPropertyName("order_date")]
    public string? OrderDate { get; set; }

    [JsonPropertyName("total_amount")]
    public decimal TotalAmount { get; set; }

    [JsonPropertyName("cod_amount")]
    public decimal CodAmount { get; set; }

    [JsonPropertyName("waybill")]
    public string? Waybill { get; set; }

    [JsonPropertyName("client")]
    public string? Client { get; set; }

    [JsonPropertyName("shipping_mode")]
    public string ShippingMode { get; set; } = "Surface"; // "Surface" or "Express"

    [JsonPropertyName("shipment_width")]
    public double? ShipmentWidth { get; set; }

    [JsonPropertyName("shipment_height")]
    public double? ShipmentHeight { get; set; }

    [JsonPropertyName("weight")]
    public double? Weight { get; set; }

    [JsonPropertyName("seller_name")]
    public string? SellerName { get; set; }

    [JsonPropertyName("seller_add")]
    public string? SellerAddress { get; set; }

    [JsonPropertyName("quantity")]
    public string? Quantity { get; set; }
}

public class DelhiveryPickupLocation
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("add")]
    public string? Address { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("pin_code")]
    public string? PinCode { get; set; }

    [JsonPropertyName("country")]
    public string? Country { get; set; } = "India";

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
}

public class DelhiveryCmuResponse
{
    [JsonPropertyName("status")]
    public bool? Status { get; set; }

    [JsonPropertyName("success")]
    public bool? Success { get; set; }

    [JsonPropertyName("rmk")]
    public string? Remark { get; set; }

    [JsonPropertyName("package_count")]
    public int? PackageCount { get; set; }

    [JsonPropertyName("packages")]
    public List<DelhiveryPackageResponse>? Packages { get; set; }

    [JsonPropertyName("upload_wbn")]
    public string? UploadWbn { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class DelhiveryPackageResponse
{
    [JsonPropertyName("waybill")]
    public string? Waybill { get; set; }

    [JsonPropertyName("refnum")]
    public string? Refnum { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("remarks")]
    public List<string>? Remarks { get; set; }

    [JsonPropertyName("client")]
    public string? Client { get; set; }

    [JsonPropertyName("service")]
    public string? Service { get; set; }

    [JsonPropertyName("sort_code")]
    public string? SortCode { get; set; }
}

// --- 3. Packing Slip / Label ---

public class DelhiveryPackingSlipResponse
{
    [JsonPropertyName("packages_found")]
    public int PackagesFound { get; set; }

    [JsonPropertyName("packages")]
    public List<DelhiveryPackingSlipPackage>? Packages { get; set; }
}

public class DelhiveryPackingSlipPackage
{
    [JsonPropertyName("wbn")]
    public string? Wbn { get; set; }

    [JsonPropertyName("pdf_download_link")]
    public string? PdfDownloadLink { get; set; }

    [JsonPropertyName("pdf_encoded")]
    public string? PdfEncoded { get; set; }

    [JsonPropertyName("barcode")]
    public string? Barcode { get; set; }
}

// --- 4. Pickup Scheduling ---

public class DelhiveryPickupRequest
{
    [JsonPropertyName("pickup_time")]
    public string PickupTime { get; set; } = "14:00:00"; // HH:mm:ss

    [JsonPropertyName("pickup_date")]
    public string PickupDate { get; set; } = string.Empty; // YYYY-MM-DD

    [JsonPropertyName("pickup_location")]
    public string PickupLocation { get; set; } = string.Empty;

    [JsonPropertyName("expected_package_count")]
    public int ExpectedPackageCount { get; set; } = 1;
}

public class DelhiveryPickupResponse
{
    [JsonPropertyName("pickup_id")]
    public string? PickupId { get; set; }

    [JsonPropertyName("pickup_token")]
    public string? PickupToken { get; set; }

    [JsonPropertyName("pickup_time")]
    public string? PickupTime { get; set; }

    [JsonPropertyName("pickup_date")]
    public string? PickupDate { get; set; }

    [JsonPropertyName("pickup_location")]
    public string? PickupLocation { get; set; }

    [JsonPropertyName("pr_exist")]
    public bool? PrExist { get; set; }

    [JsonPropertyName("incoming_center_name")]
    public string? IncomingCenterName { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

// --- 5. Tracking ---

public class DelhiveryTrackingResponse
{
    [JsonPropertyName("ShipmentData")]
    public List<DelhiveryTrackingShipmentWrapper>? ShipmentData { get; set; }
}

public class DelhiveryTrackingShipmentWrapper
{
    [JsonPropertyName("Shipment")]
    public DelhiveryTrackingShipment? Shipment { get; set; }
}

public class DelhiveryTrackingShipment
{
    [JsonPropertyName("AWB")]
    public string? Awb { get; set; }

    [JsonPropertyName("Status")]
    public DelhiveryTrackingStatus? Status { get; set; }

    [JsonPropertyName("Scans")]
    public List<DelhiveryTrackingScanWrapper>? Scans { get; set; }

    [JsonPropertyName("Origin")]
    public string? Origin { get; set; }

    [JsonPropertyName("Destination")]
    public string? Destination { get; set; }

    [JsonPropertyName("ExpectedDeliveryDate")]
    public string? ExpectedDeliveryDate { get; set; }

    [JsonPropertyName("PickUpDate")]
    public string? PickUpDate { get; set; }

    [JsonPropertyName("ChargedWeight")]
    public double? ChargedWeight { get; set; }

    [JsonPropertyName("SenderName")]
    public string? SenderName { get; set; }

    [JsonPropertyName("Consignee")]
    public DelhiveryConsignee? Consignee { get; set; }

    [JsonPropertyName("ReferenceNo")]
    public string? ReferenceNo { get; set; }
}

public class DelhiveryTrackingStatus
{
    [JsonPropertyName("Status")]
    public string? Status { get; set; }

    [JsonPropertyName("StatusType")]
    public string? StatusType { get; set; }

    [JsonPropertyName("StatusDateTime")]
    public string? StatusDateTime { get; set; }

    [JsonPropertyName("StatusLocation")]
    public string? StatusLocation { get; set; }

    [JsonPropertyName("Instructions")]
    public string? Instructions { get; set; }

    [JsonPropertyName("StatusCode")]
    public string? StatusCode { get; set; }
}

public class DelhiveryTrackingScanWrapper
{
    [JsonPropertyName("ScanDetail")]
    public DelhiveryTrackingScanDetail? ScanDetail { get; set; }
}

public class DelhiveryTrackingScanDetail
{
    [JsonPropertyName("ScanDateTime")]
    public string? ScanDateTime { get; set; }

    [JsonPropertyName("ScanType")]
    public string? ScanType { get; set; }

    [JsonPropertyName("Scan")]
    public string? Scan { get; set; }

    [JsonPropertyName("ScannedLocation")]
    public string? ScannedLocation { get; set; }

    [JsonPropertyName("Instructions")]
    public string? Instructions { get; set; }

    [JsonPropertyName("StatusCode")]
    public string? StatusCode { get; set; }
}

public class DelhiveryConsignee
{
    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("City")]
    public string? City { get; set; }

    [JsonPropertyName("PinCode")]
    public int? PinCode { get; set; }

    [JsonPropertyName("State")]
    public string? State { get; set; }

    [JsonPropertyName("Address1")]
    public string? Address1 { get; set; }

    [JsonPropertyName("Phone")]
    public string? Phone { get; set; }
}

// --- 6. NDR Edit Action ---

public class DelhiveryNdrEditRequest
{
    [JsonPropertyName("waybill")]
    public string Waybill { get; set; } = string.Empty;

    [JsonPropertyName("act")]
    public string Action { get; set; } = "REATTEMPT"; // "REATTEMPT", "EDIT_ADDRESS", "RTO", "EDIT_PHONE"

    [JsonPropertyName("add")]
    public string? Address { get; set; }

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("re_dt")]
    public string? ReattemptDate { get; set; } // YYYY-MM-DD

    [JsonPropertyName("remarks")]
    public string? Remarks { get; set; }
}

public class DelhiveryNdrEditResponse
{
    [JsonPropertyName("status")]
    public bool? Status { get; set; }

    [JsonPropertyName("success")]
    public bool? Success { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    [JsonPropertyName("waybill")]
    public string? Waybill { get; set; }
}
