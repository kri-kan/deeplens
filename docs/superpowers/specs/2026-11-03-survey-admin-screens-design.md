# Design Specification: Dynamic Versioned Survey Admin Screens (Storybook Implementation)

**Date**: 2026-11-03  
**Status**: Draft for Review  
**Domain**: Vayyari Admin Portal / DeepLens Store  
**Target Path**: `src/apps/storybook/src/components/pages/` & `src/apps/storybook/src/stories/pages/`  

---

## 1. Intent & The Why

Marketing, merchandising, and curation teams need a flexible, self-serve interface to design interactive surveys, taste discovery wizards, and feedback flows across Vayyari surfaces (Mobile App and Store Prelaunch Web). 

Currently, surveys and questions are statically seeded or updated via raw database scripts and minimal API mocks. To scale engagement and loyalty rewards (Mudras), the admin suite must provide:
1. Reusable question management with per-question revision versioning.
2. Multilingual question statements powered by on-demand AI translation for Indian regional languages.
3. Rich visual option tiles with direct MinIO media upload, catalog browsing, or URL linking.
4. Hidden question parameters to capture contextual metadata (e.g. `orderId`, `productId`, `utmCampaign`) without disrupting customer UX.
5. High-fidelity device design previews and safe sandbox test submissions before immutable version publication.
6. Centralized response reviewing with complete answers and hidden parameter inspection.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Full-Page Route Architecture**: Implement 5 dedicated full-page screen components and corresponding Storybook stories in Tamagui:
  1. `AdminSurveyQuestionsPage` (Questions Bank & Revisions)
  2. `AdminSurveyQuestionEditorPage` (Question & Option Studio with AI translation & MinIO media picker)
  3. `AdminSurveyBuilderPage` (Survey Assembly, Sequencing & Version Publishing with Survey Switcher/Creator)
  4. `AdminSurveyPreviewPage` (Responsive Preview & Sandbox Test Submission Runner)
  5. `AdminSurveyResponsesPage` (Submissions Review & Response Inspector)
- **Question-Level Versioning**: Support cloning questions (creating new keys) and creating new revisions (`revisionNumber++`). Survey step mappings pin to a specific question revision, with an optional "Upgrade to latest Rev" indicator.
- **Rich Media Sourcing**: Support 3 media pathways for image tiles: direct upload to MinIO, selection from catalog assets, and direct URL input, with real-time thumbnail preview.
- **Multilingual Support**: English input as primary with AI generation button for 5 regional languages (`te`, `hi`, `ta`, `ml`, `kn`).
- **Hidden Context Capture**: Support questions marked as `is_hidden` pulling either static default values or dynamic query params from the URL (e.g. `orderId`, `productId`). Hidden questions have 0 points and auto-record into survey submission answers without showing in client UI.
- **Player Enhancements for Preview**: Enhance `<SurveyOptionTile />` to render both `imageUrl` (with aspect ratios `1:1`, `4:3`, `3:4`) and vector icons. Provide player-level interactive support for `file_upload` and `rating` question types.
- **Safe Sandbox Testing**: Provide a dedicated sandbox toggle to test survey execution, branching, and submission without polluting production response tables or altering customer loyalty balances.

### Non-Goals
- Production backend AI API integration at this stage (Storybook components will provide simulated AI translation generation and mock media upload with real callback hooks).

### Anti-Goals
- Avoid single split-screen mega-editors that clutter mobile and tablet viewports or compromise deep-linking and state isolation.
- Never write test sandbox submissions directly to live production customer wallet balances.

---

## 3. Approaches Considered & Selected

### Approach 1: Monolithic Multi-Tab Screen (Current Prototype)
- *Description*: All question editing, survey assembly, previewing, and responses kept inside tabs within a single `AdminSurveyStudioPage`.
- *Pros*: Single route, shared state.
- *Cons*: High cognitive load, cluttered inputs, difficult to deep link directly to a specific question revision or response run.

### Approach 2: Full-Page Dedicated Routes (Selected & Requested)
- *Description*: 5 standalone full-page screen components with specialized layouts, deep breadcrumb navigation, and dedicated Storybook stories:
  - `/admin/surveys/questions`
  - `/admin/surveys/questions/editor`
  - `/admin/surveys/builder`
  - `/admin/surveys/preview`
  - `/admin/surveys/responses`
- *Pros*: Clear mental model, ample screen real estate for complex workflows (like multilingual side-by-side editing, MinIO image pickers, and responsive device canvas), easily testable in Storybook.
- *Cons*: Requires inter-screen state passing or shared URL query state.

---

## 4. Detailed Screen Specifications

### Screen 1: `AdminSurveyQuestionsPage` (Questions Bank & Revisions)
- **Header & Search Bar**: Filter by question type, tag, search by `question_key` or title.
- **Question Cards / Table**:
  - Displays: `question_key`, active `revision_number`, question type badge (`single_select`, `multi_select`, `text_input`, `file_upload`, `rating`), points reward, statements summary, and survey usage badges.
- **Actions**:
  - `Create Question`: Navigates to `/admin/surveys/questions/editor?mode=create`.
  - `Edit / New Revision`: Opens editor in revision mode (`?key=...&rev=...`).
  - `Clone Question`: Clones key to a new modal prompt (`q_original_copy`) and opens editor.
  - `Version History`: Modal showing changelog and past revisions of this atomic question.

### Screen 2: `AdminSurveyQuestionEditorPage` (Question & Option Studio)
- **Section A: Core Metadata**:
  - `question_key` (slug identifier).
  - `question_type`: Dropdown (`single_select`, `multi_select`, `text_input`, `file_upload`, `rating`).
  - `points`: Mudras awarded for answering this question (default: 175).
  - `is_hidden`: Toggle switch.
    - When enabled: reveals "Value Source" selector (`static_default` vs `uri_parameter`).
    - Input field for parameter name (e.g. `order_id`, `product_sku`, `campaign`).
- **Section B: Multilingual Statements & AI Generator**:
  - Primary English input: Kicker, Question Title, Subtitle, Placeholder.
  - Action button: **"✨ Generate Translations with AI"** (animates and populates verses for Telugu, Hindi, Tamil, Malayalam, Kannada).
  - Language tabs (`EN`, `TE`, `HI`, `TA`, `ML`, `KN`) allowing manual refinement for each language.
- **Section C: Options & Media Studio (for select types)**:
  - Option Type Toggle: `Text Option` vs `Tile Option (Icon)` vs `Tile Option (Image)`.
  - Tile Aspect Ratio: `1:1 (Square)`, `4:3 (Landscape)`, `3:4 (Portrait)`.
  - For Icon Tiles: Searchable vector icon dropdown/grid (crown, sparkle, saree, diamond, heart, etc.).
  - For Image Tiles (3 Sourcing Tabs):
    1. *Upload to MinIO*: Drag-and-drop zone calling upload hook.
    2. *Catalog Browser*: Visual grid of recent catalog media to select from.
    3. *Direct URL*: Input to paste any MinIO / image URL.
    - Live Thumbnail Preview with aspect ratio container.
  - Branching Target: Dropdown of next `question_key` or "Next in Sequence".

### Screen 3: `AdminSurveyBuilderPage` (Survey Assembly & Publishing)
- **Survey Switcher & Creator**: Dropdown to select existing survey slug with a **"➕ New Survey"** button opening creation modal (slug, title, category, audience type).
- **Survey Metadata**: Title, slug, audience type (`guest` vs `registered`), default language, total Mudras target.
- **Cover Page Studio**: Kicker, headline, duration estimate, hero badge.
- **Step Sequencing**:
  - Ordered step list: drag-or-arrow reordering of questions selected from Questions Bank.
  - Step Revision Pinning: shows active revision (e.g. `Rev 1`) with an "Upgrade to Rev 2" prompt if a newer revision exists in the Question Bank.
  - Terminal question indicator toggle.
- **Publish Action**:
  - Promotes draft schema into an immutable version snapshot ($v_{N+1}$).
  - Mandatory changelog comment prompt modal.

### Screen 4: `AdminSurveyPreviewPage` (Design Preview & Sandbox Runner)
- **Viewport Canvas Bar**: Toggle between Mobile (`390px` iPhone/Android), Tablet (`768px`), and Full Desktop (`1200px`).
- **Language Switcher**: Test how survey dynamically re-renders in all 6 supported languages.
- **Live Survey Player**: Embeds `<SurveyPlayer />` directly with interactive traversal, step progress bar, and mudras animation.
- **Sandbox Testing Panel (Side drawer or floating dock)**:
  - **URI Parameter Simulator**: Inject key-values (e.g. `orderId=ORD-8823`, `utm=summer_fest`) to verify hidden question extraction.
  - **Submission Runner**: "Submit Test Run" button executing submission with `sandbox: true`, rendering simulated VIP Pass code and mudras credit without touching real wallets.

### Screen 5: `AdminSurveyResponsesPage` (Reviewing Submissions)
- **Filter Toolbar**: Filter by Survey, Version number, Date range, Route (`organic`, `order_confirmation`, etc.), and Mode (`Live` vs `Sandbox`).
- **Submissions Grid / Table**:
  - Displays: Submission ID, Version, User ID / Virtual Device FP, Phone, Language, Mudras Earned, Timestamp.
- **Submission Detail Inspector Modal**:
  - Formatted breakdown of questions with user's selected answers and uploaded files.
  - Formatted breakdown of auto-captured hidden metadata fields.
  - Raw JSON view toggle.

---

## 5. Design Tokens & Styling
- Tamagui design system using existing DeepLens luxury dark palette:
  - Background: `#0b0d11`, `#12151c`, `#171b24`
  - Accents: Gold `#D4AF37`, Emerald `#10b981`, Amber `#fbbf24`, Blue `#3b82f6`
  - Borders: `#1f2533`, `#2b3242`
  - Typography: Clean sans-serif with monospace for keys and hashes.

---

## 6. What's Left to the Builder
- Storybook mock fixtures for question bank items, catalog media files, and sample test responses.
- Simulated AI translation responses for the 5 regional languages.
- Navigation linkages between the 5 pages in Storybook stories.
