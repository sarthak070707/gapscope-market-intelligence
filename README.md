<div align="center">

# GapScope

**AI-powered market intelligence platform for discovering startup opportunities**

[!\[Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[!\[React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[!\[TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[!\[Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[!\[Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[!\[Bun](https://img.shields.io/badge/Bun-Runtime-000000?logo=bun&logoColor=white)](https://bun.sh/)

[🚀 Live Demo](#) · [📦 Repository](#) · [📋 Architecture](#architecture) · [⚙️ Setup](#setup-instructions)

</div>

\---

## Overview

GapScope is a full-stack market intelligence platform that helps founders, product managers, and investors identify underserved market opportunities before they become obvious.

The platform ingests and analyzes:

* **Demand signals** — search trend momentum and growth trajectories
* **Startup competition** — product discovery, feature mapping, and saturation scoring
* **User pain points** — complaint clustering and sentiment analysis
* **Market gaps** — underserved niches, missing features, and execution difficulty
* **Opportunity signals** — quality-scored opportunities with founder-fit indicators

GapScope combines multiple intelligence sources into a unified analytical surface:

|Source|Capability|
|-|-|
|**Trend Analysis**|Google Trends–style demand analysis with growth rate tracking|
|**Product Discovery**|Product Hunt–style startup scanning with category coverage|
|**Complaint Intelligence**|User feedback clustering and pain-point extraction|
|**AI Insights**|LLM-assisted gap identification and opportunity scoring|

\---

## Key Features

### Analysis Engine

* **Trend Detection** — Category-level growth rate tracking with directional indicators (rising, stable, declining)
* **Opportunity Analysis** — Quality-scored opportunities with saturation scores, evidence chains, and founder-fit assessment
* **Market Saturation Analysis** — Real-time saturation meters per category with competitive density visualization
* **Complaint Clustering** — Aggregated user complaints with sentiment classification and frequency scoring
* **Emerging Niches** — Sub-niche identification within categories, including underserved user segments
* **Demand vs Competition Insights** — Side-by-side comparison of demand signals against competitive density

### Platform Reliability

* **Resilient Fallback Architecture** — Five-layer data retrieval pipeline ensuring the platform never shows a blank state
* **Source Transparency Badges** — Every data point is tagged with its origin: `Live`, `Cached`, `Database`, `AI Knowledge`, or `Sample`
* **Structured Error Handling** — Stage-prefixed error taxonomy with full stack preservation and provider message passthrough
* **Cooldown + Rate-Limit Protection** — Automatic lockout on 429 responses with escalating cooldowns (120s → 300s) and frontend countdown timers
* **Cached + Database-Backed Retrieval** — Multi-tier caching reduces API dependency and improves response times

\---

## Architecture

GapScope uses a **five-layer fallback pipeline** for data retrieval. Each layer is attempted in order, and the system gracefully degrades rather than failing:

```
┌─────────────────────────────────────────────┐
│  Layer 1 — Database Cache                   │
│  Synchronous DB lookup. Returns immediately │
│  if sufficient data exists (3+ records).    │
├─────────────────────────────────────────────┤
│  Layer 2 — Search Cache                     │
│  In-memory search result cache with TTL.    │
│  Avoids redundant API calls.                │
├─────────────────────────────────────────────┤
│  Layer 3 — Live Search APIs                 │
│  Real-time web search via AI SDK.           │
│  Results are cached for future requests.    │
├─────────────────────────────────────────────┤
│  Layer 4 — AI Knowledge Fallback            │
│  LLM-generated insights when search APIs   │
│  are rate-limited or unavailable.           │
├─────────────────────────────────────────────┤
│  Layer 5 — Seed / Sample Data               │
│  Auto-seeded representative products and    │
│  gaps. Ensures the platform always has      │
│  content to display.                        │
└─────────────────────────────────────────────┘
```

**Why this architecture exists:** External search and AI APIs are inherently unreliable — they enforce rate limits, experience downtime, and throttle requests. The fallback pipeline ensures GapScope remains functional and informative even when every external API is unavailable. Users always see data, always see source badges, and can always trigger a fresh scan when rate limits clear.

\---

## Tech Stack

### Frontend

|Technology|Purpose|
|-|-|
|**Next.js 16**|App Router, SSR, API routes|
|**React 19**|Component framework with concurrent features|
|**TypeScript 5**|Full type safety across client and server|
|**Tailwind CSS 4**|Utility-first styling with design tokens|
|**shadcn/ui**|Accessible, composable UI component library|
|**Zustand**|Lightweight client-side state management|
|**TanStack Query**|Server state management with caching and retries|
|**Recharts**|Data visualization for trends and saturation charts|
|**Framer Motion**|Declarative animations and transitions|

### Backend

|Technology|Purpose|
|-|-|
|**Next.js API Routes**|RESTful endpoints with typed request/response|
|**Prisma 6**|Type-safe ORM with SQLite adapter|
|**SQLite**|Embedded database for persistent storage|
|**z-ai-web-dev-sdk**|AI SDK integration for search and LLM capabilities|
|**Structured Error Pipeline**|Stage-prefixed error taxonomy with classification|

### Infrastructure

|Capability|Implementation|
|-|-|
|**Caching**|Multi-tier: in-memory search cache + database cache|
|**Fallback Architecture**|Five-layer retrieval pipeline with graceful degradation|
|**Async Workflows**|Non-blocking scan execution with background job tracking|
|**Observability**|Stage-prefixed logging, error classification, source attribution|

\---

## Engineering Highlights

This section details the engineering decisions that differentiate GapScope from simple AI-wrapper applications.

### Resilient API Pipeline Architecture

The scan endpoint implements a sequential fallback chain — each layer handles a specific failure mode:

* **Database layer** eliminates API calls entirely when data exists
* **Search cache** deduplicates identical queries within a TTL window
* **Live search** is only invoked when no cached data is available
* **AI knowledge fallback** activates when search APIs return 429 or 5xx
* **Seed data** guarantees a non-empty state for every category

Every layer tags its output with a `dataSource` field, enabling full source traceability from frontend badge back to retrieval layer.

### Structured Error Taxonomy

Errors are classified at the point of occurrence using a `classifyError()` function that maps raw errors into structured `ModuleError` objects:

```typescript
interface ModuleError {
  type: 'rate\\\_limit' | 'api\\\_error' | 'network\\\_error' | 'parse\\\_error' | 'unknown'
  stage: string            // e.g. "WEB\\\_SEARCH", "DB\\\_FALLBACK", "AI\\\_KNOWLEDGE"
  message: string          // Original provider message preserved
  providerMessage?: string // Raw upstream error text
  retryAfterSeconds?: number
  retryable: boolean
}
```

All thrown errors carry a stage prefix: `throw new Error(\\\\`\[STAGE\_NAME] ${originalMessage}`)`. This ensures terminal logs show the exact failing stage, the original error message, and the full stack trace — no generic "something went wrong" messages.

### Observability and Debugging Layers

* **Stage-prefixed errors** — Every error includes the pipeline stage where it occurred
* **Source attribution** — Every data record carries a `dataSource` tag (live, cached, database, ai\_knowledge, sample)
* **Frontend dev-mode messages** — Original backend error messages are displayed in development mode for rapid debugging
* **Terminal logging** — Full stack traces with stage context are logged server-side

### Rate-Limit Handling

The rate-limit subsystem is designed to be protective rather than reactive:

1. **Stop-on-first-429** — When a 429 is detected, the system immediately stops making requests to the same endpoint
2. **Escalating cooldowns** — First lockout: 120s. Subsequent lockouts: 300s. Cooldowns are keyed by `${category}:${period}:/api/scan`
3. **Frontend countdown** — A `useRateLimitCooldown` hook drives a live countdown timer in the UI, disabling the scan button and showing a cooldown banner
4. **Automatic recovery** — Cooldowns expire automatically; no manual intervention required

### Modular Backend Design

Each API route follows a consistent pattern:

* Typed request/response schemas
* Stage-prefixed error throwing
* Multi-layer fallback where applicable
* Database-backed persistence
* Structured error responses with `createErrorResponse()`

### Graceful Degradation

The platform prioritizes showing *something useful* over showing *nothing perfect*:

* If the search API is down, the AI knowledge layer provides analytical content
* If all APIs are down, the database layer returns previously cached results
* If the database is empty, auto-seeded sample data ensures the UI is never blank
* Source badges make it transparent to the user which layer provided the current data

### Source Attribution System

Every product, gap, opportunity, and trend record includes a `dataSource` field. This propagates from the backend retrieval layer through the API response to frontend source badges:

|Badge|Meaning|
|-|-|
|`Live`|Data retrieved from a live web search API in real-time|
|`Cached`|Data served from in-memory search cache|
|`Database`|Data retrieved from the persistent SQLite database|
|`AI Knowledge`|Data generated by an LLM when search APIs were unavailable|
|`Sample`|Pre-seeded representative data for demonstration|

\---

## Screenshots

### \## Dashboard Preview

*!\[Dashboard](./screenshots/dashboard.png)*

### \## Product Hunt Scanner

*!\[Product Hunt Scanner](./screenshots/product-hunt.png)*

### \## Trending Gaps

*!\[Trending Gaps](./screenshots/trending-gaps.png)*

\---

## API \& Reliability Notes

GapScope relies on external search and AI providers for live data. These providers enforce rate limits and may throttle or reject requests during high-traffic periods.

**How the platform handles this:**

* External providers may return `429 Too Many Requests` or `5xx` errors at any time
* The multi-layer fallback pipeline ensures data is always available from an alternative source
* Search results are cached both in-memory and in the database to reduce API dependency
* The AI knowledge fallback provides analytical content when search APIs are unavailable

**Source badges** indicate where each data point originates:

|Badge|Source|
|-|-|
|🔴 Live|Real-time API response|
|🟡 Cached|In-memory or database cache|
|🟢 Database|Persistent storage lookup|
|🔵 AI Knowledge|LLM-generated insight|
|⚪ Sample|Pre-seeded demonstration data|

\---

## Setup Instructions

```bash
# Clone the repository
git clone https://github.com/your-username/gapscope.git
cd gapscope

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client and push schema
bun run db:generate
bun run db:push

# Start the development server
bun run dev
```

The application will be available at `http://localhost:3000`.

\---

## Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
# Database — SQLite connection string
DATABASE\\\_URL=file:./db/custom.db

# AI API — Used for web search and LLM-powered analysis
AI\\\_API\\\_KEY=your\\\_ai\\\_api\\\_key\\\_here

# Search API — Used for live product and trend discovery
SEARCH\\\_API\\\_KEY=your\\\_search\\\_api\\\_key\\\_here
```

> \\\*\\\*Note:\\\*\\\* The application will function without `AI\\\_API\\\_KEY` and `SEARCH\\\_API\\\_KEY` by falling back to database cache and seed data. However, live scanning and AI-powered insights require valid API keys.

\---

## Future Improvements

* **Google Trends integration** — Direct trend data ingestion for more accurate demand signal analysis
* **Reddit/X complaint intelligence** — Real-time pain-point extraction from social platforms
* **Asynchronous job queue scanning** — Background job processing for large-scale category scans
* **Advanced opportunity scoring** — Multi-factor scoring model incorporating market size, competition velocity, and founder-fit heuristics
* **Multi-source market intelligence** — Aggregation of data from additional sources (App Store, G2, Capterra) for cross-validated insights
* **WebSocket-driven scan progress** — Real-time scan stage updates via WebSocket connection
* **Historical trend tracking** — Time-series storage for trend data with change detection alerts

\---

## License

MIT

