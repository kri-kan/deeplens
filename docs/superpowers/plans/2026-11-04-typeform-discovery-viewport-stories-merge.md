# Merge Viewport Stories in Typeform Discovery Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate redundant form factor viewport stories into a single responsive story and renumber subsequent stories cleanly in `TypeformDiscoveryPage.stories.tsx`.

**Architecture:** Utilize Storybook's global `FormFactorShell` decorator (from `.storybook/preview.tsx`) which wraps all `Pages/` stories in an interactive device chassis with Mobile (390px), Tablet (768px), and Desktop (1280px) toggling. Rely on `TypeformSingleScreenContainer`'s built-in `columns="auto"` responsive grid instead of maintaining distinct stories per device dimension.

**Tech Stack:** React 19, TypeScript, Storybook for React Native / Web, Tamagui.

**Spec:** [docs/superpowers/specs/2026-11-04-typeform-discovery-viewport-stories-merge-design.md](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-04-typeform-discovery-viewport-stories-merge-design.md)

## Global Constraints
- Target file: `src/apps/storybook/src/stories/pages/TypeformDiscoveryPage.stories.tsx`
- Meta title MUST remain `'Pages/Prelaunch/Typeform Discovery Journey'`
- All Storybook control arguments (`argTypes`, `args`) MUST remain intact and fully functional
- Type checking MUST pass cleanly with `npm run typecheck` in `src/apps/storybook`
- Unused `withFormFactor` imports MUST be cleaned up

## Review Focus
1. **Responsive Column Adaptation**: Verify that Story 1 (`SingleScreenFlowWithRewards`) renders with `columns: 'auto'` so that it scales dynamically to 3 columns on mobile, 4 columns on tablet, and 5 columns on desktop when toggled in `FormFactorShell`.
2. **Sidebar Story Hierarchy & Numbering**: Verify stories are strictly ordered from `0` to `10` without numbering gaps or hardcoded "Mobile 390px" prefixes.
3. **Control Interactivity**: Verify Story 7 (`PrePublishThemeSwitcher`) retains its full control args mapping for live theme, reward, aspect ratio, and progress switching.
4. **End-to-End Multilingual Engine**: Verify Story 10 (`Complete8StepEngineEnglish`) renders `TypeformDiscoveryEngine` with full interactive flow.

---

### Task 1: Consolidate Viewport Stories & Renumber Journey Stories

**Files:**
- Modify: `src/apps/storybook/src/stories/pages/TypeformDiscoveryPage.stories.tsx`

**Interfaces:**
- Consumes: `TypeformSingleScreenContainerProps`, `TypeformSingleScreenContainer`, `TypeformDiscoveryEngine` from `../../components/organisms/TypeformSurvey`
- Produces: Exported stories (`SurveyCoverScreenPreview`, `SingleScreenFlowWithRewards`, `FashionPortrait34`, `CompactLandscape43`, `VerticalStory916`, `StandardSurveyNoRewards`, `VayyariDarkSingleScreen`, `PrePublishThemeSwitcher`, `TopProgressPercentageBar`, `TopProgressStepTracker`, `Complete8StepEngineEnglish`)

- [x] **Step 1: Update `TypeformDiscoveryPage.stories.tsx` to merge stories 1, 1b, 1c, 2 into a single responsive story and renumber remaining stories**

Update `TypeformDiscoveryPage.stories.tsx` with the following story structure:
- Story `0. Survey Cover Page (Briefing & Language Choice)` (`SurveyCoverScreenPreview`)
- Story `1. Single Screen Viewport (Responsive Auto 3/4/5 Columns)` (`SingleScreenFlowWithRewards`):
  - Uses `columns={args.columns || 'auto'}`
  - Uses `tileAspectRatio={args.tileAspectRatio || '1:1'}`
  - No redundant per-story `withFormFactor` decorator; relies on global `FormFactorShell`
- Remove `TabletSingleScreen4Columns` (1b), `DesktopSingleScreen5Columns` (1c), and `MobileSingleScreenSquare` (2)
- Story `2. Fashion Portrait (Aspect Ratio 3:4)` (`FashionPortrait34`):
  - `tileAspectRatio="3:4"`
  - Cleaned name removing "Mobile 390px"
- Story `3. Compact Landscape (Aspect Ratio 4:3)` (`CompactLandscape43`):
  - `tileAspectRatio="4:3"`
  - Cleaned name removing "Mobile 390px"
- Story `4. Vertical Story (Aspect Ratio 9:16)` (`VerticalStory916`):
  - `tileAspectRatio="9:16"`
  - Cleaned name removing "Mobile 390px"
- Story `5. Standard Survey (No Mudras Rewards)` (`StandardSurveyNoRewards`):
  - `hasRewards={false}`
  - Cleaned name removing "Mobile 390px"
- Story `6. Vayyari Dark Theme (With Rewards)` (`VayyariDarkSingleScreen`):
  - `themeId="vayyari-dark"`
- Story `7. Interactive Live Switcher (Controls)` (`PrePublishThemeSwitcher`):
  - Full args mapping with controls for theme, aspect ratio, rewards, and progress
- Story `8. Progress Style: Thin Percentage Bar` (`TopProgressPercentageBar`):
  - `progressType="percentage"`
- Story `9. Progress Style: Top Step Tracker` (`TopProgressStepTracker`):
  - `progressType="step"`
- Story `10. Comprehensive 8-Step Survey Engine (Multilingual)` (`Complete8StepEngineEnglish`):
  - Renders `<TypeformDiscoveryEngine initialLanguage="en" mockVipCode="VY-VIP-8821" />`

- [x] **Step 2: Remove unused imports from `TypeformDiscoveryPage.stories.tsx`**

Remove `withFormFactor` import if no longer needed, or keep minimal clean imports.

- [x] **Step 3: Run TypeScript verification**

Run: `npm run typecheck` in directory `src/apps/storybook`
Expected: Output code 0 with zero type errors.

- [x] **Step 4: Verify Storybook file structure and story exports**

Verify all 11 stories (indices 0 through 10) are exported properly with valid identifiers and names matching the spec table.
