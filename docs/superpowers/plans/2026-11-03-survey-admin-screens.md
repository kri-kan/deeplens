# Dynamic Versioned Survey Admin Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular 5-screen administrative suite in Storybook (Tamagui & React) for managing question banks with per-question versioning, authoring multilingual statements with on-demand AI translation, selecting MinIO media for image tiles, configuring hidden URL parameter capture, previewing across responsive frames, and running safe sandbox test submissions.

**Architecture:** 5 standalone full-page screen components in `src/apps/storybook/src/components/pages/survey-admin/` with matching Storybook stories in `src/apps/storybook/src/stories/pages/`. Shared data contracts and mocks emulate backend `Store.Api` endpoints (`/api/v1/admin/surveys`, `/draft`, `/publish`, `/responses`, MinIO upload, and AI translation generation), enabling isolated testing and end-to-end traversal.

**Tech Stack:** React 18, React Native / Tamagui, Storybook 8, TypeScript, Lucide Icons (`react-icons/lu`).

**Spec:** [docs/superpowers/specs/2026-11-03-survey-admin-screens-design.md](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-03-survey-admin-screens-design.md)

## Global Constraints

- Use Tamagui tokens and styling consistent with DeepLens dark luxury theme (`#0b0d11`, `#12151c`, `#171b24`, `#D4AF37`).
- All C# / REST contracts must maintain camelCase naming matching `Store.Api` DTOs (`questionKey`, `revisionNumber`, `statementsJson`, `optionsJson`).
- Every screen must be responsive and self-contained with its own mock default states, while allowing programmatic prop injection (`apiBaseUrl`, `initialSurveyId`, `onNavigate`).
- Safe Sandbox execution must never mutate production wallet balances or live customer response records.

## Review Focus

1. **AI Translation Overwrite**: Generating translations must not overwrite manual edits without confirmation. (Tested in Task 3)
2. **Missing Dynamic URI Parameter**: When a survey contains a hidden question bound to a URL parameter (e.g. `orderId`) but the URL omits it, the engine must fall back to the configured static default or record `null` without crashing. (Tested in Task 5)
3. **Invalid Image URL or Failed MinIO Upload**: If an admin enters an unreachable URL or an upload fails, the image tile preview must display a graceful fallback error state instead of a broken container. (Tested in Task 3)
4. **Orphaned Option Branching**: When an option references a `nextQuestionKey` that was deleted or not included in the survey step sequence, the survey preview player must fall back to the sequence default step. (Tested in Task 5)
5. **Sandbox Isolation**: Submissions dispatched from the test sandbox runner must explicitly carry `isTest: true` and a dedicated test fingerprint prefix (`test_sandbox_...`), cleanly separated from production submissions. (Tested in Task 5 & Task 6)

---

### Task 1: Survey Admin Types & Mock Fixtures

**Files:**
- Create: `src/apps/storybook/src/components/pages/survey-admin/surveyAdminTypes.ts`
- Create: `src/apps/storybook/src/components/pages/survey-admin/surveyAdminMocks.ts`
- Test: `tests/survey_admin_types.test.ts` (or node verification script)

**Interfaces:**
- Produces: `AdminQuestionItem`, `AdminSurveyItem`, `AdminOptionItem`, `AdminQuestionRevision`, `AdminSurveyResponseItem`, `AdminCatalogMediaItem`

- [x] **Step 1: Write type definitions in `surveyAdminTypes.ts`**
  Define contracts for atomic questions, revisions, multilingual statements (6 languages: en, te, hi, ta, ml, kn), tile media configs (icons, image with MinIO/catalog sourcing), hidden question source rules (`static_default` vs `uri_parameter`), and response items.
- [x] **Step 2: Create rich mock fixtures in `surveyAdminMocks.ts`**
  Include a seed Question Bank with 6 varied questions (`q_saree_occasion`, `q_craftsmanship_likert`, `q_feedback_text`, `q_blouse_upload`, `q_fabric_image_tiles`, and `q_order_id_hidden`), catalog media items, simulated AI translation engine, and sample responses.
- [x] **Step 3: Verify TypeScript compilation**
  Run: `npx tsc --noEmit` on the storybook package to confirm no type errors.
- [x] **Step 4: Commit**
  ```bash
  git add src/apps/storybook/src/components/pages/survey-admin/surveyAdminTypes.ts src/apps/storybook/src/components/pages/survey-admin/surveyAdminMocks.ts
  git commit -m "feat(survey-admin): add admin types and mock data fixtures"
  ```

---

### Task 2: Screen 1 — Questions Bank & Version History (`AdminSurveyQuestionsPage`)

**Files:**
- Create: `src/apps/storybook/src/components/pages/survey-admin/AdminSurveyQuestionsPage.tsx`
- Create: `src/apps/storybook/src/stories/pages/AdminSurveyQuestionsPage.stories.tsx`

**Interfaces:**
- Consumes: `AdminQuestionItem`, `MOCK_ADMIN_QUESTIONS` from Task 1
- Produces: `<AdminSurveyQuestionsPage onEditQuestion={...} onCloneQuestion={...} onCreateQuestion={...} />`

- [x] **Step 1: Implement question table & filter toolbar**
  Render question key, revision number badge, type tag (`single_select`, `multi_select`, `text_input`, `file_upload`, `rating`, `hidden`), points badge (+175), and survey usage pills.
- [x] **Step 2: Implement Clone & New Revision actions**
  Add modal for "Clone Question" prompting for new slug key (defaulting to `${original}_copy`), and "New Revision" prompt.
- [x] **Step 3: Implement Revision History Modal**
  Show past revisions (`Rev 1`, `Rev 2`) with diff summary, changelog notes, and creation date.
- [x] **Step 4: Create Storybook story in `AdminSurveyQuestionsPage.stories.tsx`**
  Set up story with default and filtered views.
- [x] **Step 5: Commit**
  ```bash
  git add src/apps/storybook/src/components/pages/survey-admin/AdminSurveyQuestionsPage.tsx src/apps/storybook/src/stories/pages/AdminSurveyQuestionsPage.stories.tsx
  git commit -m "feat(survey-admin): implement Screen 1 AdminSurveyQuestionsPage"
  ```

---

### Task 3: Screen 2 — Question & Option Studio (`AdminSurveyQuestionEditorPage`)

**Files:**
- Create: `src/apps/storybook/src/components/pages/survey-admin/AdminSurveyQuestionEditorPage.tsx`
- Create: `src/apps/storybook/src/stories/pages/AdminSurveyQuestionEditorPage.stories.tsx`

**Interfaces:**
- Consumes: `AdminQuestionItem`, `AdminOptionItem`, `TileMediaConfig` from Task 1
- Produces: `<AdminSurveyQuestionEditorPage initialQuestion={...} onSaveQuestion={...} onCancel={...} />`

- [x] **Step 1: Implement Core Metadata & Hidden Question Switch**
  Inputs for `question_key`, `question_type`, `points`. Add `is_hidden` toggle: when checked, reveal Value Source (`static_default` vs `uri_parameter`) and Parameter Key input (`orderId`, `productId`, `utmCampaign`).
- [x] **Step 2: Implement Multilingual Statement Studio with AI Translation**
  Primary English inputs for kicker, title, subtitle, placeholder. Add "✨ Generate Translations with AI" button that populates Telugu, Hindi, Tamil, Malayalam, and Kannada with loading state, plus manual language tabs.
- [x] **Step 3: Implement Option & Media Studio for Select Types**
  Toggle for Text vs Tile (Icon vs Image). Implement 3 image sourcing pathways:
  1. *Upload to MinIO* (mock drag-and-drop zone)
  2. *Catalog Browser* (interactive picker modal of catalog images)
  3. *Direct URL* (text input)
  Add real-time aspect ratio thumbnail preview (`1:1`, `4:3`, `3:4`) and branching target dropdown (`nextQuestionKey`).
- [x] **Step 4: Create Storybook story in `AdminSurveyQuestionEditorPage.stories.tsx`**
  Create stories for: New Question, Editing Image Tile Question, and Editing Hidden Parameter Question.
- [x] **Step 5: Commit**
  ```bash
  git add src/apps/storybook/src/components/pages/survey-admin/AdminSurveyQuestionEditorPage.tsx src/apps/storybook/src/stories/pages/AdminSurveyQuestionEditorPage.stories.tsx
  git commit -m "feat(survey-admin): implement Screen 2 AdminSurveyQuestionEditorPage"
  ```

---

### Task 4: Screen 3 — Survey Assembly & Version Publishing (`AdminSurveyBuilderPage`)

**Files:**
- Create: `src/apps/storybook/src/components/pages/survey-admin/AdminSurveyBuilderPage.tsx`
- Create: `src/apps/storybook/src/stories/pages/AdminSurveyBuilderPage.stories.tsx`

**Interfaces:**
- Consumes: `AdminSurveyItem`, `AdminQuestionItem` from Task 1
- Produces: `<AdminSurveyBuilderPage surveyId={...} onPublishVersion={...} onPreview={...} />`

- [x] **Step 1: Implement Survey Switcher & "➕ New Survey" Creation Modal**
  Header dropdown to pick active survey with modal to create new slug, title, audience rule (`guest` vs `registered`), and base Mudras target.
- [x] **Step 2: Implement Question Step Sequencer**
  Drag/reorder controls for step sequence ($1, 2, 3\dots$). Add "➕ Add Question from Bank" picker modal.
- [x] **Step 3: Implement Revision Pinning & Upgrade Indicator**
  Each step displays pinned revision (e.g. `Rev 1`). If a newer revision exists in the Question Bank, display an "Upgrade to Rev N" badge.
- [x] **Step 4: Implement Immutable Version Publishing Modal**
  "Publish Version" button opening mandatory changelog dialog, previewing version increment ($v_1 \rightarrow v_2$).
- [x] **Step 5: Create Storybook story in `AdminSurveyBuilderPage.stories.tsx`**
  Include stories for Draft with Uncommitted Changes and Published Snapshot.
- [x] **Step 6: Commit**
  ```bash
  git add src/apps/storybook/src/components/pages/survey-admin/AdminSurveyBuilderPage.tsx src/apps/storybook/src/stories/pages/AdminSurveyBuilderPage.stories.tsx
  git commit -m "feat(survey-admin): implement Screen 3 AdminSurveyBuilderPage"
  ```

---

### Task 5: Screen 4 — Responsive Preview & Sandbox Test Runner (`AdminSurveyPreviewPage`)

**Files:**
- Create: `src/apps/storybook/src/components/pages/survey-admin/AdminSurveyPreviewPage.tsx`
- Create: `src/apps/storybook/src/stories/pages/AdminSurveyPreviewPage.stories.tsx`
- Modify: `src/apps/storybook/src/components/organisms/TypeformSurvey/SurveyPlayer.tsx` (ensure image tile & rating support)

**Interfaces:**
- Consumes: `SurveyPlayer`, `surveyAdminMocks.ts`
- Produces: `<AdminSurveyPreviewPage surveySlug={...} version={...} />`

- [x] **Step 1: Upgrade `<SurveyPlayer />` for Image Tiles & New Question Types**
  Verify `<SurveyOptionTile />` renders `imageUrl` with selected aspect ratio, and handle basic rating / file upload interaction cards.
- [x] **Step 2: Implement Viewport Canvas & Device Frame Switcher**
  Frame controls: Mobile (`390px` with phone bezel), Tablet (`768px`), and Desktop (`1200px`).
- [x] **Step 3: Implement Dynamic Language Switcher**
  Live toolbar to switch language between `en`, `te`, `hi`, `ta`, `ml`, `kn` and observe immediate card re-rendering.
- [x] **Step 4: Implement Sandbox Runner & URL Parameter Injector**
  Sidebar dock allowing test URL params (e.g. `orderId=ORD-7729&utm=prelaunch`). "Run Test Submission" button executing simulated submission, displaying mock VIP Pass code (`VIP-TEST-...`) and Mudras reward (+700) without modifying live wallets.
- [x] **Step 5: Create Storybook story in `AdminSurveyPreviewPage.stories.tsx`**
  Set up story demonstrating interactive traversal in Mobile, Tablet, and Desktop frames.
- [x] **Step 6: Commit**
  ```bash
  git add src/apps/storybook/src/components/pages/survey-admin/AdminSurveyPreviewPage.tsx src/apps/storybook/src/stories/pages/AdminSurveyPreviewPage.stories.tsx src/apps/storybook/src/components/organisms/TypeformSurvey/SurveyPlayer.tsx
  git commit -m "feat(survey-admin): implement Screen 4 AdminSurveyPreviewPage and player upgrades"
  ```

---

### Task 6: Screen 5 — Responses & Analytics Review (`AdminSurveyResponsesPage`)

**Files:**
- Create: `src/apps/storybook/src/components/pages/survey-admin/AdminSurveyResponsesPage.tsx`
- Create: `src/apps/storybook/src/stories/pages/AdminSurveyResponsesPage.stories.tsx`

**Interfaces:**
- Consumes: `AdminSurveyResponseItem`, `MOCK_ADMIN_RESPONSES` from Task 1
- Produces: `<AdminSurveyResponsesPage surveyId={...} onInspectResponse={...} />`

- [x] **Step 1: Implement Submissions Filter & Search Toolbar**
  Filters for Survey version, Origin route, Submission Date, and Mode toggle (`Live Submissions` vs `Sandbox Test Runs`). Search by Phone, User ID, or Virtual Fingerprint.
- [x] **Step 2: Implement Submissions Data Grid**
  Rows showing: Version badge, Route, User/Guest ID, Language, Questions Answered, Earned Mudras, Submitted Timestamp, and "Inspect" button.
- [x] **Step 3: Implement Submission Detail Inspector Modal**
  Modal displaying:
  - Formatted breakdown of answers (question key, statement, selected answer/options).
  - Formatted breakdown of dynamically auto-captured hidden fields (`orderId`, `utmCampaign`, etc.).
  - Raw JSON viewer with one-click copy.
- [x] **Step 4: Create Storybook story in `AdminSurveyResponsesPage.stories.tsx`**
  Set up stories for Live Submissions and Sandbox Submissions.
- [x] **Step 5: Commit**
  ```bash
  git add src/apps/storybook/src/components/pages/survey-admin/AdminSurveyResponsesPage.tsx src/apps/storybook/src/stories/pages/AdminSurveyResponsesPage.stories.tsx
  git commit -m "feat(survey-admin): implement Screen 5 AdminSurveyResponsesPage"
  ```

---

### Task 7: End-to-End Navigation & Storybook Verification

**Files:**
- Create: `src/apps/storybook/src/components/pages/survey-admin/SurveyAdminSuite.tsx`
- Create: `src/apps/storybook/src/stories/pages/SurveyAdminSuite.stories.tsx`

**Interfaces:**
- Integrates all 5 screens with unified top-level breadcrumb navigation and deep-linking simulation.

- [x] **Step 1: Implement `SurveyAdminSuite.tsx` wrapper**
  Connects all 5 pages via top-level tab/breadcrumb switcher (`Questions Bank` $\rightarrow$ `Question Editor` $\rightarrow$ `Survey Builder` $\rightarrow$ `Preview & Test` $\rightarrow$ `Responses & Analytics`).
- [x] **Step 2: Create master Storybook story**
  Story in `src/apps/storybook/src/stories/pages/SurveyAdminSuite.stories.tsx` allowing clicking between all 5 screens with active shared state.
- [x] **Step 3: Run TypeScript & Storybook validation**
  Run: `npx tsc --noEmit` and check for any syntax/import issues.
- [x] **Step 4: Commit**
  ```bash
  git add src/apps/storybook/src/components/pages/survey-admin/SurveyAdminSuite.tsx src/apps/storybook/src/stories/pages/SurveyAdminSuite.stories.tsx
  git commit -m "feat(survey-admin): complete SurveyAdminSuite master navigation integration"
  ```
