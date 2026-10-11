# Decision: Clone Order State Cleansing & Delhivery Insufficient Balance Resolution

- **Date:** 2026-10-11
- **Author:** Krishna (Squad Lead & Coordinator)
- **Status:** Approved & Implemented

## Context
1. **Order Cloning Behavior**: Users reported that cloning an order copied shared statuses (`isShared: true`, `sharedAt: ...`) into the new order (`00023`), so that upon marking the order as Confirmed, items already showed as shared. Per business rules, order cloning is strictly intended for copying item details and customer delivery address only — never statuses, shared flags, fulfillment metadata, tracking numbers, or label requirements.
2. **Delhivery Manifestation Failure**: In order `00023`, generating a Delhivery shipment label failed with `GroupLabel.DelhiveryFailed` and "order creation failed". Live logs confirmed Delhivery CMU returned `Crashing while saving package due to exception 'Prepaid client manifest charge API failed due to insufficient balance'`. Furthermore, the frontend client was masking this root cause because `ApiClient.handleError` swallowed `result.message` whenever `result.error` was a string.

## Decisions & Changes
1. **Sanitization in `IdGeneratorService.CloneOrderAsync`**:
   - Stripped all sharing and fulfillment metadata from item comments (`isShared`, `sharedAt`, `isAddressShared`, `addressSharedAt`, `isLabelShared`, `labelSharedAt`, `status`, `awbNumber`, `trackingNumber`, `labelUrl`, `shipmentId`).
   - Cleared `NeedLabel = false`, `Status = OrderStatus.Unconfirmed`, `AdvancePaid = null`, `TransactionId = null`.
   - Ensured `TotalAmount` and `CodBalance` are computed purely from cloned items and shipping charges.
   - Re-generated clean unconfirmed order groups without prior tracking/label metadata.
2. **Frontend UI State Safeguards (`AdminOrderDetailView.tsx` & `base.ts`)**:
   - `AdminOrderDetailView`: When loading an unconfirmed order, forced `isShared = false` and `sharedAt = undefined` to prevent ghost shared states.
   - `ApiClient (base.ts)`: Corrected `handleError` to retain `result.message` or `result.description`, allowing actionable error details to reach users instead of raw error codes (`GroupLabel.DelhiveryFailed`).
3. **Universal Delhivery Error Sanitization & Propagation**:
   - Implemented `DelhiveryErrorSanitizer` in `DeepLens.Infrastructure` and `formatDelhiveryErrorMessage` in `src/vayyari/utils/delhivery-error.ts`.
   - Handles known domains: Insufficient wallet balance with recharge URL (`one.delhivery.com`), unregistered pickup facility/warehouse, unserviceable pincode for shipping mode, invalid 10-digit mobile number, duplicate orders, and empty addresses.
   - For all unhandled/unexpected Delhivery failures: Regex-extracts the inner exception from `due to exception '...'`, strips technical wrappers (`Crashing while saving package...` and `. Package might have been partially saved.`), extracts JSON remarks/error strings, and formats as `Delhivery: {cleanInnerMessage}.` to propagate actionable messages to user alerts.
   - Integrated sanitizer into `GenerateGroupLabelCommand.cs`, `ShipmentService.cs` (eliminated mock AWB fallback), `ForwardOrderLabelModal.tsx`, and `GenerateDelhiveryLabelModal.tsx`.
4. **Data Cleansing**:
   - Cleaned `orderItem` comments for order `00023` in PostgreSQL to remove legacy `"isShared": true` and `"sharedAt"` fields.
5. **Testing & Verification**:
   - Authored unit test suite in `DeepLens.Infrastructure.Tests/DelhiveryErrorSanitizerTests.cs` (106 tests passing in .NET).
   - Authored unit test suite in `src/vayyari/tests/delhiveryError.test.ts` (143 tests passing in frontend).
   - Tested live cloning (`00024`) and confirmed clean unshared items and unconfirmed status.
6. **Deployment & Verification**:
   - Re-built and deployed `search-api` to `/data/hosting/deeplensapi` via `--no-restore` and restarted container `deeplens-api`.
   - Reloaded Expo packager via `tmux send-keys -t expo r C-m`.
7. **COD/pc Field Value Preservation on Order Cloning**:
   - In `IdGeneratorService.CloneOrderAsync`, copied `PaymentMode` directly from previous order, falling back to COD if `CodBalance > 0`.
   - In item comments sanitization, preserved and synchronized `codChargePerPiece` and `cod/pc` across cloned item comments JSON.
   - In `AdminOrderDetailView.tsx`: `loadOrder` reads `parsedMeta.codChargePerPiece` / `cod/pc` (defaulting to 50 for COD and 0 for Prepaid), and `persistOrderItems` serializes `codChargePerPiece` and `cod/pc`.
   - In `AdminOrderCreateForm.tsx`: serializes `codChargePerPiece` and `cod/pc` into item comments metadata.
   - Pushed latest OTA update `1.0.3.289-dirty.20261011130747` to MinIO `local/admin-updates`.

