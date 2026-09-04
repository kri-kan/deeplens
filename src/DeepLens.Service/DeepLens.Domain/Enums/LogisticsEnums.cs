using System.Text.Json.Serialization;

namespace DeepLens.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShipmentStatus
{
    Pending = 0,
    Draft = 1,
    Manifested = 2,
    InTransit = 3,
    OutForDelivery = 4,
    Delivered = 5,
    NDR = 6,
    RTO_Initiated = 7,
    RTO_Delivered = 8,
    Cancelled = 9,
    Lost = 10
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ProcureStatus
{
    NotApplicable = 0,
    Pending = 1,
    Inbound = 2,
    ReceivedAtHub = 3,
    QcPassed = 4,
    QcFailed = 5,
    ReadyToShip = 6,
    Dispatched = 7
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NdrActionType
{
    Reattempt = 1,
    AddressUpdate = 2,
    RTO = 3,
    ContactCustomer = 4,
    PhoneUpdate = 5
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NdrStatus
{
    Open = 1,
    Contacted = 2,
    ActionDispatched = 3,
    Resolved = 4,
    Escalated = 5,
    Closed = 6
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum EscalationStatus
{
    Open = 1,
    InProgress = 2,
    Resolved = 3,
    Closed = 4
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum EscalationPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Urgent = 4
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CourierPartner
{
    Delhivery = 1,
    ExternalVendorCourier = 2,
    BlueDart = 3,
    DTDC = 4,
    Shadowfax = 5,
    XpressBees = 6
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FulfillmentType
{
    DirectDispatch = 1,
    CrossDock = 2,
    CentralHub = 3
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShippingMode
{
    Surface = 1,
    Express = 2
}
