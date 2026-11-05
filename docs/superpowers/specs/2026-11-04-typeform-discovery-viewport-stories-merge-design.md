# Design: Merge Viewport Stories in Typeform Discovery Journey Storybook

**Date:** 2026-11-04  
**Status:** Draft (Awaiting Approval)  
**File Modified:** `src/apps/storybook/src/stories/pages/TypeformDiscoveryPage.stories.tsx`

---

## 1. Intent & The Why
In `Pages/Prelaunch/Typeform Discovery Journey` (`TypeformDiscoveryPage.stories.tsx`), there are currently multiple redundant stories (`1. Single Screen Viewport`, `1b. Tablet 768px`, `1c. Desktop 1024px+`, `2. Mobile 390px`) created to demonstrate separate form factors. 

Because `FormFactorShell` (applied via `.storybook/preview.tsx`) provides dynamic in-situ switching between Mobile (390px), Tablet (768px), and Desktop (1280px), and `TypeformSingleScreenContainer` already calculates responsive columns (`columns: 'auto'` -> 3 on mobile, 4 on tablet, 5 on desktop), separate stories for device sizes are unnecessary. Consolidating them reduces Storybook clutter and unifies responsive testing under a single story.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Merge stories `1`, `1b`, `1c`, and `2` into a single canonical story: `1. Single Screen Viewport (Responsive Auto 3/4/5 Columns)`.
- Enable dynamic form factor adaptation using `columns: 'auto'` so switching device sizes in the `FormFactorShell` toolbar works seamlessly.
- Renumber and rename subsequent stories to remove outdated "Mobile 390px" tags and establish a clear, consecutive numbering sequence.
- Remove redundant individual `withFormFactor` decorators that conflict with or duplicate the global shell.

### Non-Goals
- Modifying underlying component logic in `TypeformSingleScreenContainer` or `SurveyPlayer`.
- Changing non-prelaunch story files.

### Anti-Goals
- Retaining stale numbering gaps (e.g., jumping from 1 to 3).
- Hardcoding static device widths inside responsive stories.

---

## 3. Constraints
- Must adhere to DeepLens Storybook standards and TypeScript typings.
- All controls (`argTypes`) on the component meta must continue to function.

---

## 4. Approaches Considered
1. **Approach 1: Unified Responsive Story & Renumbered Story Titles (Selected)**
   - Merges stories 1, 1b, 1c, 2 into one responsive story.
   - Renumbers and renames remaining stories cleanly without hardcoded device prefixes.
   - *Why chosen:* Provides a clean, modern Storybook sidebar hierarchy without confusing gaps or outdated "Mobile 390px" labels.
2. **Approach 2: Strict Merge of 1, 1b, 1c, 2 (Retaining Subsequent Names As-Is)**
   - Merges only stories 1, 1b, 1c, 2 and leaves stories 3–11 untouched.
   - *Tradeoff:* Leaves numbering gaps (skips from 1 to 3) and leaves misleading "Mobile 390px" labels on stories that also work on tablet/desktop.

---

## 5. Story Mapping & Proposed Renaming

| Old Story | Old Name | New Story Name |
| :--- | :--- | :--- |
| `SurveyCoverScreenPreview` | `0. Survey Cover Page (Briefing & Language Choice)` | `0. Survey Cover Page (Briefing & Language Choice)` |
| `SingleScreenFlowWithRewards`, `TabletSingleScreen4Columns`, `DesktopSingleScreen5Columns`, `MobileSingleScreenSquare` | `1. Single Screen Viewport...`, `1b. Tablet 768px...`, `1c. Desktop 1024px+...`, `2. Mobile 390px (Square 1:1)` | `1. Single Screen Viewport (Responsive Auto 3/4/5 Columns)` (Merged) |
| `MobileSingleScreenPortrait34` | `3. Mobile 390px (Aspect Ratio 3:4 Portrait Fashion)` | `2. Fashion Portrait (Aspect Ratio 3:4)` |
| `MobileSingleScreenLandscape43` | `4. Mobile 390px (Aspect Ratio 4:3 Landscape)` | `3. Compact Landscape (Aspect Ratio 4:3)` |
| `MobileSingleScreenStory916` | `5. Mobile 390px (Aspect Ratio 9:16 Story Tall)` | `4. Vertical Story (Aspect Ratio 9:16)` |
| `MobileSingleScreenNoRewards` | `6. Mobile 390px (NO Rewards / Standard Survey)` | `5. Standard Survey (No Mudras Rewards)` |
| `VayyariDarkSingleScreen` | `7. Vayyari Dark Prelaunch Theme (With Rewards)` | `6. Vayyari Dark Theme (With Rewards)` |
| `PrePublishThemeSwitcher` | `8. Live Switcher (Themes, Rewards, Ratios & Progress)` | `7. Interactive Live Switcher (Controls)` |
| `TopProgressPercentageBar` | `9. Progress Style: Thin Percentage Bar (Dynamic % Indicator)` | `8. Progress Style: Thin Percentage Bar` |
| `TopProgressStepTracker` | `10. Progress Style: Top Step Tracker (Bottom-Left Counter Removed)` | `9. Progress Style: Top Step Tracker` |
| `Complete8StepEngineEnglish` | `11. Comprehensive 8-Step Engine (Multilingual)` | `10. Comprehensive 8-Step Survey Engine (Multilingual)` |

---

## 6. What's Left to the Builder
- Update `src/apps/storybook/src/stories/pages/TypeformDiscoveryPage.stories.tsx`.
- Verify the story types and Storybook build with TypeScript check.
