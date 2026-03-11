<div align="center">

# 🇳🇵 Nepali Salary Calculator
### *The premium workspace for the Nepali workforce.*

[![Deploy to GitHub Pages](https://github.com/scuba3198/salary-calculator/actions/workflows/deploy.yml/badge.svg)](https://github.com/scuba3198/salary-calculator/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/🚀%20Live-Demo-6366f1)](https://scuba3198.github.io/salary-calculator)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite 7](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

<br />

<img src="./public/assets/screenshot-dark.png" alt="Nepali Salary Calculator Hero" width="800" style="border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.3);" />

<br />

**[Experience the App Live](https://scuba3198.github.io/salary-calculator)**

---

<p align="left">
Modern, fast, and feature-rich. The **Nepali Salary Calculator** is a premium workspace designed to solve the complexity of tracking workdays across multiple organizations using the native **Bikram Sambat (B.S.)** calendar.

The application is powered by a **Pure Effect-TS Architecture**, where React serves strictly as a logic-less view layer ("Dumb Terminal") while Effect manages the entire application lifecycle, state transitions, and concurrency.

</div>

---

## 🏗️ Architectural Blueprint

The system follows a strict **Reactive Loop** where all side effects are managed by the Effect Runtime.

```mermaid
graph TD
    subgraph "React (View Layer)"
        UI["App Components"]
    end

    subgraph "Effect Runtime (The Engine)"
        Queue["AppIntent Queue"]
        Handlers["Intent Handlers"]
        Services["Effect Services (Supabase, Auth, Install)"]
        State["SubscriptionRef (Single Source of Truth)"]
    end

    UI -- "dispatch(Intent)" --> Queue
    Queue -- "take" --> Handlers
    Handlers -- "execute" --> Services
    Services -- "update" --> State
    State -- "stateStream" --> UI
```

---

## 💎 Visual Showcase

| Light Mode Interface | Dark Mode Interface |
| :---: | :---: |
| <img src="./public/assets/screenshot-light.png" width="400" style="border-radius: 8px;" /> | <img src="./public/assets/screenshot-dark.png" width="400" style="border-radius: 8px;" /> |

---

## ✨ Premium Features

### 🛡️ Smart Guest Protocol
> **No account? No problem.**
*   **Instant Access**: Use the full suite of tools immediately via "Transient Guest Mode".
*   **Effect Persistence**: Your settings and dates are safely synced to `localStorage` via an Effect stream.
*   **Merge Catalyst**: When you're ready to create an account, existing guest data is automatically migrated. **Zero data loss.**

### 🏢 Elite Workspace Management
*   **Unlimited Organizations**: Manage concurrent jobs or clients in separate silos.
*   **Race-Condition Free**: Switching workspaces interrupts previous sync fibers, ensuring zero state pollution.
*   **Granular Economics**: Fine-tune hourly rates (Rs), daily hours, and TDS (%) per workspace.

### 🇳🇵 Native Calendar Precision
*   **Pure Nepali Experience**: Fully integrated Bikram Sambat system.
*   **Holiday & Weekend Intel**: Automatic visual cues for non-working days.
*   **Intuitive Marking**: A "tap-to-log" system that makes tracking feel like a breeze.

### 📊 Financial Command Center
*   **Live Gross/Net Logic**: Real-time salary projection as you toggle dates.
*   **Purity First**: All calculations are pure, synchronous functions, ensuring deterministic results across any platform.

---

## 🛠️ The Technology Core

| Technology | Purpose |
| :--- | :--- |
| **Effect-TS** | The "Operating System" — state, concurrency, and logic. |
| **React 19** | The "Dumb Screen" — rendering UI via `useSyncExternalStore`. |
| **TypeScript** | Strict, industrial-grade type safety with `@tsconfig/strictest`. |
| **Supabase** | Backend infrastructure (PostgreSQL & Real-time Auth). |
| **Vanilla CSS** | Pure, hand-optimized styles for a "Glassmorphism" look. |
| **PWA** | Offline-first functionality with specialized stress-tested resilience. |

---

## 🧪 Testing Architecture

We employ a **Fail-Fast Verification Suite** to guarantee reliability:

- **Forbidden Pattern Guard**: `npm run forbidden:check` fails CI on disallowed Effect anti-patterns (e.g. `Effect.runSync`, `Effect.runPromise`, `console.*`, broad `catchAll/mapError`).
- **Effect Diagnostics**: `npm run effect:check` enforces Effect Language Service checks in CI.
- **PWA Stress Testing**: Cross-browser **Playwright** suite that simulates extreme hardware/network conditions (Lie-Fi, storage wipe, rapid orientation change).
- **Unit Math**: **Vitest** verified calculations for Nepali tax laws and hours.
- **Continuous Integration**: Sequential fail-fast pipeline executing Lint → Format/Check → Forbidden Pattern Guard → Effect Diagnostics → Typecheck → Unit → Build → E2E Stress.

---

## 🚀 Quick Start

### 1. Zero-Config Install
```bash
git clone https://github.com/scuba3198/salary-calculator.git
cd salary-calculator
npm ci
```

### 2. Configure Supabase (required)

Create `.env.local` in the repo root:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 3. Local Development
```bash
npm run dev
```

### 4. Verification Suite
```bash
# CI parity checks (recommended before pushing)
npm run lint
npm run check
npm run forbidden:check
npm run effect:check
npm run typecheck
npm test
```

---

## 📜 Repository Health

- `npm run lint`: Maintain industrial-standard code quality via Biome.
- `ci.yml`: Automated verification pipeline.
- `deploy.yml`: Automated CD pipeline for GitHub Pages.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/scuba3198">Mumukshu D.C</a></sub>
  <br />
  <sub>&copy; 2026 Salary Calculator. All rights reserved.</sub>
</div>
