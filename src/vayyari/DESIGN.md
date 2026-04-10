# Design System: Vayyari Business Suite UI

## Typography

### Light Mode ("Vayyari Emerald")
*   **Display & Headlines:** Manrope
*   **Body & Labels:** Manrope

### Dark Mode ("Vayyari Emerald Nocturne")
*   **Display & Headlines:** Manrope
*   **Body & Labels:** Inter

## Color Palettes

### Light Mode (Vayyari Emerald)
| Role                     | Color (Hex) | Light/Dark Visual Context       |
| ------------------------ | ----------- | ------------------------------- |
| Background               | `#fcf9f8`   | Base background color           |
| On Background            | `#323233`   | Text/icons on background        |
| Primary                  | `#5f5e5e`   | Prominent UI elements           |
| On Primary               | `#faf7f6`   | Text/icons on primary           |
| Primary Container        | `#e5e2e1`   | Highlighted containers          |
| On Primary Container     | `#525151`   | Text/icons on primary container |
| Secondary                | `#006e36`   | Structural accents (Emerald)    |
| On Secondary             | `#e8ffe8`   | Text/icons on secondary         |
| Secondary Container      | `#83fba5`   | Active/Success states           |
| On Secondary Container   | `#005f2e`   | Text/icons on active states     |
| Surface                  | `#fcf9f8`   | Main canvas                     |
| On Surface               | `#323233`   | Primary text                    |
| Surface Variant          | `#e4e2e2`   | Borders or variant backgrounds  |
| On Surface Variant       | `#5f5f5f`   | Secondary text ("Fine Print")   |
| Surface Container Lowest | `#ffffff`   | Elevated Bento Cells            |
| Surface Container Low    | `#f6f3f2`   | Grouped sections                |
| Surface Container High   | `#eae8e7`   | In-Cell Modals                  |
| Error                    | `#9f403d`   | Error states                    |
| Outline                  | `#7b7b7a`   | Primary borders                 |
| Outline Variant          | `#b2b2b1`   | Subtle borders "Ghost Border"   |

### Dark Mode (Vayyari Emerald Nocturne)
| Role                     | Color (Hex) | Light/Dark Visual Context       |
| ------------------------ | ----------- | ------------------------------- |
| Background               | `#131313`   | Deep background canvas          |
| On Background            | `#e5e2e1`   | Text/icons on background        |
| Primary                  | `#66dd8b`   | Prominent UI elements (glow)    |
| On Primary               | `#003919`   | Text/icons on primary           |
| Primary Container        | `#006e36`   | Highlighted containers          |
| On Primary Container     | `#7af19d`   | Text/icons on primary container |
| Secondary                | `#abd0af`   | Structural accents              |
| On Secondary             | `#173720`   | Text/icons on secondary         |
| Secondary Container      | `#2d4e35`   | Active/Success states           |
| On Secondary Container   | `#9abe9e`   | Text/icons on active states     |
| Surface                  | `#131313`   | Base content area               |
| On Surface               | `#e5e2e1`   | Primary text                    |
| Surface Variant          | `#353534`   | Variant backgrounds             |
| On Surface Variant       | `#becabd`   | Secondary text                  |
| Surface Container Lowest | `#0e0e0e`   | Deepest background layer        |
| Surface Container Low    | `#1c1b1b`   | Grouped sections                |
| Surface Container        | `#201f1f`   | Interactive Cards               |
| Surface Container High   | `#2a2a2a`   | Elevated elements               |
| Error                    | `#ffb4ab`   | Error states                    |
| Outline                  | `#899488`   | Primary borders                 |
| Outline Variant          | `#3f4940`   | Subtle borders "Ghost Border"   |

## Key Design Principles
* **The "No-Line" Rule**: Traditional 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts.
* **Surface Hierarchy & Nesting**: Treat the screen as a series of physical layers (stacked sheets of frosted glass / organic dimensionality).
* **Glass & Gradients**: Use subtle glassmorphism and gradients for primary actions to add a weighted/tailored feel.

## Developer & AI Copilot Guidelines

### 1. Strict Tech Stack and Versions
Our environment strictly relies on the following foundational stack:
*   **Core Framework:** React Native (`0.81.5`), React (`19.1.0`), and Expo (`~54.0.33`).
*   **Routing:** Expo Router (`~6.0.23`) with `typedRoutes: true`.
*   **Language:** TypeScript (`~5.9.2`).
*   **UI Components:** React Native Paper (`^5.15.0`) combined with standard React Native primitives.

**Exclusions:**
*   Do not use older React Navigation patterns directly (`@react-navigation/native` is present but navigation must be driven by `expo-router` paradigms).
*   Do not use third-party styling libraries like `styled-components` or `tailwind` unless explicitly requested. Focus on the defined Design tokens within RN style sheets or `react-native-paper` thematic defaults.

### 2. Architectural Boundaries and Flow
The app uses a strict feature-by-folder structure mediated by Expo Router:
*   **`app/`**: Contains only routing logic and screen aggregates.
*   **`components/`**: Reusable pure components (e.g., custom Bento Cards, specialized buttons).
*   **`hooks/`**: Shared state logic, API data fetching, and business logic.
*   **`constants/`**: Design tokens, static assets, layout measurements (like spacing).

**Data Flow:**
*   Screens fetch data via custom React hooks that sit between the UI component and the API wrapper. 
*   Avoid placing heavy data transformation or network requests directly inside `useEffect` blocks within UI components; abstract these to hooks.

### 3. Non-Negotiable Coding Standards
*   **React 19 Standard (Mandatory):** All React code written for this project — whether by a developer or an AI copilot — must conform to **React 19** conventions. This includes functional components, the new Context API syntax, implicit JSX transforms, and any other React 19 APIs. React 18 or earlier patterns are not acceptable.
*   **Modern React:** Strictly use React functional components. Define all props and state variables using explicit TypeScript interfaces or types.
*   **React Compiler Aware:** The project has `reactCompiler: true` enabled. Assume that memoization (`useMemo`, `useCallback`, `React.memo`) is handled by the React Compiler under the hood, so manual memoization should be omitted unless solving a specific proven performance bottleneck.
*   **Styling:** Build stylesheets using `StyleSheet.create`. Use the design system tokens for colors and spacing (e.g. use `colors.primary`, `spacing[3]`).
*   **Naming Conventions:** 
    *   Types and Interfaces should be PascalCase and often suffixed with their functional scope (e.g., `ProductDetailsProps`, `UserApiData`).
    *   Components must be PascalCase (`BentoCard.tsx`).
    *   Hooks must start with `use` and be camelCase (`useFetchOrder.ts`).

### 4. Core Data Models
As a business suite UI tailored for fashion and commercial metrics, the typical data structures are:
*   **`Product`**: Represents items (garments, accessories) containing `id`, `sku`, `title`, `price` (nested object for currency), `inventoryLevel`, and `mediaUrls`.
*   **`Order`**: Represents a transaction. Belongs to a `Customer` and contains multiple `OrderItems` (which reference `Product`).
*   **`MetricSummary`**: Used for dashboard display. Contains `label`, `currentValue`, `percentageChange`, and `statusTheme` (mapping to the success/error colors in the UI).
*   **`Customer`**: Holds user profiles and interaction histories.

### 5. Error Handling and Logging Strategy
*   **UI Error Boundaries:** Unhandled UI exceptions should present a clean "Oops" surface using the `Surface Container Lowest` background and the `Error` tokens, offering a clear retry mechanism. Fallback views should follow the "Atmospheric Clarity" theme without displaying raw stack traces.
*   **Data Fetching Failures:** API errors must return a standardized JSON structure (e.g., `{ success: false, error: { code: string, message: string } }`).
*   **Console Logging:** `console.log` is strictly for local dev debugging. Generic try/catch blocks must not merely swallow errors with `console.error`; they must parse the error and trigger user-facing feedback (like a Toast or Banner).

### 6. "Do Not Do X" (Anti-Patterns)
*   **Do Not Implement 1px Borders:** Never add `borderWidth: 1` as a visual separator for UI regions. Always use the "No-Line" rule (background color shifts).
*   **Do Not Use Raw Hex Colors:** Never hardcode hex values like `#131313` or `#ffffff` in your `.tsx` files. Always reference the theme context or constant color palettes.
*   **Do Not Bypass Expo Router:** Do not manually push state to the React Navigation stack unless required for a deeply nested parallel route trick; prefer `router.push('/path')` from `expo-router`.
*   **Do Not Make "App-Like" UIs:** Reject standard boxed UIs for the main dashboards. If you are centering a text element strictly inside a square box with a shadow, you've deviated. Use the asymmetrical layout and bento-box rules outlined in the design specs.

### 7. Observability as a First-Class Citizen
*   **Core Requirement:** Telemetry and tracking must be considered during the initial implementation of any new feature, not bolted on afterward.
*   **Usage Tracking:** Screens must emit an event upon mounting (e.g., via a designated `useScreenTracker` hook). Key user interactions—such as button presses on the Bento cards, filter changes, and form submissions—must trigger analytical events to grant visibility into feature usage.
*   **Performance Monitoring:** Encapsulate heavy computations or API waterfalls with performance traces. Capture render durations or load wait-times explicitly in your reporting payload.
*   **No Silent Failures:** Combine error handling with observability. Safely caught exceptions in generic try/catch blocks *must* still forward a diagnostic payload to our designated logging service (e.g., Sentry, PostHog, or Datadog), even if the UI recovers gracefully for the user.
