# Vayyari Business Suite: Component Hierarchy

This document maps the architectural component hierarchy of the Vayyari Business Suite, starting from the application root layout all the way down to the atomic UI elements.

## Visual Hierarchy

```mermaid
graph TD
    %% Root Provider Layer
    RootLayout["app/_layout.tsx (RootLayout)"]:::layout
    RootLayout --> TP["ThemeProvider (React Navigation)"]
    TP --> PP["PaperProvider (React Native Paper)"]
    PP --> CTP["ThemeProvider (Our custom ThemeContext)"]
    
    %% Routing Layer
    CTP --> Stack["Stack (Expo Router)"]
    Stack --> Modal["app/modal.tsx (App Appearance Menu)"]:::screen
    Stack --> TabLayout["app/(tabs)/_layout.tsx (TabLayout)"]:::layout
    
    %% Tab Navigation Component
    TabLayout --> Tabs["Tabs (Expo Router)"]
    Tabs --> CTB["CustomTabBar.tsx (Responsive Nav Wrapper)"]:::component
    
    %% Screens
    Tabs --> Dashboard["app/(tabs)/index.tsx (DashboardScreen)"]:::screen
    Tabs --> Placeholders["scan.tsx, new.tsx, orders.tsx, insights.tsx"]:::screen
    
    %% Dashboard Internal Hierarchy
    Dashboard --> Appbar["Appbar.Header (Title + Gear)"]
    Dashboard --> SV["ScrollView (maxWidth: 800px)"]
    
    %% Bento Cards
    SV --> HeroCard["BentoCard (Orders Today)"]:::component
    SV --> SplitView["View (Row Flex)"]
    SplitView --> PendingCard["BentoCard (Pending Reminders)"]:::component
    SplitView --> LogisticsCard["BentoCard (Logistics)"]:::component
    
    %% Timeline List
    SV --> TimelineCard["BentoCard (Customer Timeline)"]:::component
    TimelineCard --> TL1["TimelineItem (Omnichannel)"]:::component
    TimelineCard --> TL2["TimelineItem (Social Tag)"]:::component
    TimelineCard --> TL3["TimelineItem (Transaction)"]:::component

    classDef layout fill:#2C3A3B,stroke:#5CE5B4,stroke-width:2px,color:#fff;
    classDef screen fill:#1A2526,stroke:#3BA884,stroke-width:1px,color:#fff;
    classDef component fill:#0D4030,stroke:#32A852,stroke-width:1px,stroke-dasharray: 4 4,color:#fff;
```

## Architectural Layers Explained

### 1. The Global Injection Ring (`app/_layout.tsx`)
At the very top, the application wraps three massive global providers:
1.  **React Navigation** (Handling URL routing configurations).
2.  **React Native Paper Provider** (Injecting the raw Vayyari Emerald Color map to all standard components to bypass hard-coded CSS).
3.  **ThemeContext Provider** (Our new persistent Async Storage hook tracking 'System | Light | Dark').

### 2. The Form-Factor Gateway (`app/(tabs)/_layout.tsx`)
This handles the switchboard logic. Instead of executing the native Expo router tools blindly, it points its logic to the `CustomTabBar.tsx` renderer. Here, standard navigation routes (scan, orders, index) dictate their requested Icons cleanly.

### 3. The Atomic Semantic Canvas (`app/(tabs)/index.tsx`)
When hitting the Dashboard, the application heavily utilizes the `ui/` subdirectory. Instead of manually drawing grids and colored boxes, the Dashboard strictly calls:
*   `<BentoCard>` structural elements passing custom semantic `surfaceLevel` backgrounds.
*   `<TimelineItem>` blocks containing flexible event tracking parameters.
