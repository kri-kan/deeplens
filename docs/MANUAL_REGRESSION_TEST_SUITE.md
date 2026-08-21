# DeepLens Manual Regression Test Suite & Maestro Automation Roadmap

> **ADO User Story**: [#91 - Document Manual Regression Test Cases & Gradually Automate via Maestro](https://dev.azure.com/kri-kan/deeplens/_workitems/edit/91)  
> **Last Updated**: 2026-08-07  
> **Target Application**: DeepLens Suite & Vayyari Mobile App (React Native / Expo)

---

## Overview & Execution Guide

This document contains the complete manual test suite derived from analyzing recent commits, refactoring patterns, and critical bug fixes in the DeepLens codebase.

- **Manual Testing Flow**: Run through each test case sequentially after completing any major feature. Check off `[ ]` to `[x]` as verified.
- **Maestro Automation Strategy**: Each test case includes a corresponding Maestro E2E YAML mapping (`maestro/tc_<id>.yaml`) so you can progressively automate these checks into your CI pipeline.

---

## 1. Vayyari Mobile App & Intent Receiver (`TC-1xx`)

| Test ID | Test Scenario | Manual Steps | Expected Result | Maestro YAML Mapping | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-101** | Single Media Share Intent (`ACTION_SEND`) | 1. Open device photo gallery.<br>2. Select 1 image and click "Share".<br>3. Choose **Vayyari** app from share sheet. | Vayyari opens automatically to **Create Order** screen with media pre-filled (`vayyari://new?media=...`). | `maestro/share_single_media.yaml` | [ ] |
| **TC-102** | Multi-Media Share Intent (`ACTION_SEND_MULTIPLE`) | 1. Select 3 images in device gallery.<br>2. Share to Vayyari app. | Vayyari opens multi-media grid selection view with all 3 images attached. | `maestro/share_multi_media.yaml` | [ ] |
| **TC-103** | Auth Loopback & Tailscale IP Fallback | 1. Launch Vayyari app on physical mobile device.<br>2. Attempt login on local network. | Auth does not attempt invalid `127.0.0.1` loopback; connects via Tailscale IP fallback successfully. | N/A (Net/Auth check) | [ ] |
| **TC-104** | Suppress Double Navigation Stack Push | 1. Navigate to Instagram Post Grid in Vayyari.<br>2. Rapidly double-tap a post tile within 200ms. | Detail screen opens exactly once (no duplicate back-stack entries). | `maestro/prevent_double_tap.yaml` | [ ] |

---

## 2. Instagram & Meta Graph API v25.0 Engine (`TC-2xx`)

| Test ID | Test Scenario | Manual Steps | Expected Result | Maestro YAML Mapping | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-201** | Story Eligibility Query Execution | 1. Open Story Planner screen.<br>2. Select active profile.<br>3. Trigger item eligibility load. | Story groups load without throwing null Guid mapping runtime exceptions; displays total item counts. | `maestro/story_automation.yaml` | [ ] |
| **TC-202** | Deep Sync Comment Fetching | 1. Go to Instagram Account settings.<br>2. Open comment sync dialog.<br>3. Enable "Deep Sync" toggle and run sync. | Bypasses 24h incremental window and pulls full comment thread cleanly. | `maestro/deep_sync_comments.yaml` | [ ] |
| **TC-203** | Rate Limit Header Parsing & Visibility | 1. Trigger bulk comment/post sync.<br>2. Open Meta Accounts rate limit stats card. | Sliding window usage (Calls/200, Time, CPU %) displays accurate live counts. | `maestro/rate_limit_card.yaml` | [ ] |
| **TC-204** | Profile Pin/Unpin Toggle | 1. In Instagram profiles list, tap Pin on profile A.<br>2. Refresh page. | Profile A stays pinned at top of list. Tapping unpin reverts order. | `maestro/switch_profile.yaml` | [ ] |

---

## 3. Product Catalog, Selection & Similarity Merging (`TC-3xx`)

| Test ID | Test Scenario | Manual Steps | Expected Result | Maestro YAML Mapping | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-301** | Selection Mode Gesture Locking | 1. Open Product Gallery.<br>2. Long-press item to enter selection mode.<br>3. Swipe horizontally across grid. | Selection mode highlights items; horizontal scroll container does NOT steal drag focus. | `maestro/product_selection_gesture.yaml` | [ ] |
| **TC-302** | Product Similarity Merge Workflow | 1. Navigate to Similarity Matches tab.<br>2. Select 2 matching product candidates.<br>3. Click "Merge Selected". | Selected items merge into primary product ID, source items auto-archive, gallery updates cleanly. | `maestro/product_merge.yaml` | [ ] |
| **TC-303** | Bulk Product Creation from Instagram | 1. Open Instagram Post Importer.<br>2. Select 5 unlinked post items.<br>3. Click "Bulk Create Products". | Products are created in catalog with pre-filled IG media and titles without duplicates. | `maestro/bulk_create_products.yaml` | [ ] |
| **TC-304** | Product Archiving & Filter Drawer | 1. Open Advanced Filter Drawer.<br>2. Filter by status: "Archived". | Shows archived products only. Tapping "Unarchive" restores item to active view. | `maestro/product_filters.yaml` | [ ] |

---

## 4. Customer CRM & Address Book Integration (`TC-4xx`)

| Test ID | Test Scenario | Manual Steps | Expected Result | Maestro YAML Mapping | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-401** | Full-Page Customer Details Navigation | 1. Navigate to Customer List.<br>2. Click on customer card. | Navigates to `/customers/:id` dynamic full-page view showing linked orders & communication history. | `maestro/customer_details.yaml` | [ ] |
| **TC-402** | Address Persistence & Linkage | 1. Open Customer Address Book.<br>2. Add new address with optional line 2 empty.<br>3. Save and attach to order. | Address persists correctly in DB without truncation or null pointer errors. | `maestro/address_persistence.yaml` | [ ] |
| **TC-403** | Vendor Address & Details Update | 1. Open Vendor Management screen.<br>2. Edit vendor contact & billing address.<br>3. Click Save. | Vendor details update instantly in UI and persist on page reload. | `maestro/vendor_management.yaml` | [ ] |

---

## 5. Multi-Channel Messaging & AI Workflows (`TC-5xx`)

| Test ID | Test Scenario | Manual Steps | Expected Result | Maestro YAML Mapping | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-501** | Global WhatsApp Sync Toggle | 1. In Vayyari Settings, toggle Global WhatsApp Sync OFF.<br>2. Send test WhatsApp message. | Sync halts gracefully without throwing service loop errors. Toggling ON resumes queue. | `maestro/whatsapp_toggle.yaml` | [ ] |
| **TC-502** | AI Chat UI Overhaul & Corrections | 1. Open AI Chat Assistant.<br>2. Request product title generation.<br>3. Click "Apply Correction". | Title updates cleanly via PATCH endpoint and reflects in chat bubble stream. | `maestro/ai_chat_flow.yaml` | [ ] |

---

## Maestro Automation Progress Tracker

| Milestone | Target Test Cases | Script Created | Verified |
| :--- | :--- | :---: | :---: |
| **Phase 1 (Active)** | `TC-201`, `TC-204` | [`maestro/story_automation.yaml`](file:///home/krikan/productivity/deeplens/maestro/story_automation.yaml), [`maestro/switch_profile.yaml`](file:///home/krikan/productivity/deeplens/maestro/switch_profile.yaml) | ✅ |
| **Phase 2** | `TC-101`, `TC-102`, `TC-104` | Pending | [ ] |
| **Phase 3** | `TC-301`, `TC-302`, `TC-303` | Pending | [ ] |
| **Phase 4** | `TC-401`, `TC-402`, `TC-501` | Pending | [ ] |
