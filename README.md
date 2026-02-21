# ClosedBoard

A PIN-protected Kanban board and task tracker with an integrated learning dashboard, built with React 18, Vite, and Tailwind CSS. Designed as a personal productivity tool for tracking AI assistant tasks, personal projects, and structured learning goals.

**Live:** https://mharisu.github.io/closedboard/

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Application Flow](#application-flow)
- [Component Reference](#component-reference)
- [State Management](#state-management)
- [API Layer & Offline Fallback](#api-layer--offline-fallback)
- [Theming System](#theming-system)
- [Authentication](#authentication)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Deployment](#deployment)
- [Configuration Constants](#configuration-constants)
- [Known Limitations](#known-limitations)
- [Future Development Roadmap](#future-development-roadmap)
- [Getting Started](#getting-started)

---

## Architecture Overview

```
Entry Point
  main.jsx
    └── PinGate (auth wall, PIN = 53372, 24h session via localStorage)
         └── App (wraps AppContent in providers)
              ├── ThemeProvider (dark/light, persisted to localStorage)
              └── ToastProvider (global notification system)
                   └── AppContent (main application shell)
                        ├── Header (search, nav, actions, sync status)
                        ├── StatsPanel (streak, completion rate, progress bar)
                        ├── LearningDashboard (per-topic progress, resources)
                        ├── CurrentlyWorking (AI tasks in progress)
                        ├── Column x3 (backlog / inProgress / completed)
                        │    └── TaskCard (drag/drop, swipe, subtasks, tags)
                        ├── ActivityFeed (chronological action history)
                        ├── TaskModal (create/edit form with subtasks & resources)
                        └── ToastContainer (notification popups)
```

**Data flow is unidirectional:** `useBoard` hook owns all task state. Components receive data and callbacks as props. Context is only used for cross-cutting concerns (theme, toasts).

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| UI Framework | React | 18.2.0 | Component rendering, hooks-based state |
| Build Tool | Vite | 5.1.0 | Dev server, HMR, production bundling |
| Styling | Tailwind CSS | 3.4.1 | Utility-first CSS with dark mode (`class` strategy) |
| CSS Processing | PostCSS + Autoprefixer | 8.4.35 / 10.4.17 | CSS transforms and vendor prefixing |
| Font | Inter (Google Fonts) | -- | Primary typeface loaded via CDN |
| Deployment | GitHub Pages | -- | Static hosting via GitHub Actions |
| Data Persistence | localStorage + REST API | -- | Dual-mode: API-first with localStorage fallback |

**Zero external runtime dependencies** beyond React and ReactDOM. No router, no state library, no drag-and-drop library.

---

## Project Structure

```
closedboard/
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions: build + deploy to GitHub Pages
├── dist/                       # Pre-built production bundle (committed to repo)
├── public/
│   ├── favicon.svg             # App icon
│   └── manifest.json           # PWA manifest (standalone display mode)
├── src/
│   ├── main.jsx                # ReactDOM entry: PinGate wraps App
│   ├── App.jsx                 # Root component: providers + AppContent
│   ├── index.css               # Global styles: CSS vars, animations, scrollbar, drag
│   ├── components/
│   │   ├── PinGate.jsx         # PIN authentication wall (5-digit, 24h session)
│   │   ├── Header.jsx          # Sticky top bar: logo, search, theme, actions
│   │   ├── Column.jsx          # Kanban column: drag-over handling, empty states
│   │   ├── TaskCard.jsx        # Task display: drag, swipe, subtasks, tags, priority
│   │   ├── TaskModal.jsx       # Create/edit form: title, desc, tags, subtasks, resources
│   │   ├── CurrentlyWorking.jsx# AI task status banner (isAITask + inProgress)
│   │   ├── StatsPanel.jsx      # Metrics: streak, today/week completions, rate, progress
│   │   ├── LearningDashboard.jsx# Per-topic learning progress with concept tracking
│   │   ├── ActivityFeed.jsx    # Chronological history log (last 15 entries)
│   │   └── ToastContainer.jsx  # Notification toasts (success/error/info)
│   ├── contexts/
│   │   ├── ThemeContext.jsx     # Dark/light theme with localStorage persistence
│   │   └── ToastContext.jsx     # Toast notification state + convenience methods
│   ├── hooks/
│   │   ├── useBoard.js          # Core state: tasks, history, CRUD, optimistic updates
│   │   └── useKeyboardShortcuts.js # Global keyboard shortcuts (N, R, /, Esc)
│   └── utils/
│       ├── constants.js         # Column/priority/tag configs, formatTime, learning helpers
│       └── api.js               # REST client + localStorage fallback with demo data
├── index.html                  # HTML shell: meta tags, PWA config, font preconnect
├── haris.json                  # Owner metadata: { name, id, timestamp }
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite config: React plugin, base path /closedboard/
├── tailwind.config.js          # Tailwind: dark mode (class), custom colors/animations
└── postcss.config.js           # PostCSS: tailwindcss + autoprefixer plugins
```

---

## Data Model

### Task Object

```js
{
  id: string,              // Unique ID (server-generated or "temp_<timestamp>_<random>")
  title: string,           // Required. Task name
  description: string,     // Optional. Details
  column: string,          // "backlog" | "inProgress" | "completed"
  priority: string,        // "low" | "medium" | "high" | "urgent"
  isAITask: boolean,       // If true, shows robot icon + appears in CurrentlyWorking
  tags: string[],          // Array of tag IDs: "feature", "bug", "learning", "react-native", etc.
  subtasks: Subtask[],     // Checklist items within a task
  resources: Resource[],   // Learning resources (only relevant for learning-tagged tasks)
  createdAt: number,       // Unix timestamp (ms)
  completedAt: number|null // Set when moved to "completed" column
}
```

### Subtask Object

```js
{
  text: string,            // Subtask description
  done: boolean            // Completion state
}
```

### Resource Object (Learning Tasks)

```js
{
  title: string,           // Display name
  url: string              // External link
}
```

### History Entry

```js
{
  id: string,              // Unique ID
  action: string,          // "created" | "completed" | "moved" | "updated" | "deleted"
  taskId: string,          // Reference to task
  timestamp: number,       // Unix timestamp (ms)
  message: string          // Human-readable description
}
```

### Board State Shape (returned by API / stored in localStorage)

```js
{
  tasks: { [taskId]: Task },  // Object map for O(1) lookups
  history: HistoryEntry[],    // Newest first, capped at 50 entries
  meta: { lastUpdated: number }
}
```

---

## Application Flow

### Startup Sequence

1. `main.jsx` renders `<PinGate>` wrapping `<App>`
2. `PinGate` checks `localStorage["closedboard_auth"]` for a valid session (< 24h old)
3. If no valid session, renders PIN input (5-digit numeric, PIN: `53372`)
4. On successful PIN entry, stores `{ timestamp }` in localStorage and renders children
5. `App` wraps `AppContent` in `ThemeProvider` > `ToastProvider`
6. `AppContent` calls `useBoard()` which:
   - Checks API health (`GET /api/health`)
   - Sets `connected` flag
   - Fetches tasks from API or falls back to localStorage
   - Starts 30-second auto-refresh interval

### Task Lifecycle

```
Created (backlog) ──drag/move──> In Progress ──drag/move──> Completed
     │                               │                          │
     └──────── edit / delete ────────┘──── edit / delete ───────┘
```

### Optimistic Update Pattern

All mutations follow this pattern in `useBoard.js`:
1. Generate temporary ID / save previous state
2. Immediately update local state (optimistic)
3. Fire API call in background
4. On success: refresh from server
5. On failure: rollback to previous state

---

## Component Reference

### PinGate
- **Purpose:** Authentication wall before app loads
- **PIN:** `53372` (hardcoded)
- **Session duration:** 24 hours, stored in `localStorage["closedboard_auth"]`
- **Props:** `children` (renders when authenticated)

### Header
- **Purpose:** Top navigation bar with search, actions, and sync status
- **Features:** Sticky positioning, backdrop blur, responsive (mobile search toggle)
- **Props:** `onNewTask`, `onRefresh`, `connected`, `lastSync`, `searchQuery`, `onSearchChange`, `showArchive`, `onToggleArchive`, `showStats`, `onToggleStats`, `searchInputRef`

### Column
- **Purpose:** Single Kanban column with drag-and-drop zone
- **Columns:** Backlog (slate), In Progress (blue), Completed (green)
- **Drag handling:** HTML5 native `dragover`, `dragleave`, `drop` events
- **Props:** `columnId`, `tasks`, `onMoveTask`, `onEditTask`, `onDeleteTask`, `onUpdateSubtask`, `onTagFilter`, `activeTagFilter`, `isArchive`

### TaskCard
- **Purpose:** Individual task display within a column
- **Features:**
  - HTML5 drag-and-drop (desktop)
  - Touch swipe gestures (mobile): swipe right to complete, swipe left to delete
  - Expandable subtask checklist with progress bar
  - Clickable tag filters
  - Priority badge with color coding
  - AI task indicator (blue left border + robot icon)
- **Props:** `task`, `onMove`, `onEdit`, `onDelete`, `onUpdateSubtask`, `onTagFilter`, `activeTagFilter`

### TaskModal
- **Purpose:** Create or edit tasks
- **Fields:** Title, description, tags (regular + learning), subtasks, resources (learning only), priority, column, AI task toggle
- **Behavior:** Auto-adds `learning` tag when a learning topic tag is selected
- **Props:** `isOpen`, `onClose`, `onSave`, `editTask`

### StatsPanel
- **Purpose:** Dashboard metrics with visual progress
- **Metrics computed via `useMemo`:**
  - Streak (consecutive days with completions, up to 365 lookback)
  - Today's completions
  - This week's completions
  - Completion rate (completed / total as percentage)
  - Segmented progress bar (completed green + in-progress blue)
- **Props:** `tasks`

### LearningDashboard
- **Purpose:** Dedicated learning progress tracker per topic
- **Topics tracked:** React Native, AWS SST, JavaScript (configured in `LEARNING_TOPICS`)
- **Metrics per topic:** Task completion %, concept completion, resource count
- **Conditionally rendered:** Only shows when learning-tagged tasks exist
- **Props:** `tasks`, `onTagFilter`

### CurrentlyWorking
- **Purpose:** Banner showing AI tasks currently in progress
- **Filter:** `task.column === 'inProgress' && task.isAITask`
- **Conditionally rendered:** Hidden when no AI tasks are in progress
- **Props:** `tasks`

### ActivityFeed
- **Purpose:** Chronological log of task actions
- **Display:** Last 15 entries with action-specific icons and color coding
- **Props:** `history`

### ToastContainer
- **Purpose:** Floating notification system (bottom-right)
- **Types:** success (green), error (red), info (blue)
- **Auto-dismiss:** 3 seconds default
- **Animation:** Slides in from right

---

## State Management

### Core State (`useBoard` hook)

The `useBoard` custom hook is the single source of truth for all task data. It manages:

```
data: {
  tasks: {},      // Object<string, Task>  - all tasks keyed by ID
  history: [],    // HistoryEntry[]        - action log (max 50)
  meta: {}        // { lastUpdated }       - sync metadata
}
loading: boolean  // Initial load state
connected: boolean // API health status
lastSync: number  // Timestamp of last successful data fetch
```

**Exposed interface:**
- `tasks`, `history`, `loading`, `connected`, `lastSync` -- read-only state
- `addTask(task)` -- create new task (optimistic)
- `moveTask(taskId, column)` -- change column (optimistic)
- `updateTask(taskId, updates)` -- partial update (optimistic)
- `updateSubtasks(taskId, subtasks)` -- update subtask array
- `deleteTask(taskId)` -- remove task (optimistic)
- `getTasksByColumn(columnId, searchQuery)` -- filtered + sorted by priority
- `getArchivedTasks(searchQuery)` -- completed tasks sorted by completion date
- `getCurrentlyWorking()` -- AI tasks in progress
- `refresh()` -- manual re-fetch from API/localStorage

### Context State

| Context | State | Persistence | Used By |
|---------|-------|-------------|---------|
| ThemeContext | `isDark: boolean` | `localStorage["closedboard-theme"]` | All components |
| ToastContext | `toasts: Toast[]` | None (ephemeral) | AppContent, ToastContainer |

---

## API Layer & Offline Fallback

### API Configuration (`src/utils/api.js`)

- **Base URL:** `https://legends-athletics-task-disturbed.trycloudflare.com/api`
  (Cloudflare Tunnel -- likely temporary/development URL)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Connection check |
| GET | `/tasks` | Fetch all board data |
| POST | `/tasks` | Create new task |
| PUT | `/tasks/:id` | Update existing task |
| DELETE | `/tasks/:id` | Delete task |
| POST | `/tasks/:id/move` | Move task to column |

### Fallback Strategy

1. On startup, `checkAPIHealth()` pings `/health`
2. If API is unreachable, `connected` is set to `false`
3. `fetchTasks()` catches errors and falls back to `localStorage["closedboard_data"]`
4. If localStorage is also empty, returns demo data with a single "API Connection Failed" task
5. Write operations (create/update/delete/move) attempt the API but do NOT fall back to localStorage -- they fail silently with an error return
6. A "Demo mode - API not connected" banner shows in the UI when `connected` is false

### Auto-Refresh

- Polls `fetchTasks()` every 30 seconds via `setInterval`
- Updates `lastSync` timestamp on success
- Header displays relative time since last sync ("Just now", "15s ago", "2m ago")

---

## Theming System

### Implementation

- Tailwind's `darkMode: 'class'` strategy
- `ThemeContext` toggles the `dark` class on `<html>`
- Default theme: **dark**
- Persisted to `localStorage["closedboard-theme"]`

### CSS Custom Properties (`index.css`)

Light and dark themes define matching CSS variables:
- Backgrounds: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-card`, `--bg-hover`, `--bg-input`
- Borders: `--border-primary`, `--border-secondary`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Accents: `--accent-blue`, `--accent-green`, `--accent-red`, `--accent-yellow`, `--accent-purple`

### Custom Animations

| Name | Effect |
|------|--------|
| `slide-in` | Translate Y + scale + fade in |
| `fade-in` | Opacity 0 to 1 |
| `pulse-soft` | Gentle opacity pulse |
| `slide-in-right` | Translate X from right |

---

## Authentication

The app uses a simple client-side PIN gate:

- **PIN:** `53372` (hardcoded in `PinGate.jsx`)
- **Session:** 24 hours, stored as `{ timestamp }` in `localStorage["closedboard_auth"]`
- **Input:** Numeric-only, 5 digits, password-masked
- **Security note:** This is client-side only and provides no real security. The PIN is visible in source code. This is UI-level access control, not authentication.

---

## Keyboard Shortcuts

| Key | Action | Condition |
|-----|--------|-----------|
| `N` | Open new task modal | Not typing in input/textarea |
| `R` | Refresh board data | Not typing in input/textarea |
| `/` | Focus search input | Not typing in input/textarea |
| `Esc` | Close modal | Always active |

Implemented in `useKeyboardShortcuts.js` via `document.addEventListener('keydown', ...)`.

---

## Deployment

### GitHub Actions (`deploy.yml`)

Triggers on push to `main`. Steps:
1. Checkout code
2. Setup Node 20 with npm cache
3. `npm ci` (clean install)
4. `npm run build` (Vite production build)
5. Upload `./dist` as GitHub Pages artifact
6. Deploy to GitHub Pages

### Vite Config

- `base: '/closedboard/'` -- required for GitHub Pages subdirectory hosting
- `outDir: 'dist'`

### PWA Support

Partial PWA setup via `manifest.json`:
- `display: "standalone"` for app-like experience
- Categories: productivity, utilities
- Emoji-based SVG icon (no actual icon files)
- **Missing:** Service worker, offline caching, install prompt

---

## Configuration Constants

### Columns (`COLUMNS`)

```
backlog     -> "Backlog"      (slate)
inProgress  -> "In Progress"  (blue)
completed   -> "Completed"    (green)
```

### Priorities (`PRIORITIES`)

```
low    -> "Low"    (slate,  Circle icon)
medium -> "Medium" (yellow, CircleDot icon)
high   -> "High"   (orange, AlertCircle icon)
urgent -> "Urgent" (red,    Flame icon)
```

### Tags (`TAGS`)

Regular tags: `feature`, `bug`, `improvement`, `research`, `personal`, `work`, `ai`

Learning tags (special behavior):
- `learning` -- parent tag, auto-added when topic selected
- `react-native` -- learning topic
- `aws-sst` -- learning topic
- `javascript` -- learning topic

### localStorage Keys

| Key | Purpose | Format |
|-----|---------|--------|
| `closedboard_auth` | PIN session | `{ timestamp: number }` |
| `closedboard-theme` | Theme preference | `"dark"` or `"light"` |
| `closedboard_data` | Offline task data | Full board state object |

---

## Known Limitations

1. **No real authentication** -- PIN is hardcoded in client-side JavaScript
2. **API URL is a Cloudflare Tunnel** -- temporary, will change on server restart
3. **No offline write support** -- create/update/delete fail silently when API is down (only read falls back to localStorage)
4. **No routing** -- single-page with no URL-based navigation
5. **No service worker** -- PWA manifest exists but no offline caching
6. **node_modules committed** -- entire dependency tree is checked into git
7. **dist committed** -- build output is in the repo (normally handled by CI)
8. **No testing** -- no unit, integration, or e2e tests
9. **No TypeScript** -- all JavaScript with no type safety
10. **Subtask reordering** -- subtasks can't be reordered, only added/removed/toggled
11. **No due dates** -- tasks have no deadline or scheduling
12. **History cap** -- only 50 most recent history entries are retained
13. **Tag system is static** -- tags are hardcoded in constants, users can't create custom tags

---

## Future Development Roadmap

### Phase 1: Foundation Hardening

- [ ] Remove `node_modules/` and `dist/` from git (add to `.gitignore`)
- [ ] Move PIN and API URL to environment variables (`.env`)
- [ ] Add TypeScript for type safety across the codebase
- [ ] Add ESLint + Prettier for consistent code formatting
- [ ] Write unit tests for `useBoard`, `constants`, and `api` utilities
- [ ] Add proper error boundaries for component-level error handling

### Phase 2: Data & Backend

- [ ] Build a proper backend (Node.js/Express or serverless) with database (PostgreSQL/Supabase)
- [ ] Implement real authentication (OAuth, magic link, or JWT-based)
- [ ] Add full offline support with localStorage writes + sync queue
- [ ] Implement conflict resolution for concurrent edits
- [ ] Add data export/import (JSON, CSV)
- [ ] Replace Cloudflare Tunnel with stable hosting

### Phase 3: Feature Expansion

- [ ] Due dates and deadline reminders
- [ ] Task ordering within columns (manual sort / drag reorder)
- [ ] Custom tags (user-defined colors and labels)
- [ ] File attachments on tasks
- [ ] Markdown support in task descriptions
- [ ] Subtask reordering via drag
- [ ] Task comments / notes thread
- [ ] Recurring tasks
- [ ] Multiple boards / workspaces
- [ ] Calendar view alongside Kanban

### Phase 4: Advanced Features

- [ ] Real-time collaboration (WebSockets)
- [ ] AI integration for task suggestions, auto-categorization, summaries
- [ ] Notification system (browser notifications, email digests)
- [ ] Analytics dashboard with charts (completion trends, time tracking)
- [ ] Mobile app (React Native, sharing code with web via shared hooks/utils)
- [ ] Plugin / extension system
- [ ] API keys for third-party integrations (Slack, Discord, GitHub Issues)
- [ ] Time tracking per task with start/stop timer

---

## Getting Started

```bash
# Clone
git clone https://github.com/MHarisU/closedboard.git
cd closedboard

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**Default PIN:** `53372`

**Note:** The app will show "Demo mode" if the backend API is unreachable. All features still work with localStorage as the data store.

---

Built by **ClosedBot** for Rohail.
