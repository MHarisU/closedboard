# ClosedBoard

A full-featured Kanban board and productivity system with real-time sync, time tracking, task dependencies, and integrations. Built with React 18, Vite, Tailwind CSS, and a Node.js/Express backend with SQLite.

**Live:** https://mharisu.github.io/closedboard/

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Features](#features)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Integrations](#integrations)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Getting Started](#getting-started)
- [Known Limitations](#known-limitations)

---

## Architecture

```
Frontend (GitHub Pages)                      Backend (Render)
───────────────────────                      ────────────────
React 18 + Vite + Tailwind                   Node.js + Express + sql.js (SQLite)
                                             
PinGate (auth via API)                       POST /api/auth (validate PIN)
  └── App                                    GET  /api/events (SSE stream)
       ├── ThemeProvider                     
       ├── ToastProvider                      Protected endpoints (Bearer token):
       └── AppContent                         ├── Tasks CRUD + move + timer
            ├── MorningBriefing (pre-10AM)    ├── Boards CRUD
            ├── FocusMode (Pomodoro)          ├── Tags CRUD
            ├── Header + BoardSelector        ├── Insights (pattern analysis)
            ├── GhostTasks (insights)         ├── Export (JSON/CSV)
            ├── StatsPanel                    └── Webhooks (GitHub)
            ├── LearningDashboard            
            ├── Column x3 → TaskCard         Telegram Bot (polling mode)
            ├── TaskModal + TagManager        ├── /add, /list, /done, /status
            ├── DependencyGraph              
            ├── QuickCapture                 
            └── ActivityFeed                 
```

**Data flow:** `useBoard` hook owns all task state. Components receive data and callbacks as props. Contexts are used only for theme and toasts. All mutations are optimistic with rollback on failure and offline queueing.

**Real-time:** Server-Sent Events (SSE) push updates to all connected clients instantly. No polling.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, Vite 5, Tailwind CSS 3 | UI, build tooling, styling |
| Icons | Lucide React | Professional icon set, dark/light adaptive |
| Backend | Node.js, Express | REST API, SSE, webhooks |
| Database | sql.js (WebAssembly SQLite) | Persistent storage, atomic writes |
| Auth | PIN-based, Bearer token | Client gate + API protection |
| Hosting | GitHub Pages (frontend), Render (backend) | Free tier deployment |
| CI/CD | GitHub Actions | Auto-deploy on push to main |
| Bot | node-telegram-bot-api | Telegram task management |

---

## Project Structure

```
closedboard/
├── .github/workflows/deploy.yml    # CI/CD: build + deploy to GitHub Pages
├── backend/
│   ├── index.js                    # Express server, all API routes, SSE, SQLite
│   ├── telegram.js                 # Telegram bot module
│   ├── package.json                # Backend dependencies
│   ├── render.yaml                 # Render deployment blueprint
│   ├── .env.example                # Environment variable template
│   └── .gitignore
├── dist/                           # Production build (committed for GitHub Pages)
├── public/
│   ├── favicon.svg
│   └── manifest.json               # PWA manifest
├── src/
│   ├── main.jsx                    # Entry: PinGate wraps App
│   ├── App.jsx                     # Root: providers, routing between modes
│   ├── index.css                   # Global styles, CSS vars, animations
│   ├── components/
│   │   ├── PinGate.jsx             # PIN auth (validates against backend API)
│   │   ├── Header.jsx              # Nav bar: search, board selector, actions
│   │   ├── BoardSelector.jsx       # Board switcher dropdown
│   │   ├── Column.jsx              # Kanban column with drag-drop zone
│   │   ├── TaskCard.jsx            # Task display: priority, tags, timer, deps
│   │   ├── TaskModal.jsx           # Create/edit: subtasks, resources, blockers
│   │   ├── TagManager.jsx          # Custom tag CRUD modal
│   │   ├── StatsPanel.jsx          # Metrics: streak, rate, overdue, time tracked
│   │   ├── LearningDashboard.jsx   # Per-topic learning progress
│   │   ├── CurrentlyWorking.jsx    # AI task status banner
│   │   ├── ActivityFeed.jsx        # Chronological history log
│   │   ├── MorningBriefing.jsx     # Daily briefing view (before 10 AM)
│   │   ├── FocusMode.jsx           # Pomodoro timer + distraction-free mode
│   │   ├── QuickCapture.jsx        # Persistent bottom input for rapid task creation
│   │   ├── GhostTasks.jsx          # AI pattern detection insights panel
│   │   ├── DependencyGraph.jsx     # Task dependency visualization modal
│   │   ├── ErrorBoundary.jsx       # React error boundary
│   │   └── ToastContainer.jsx      # Notification toasts
│   ├── contexts/
│   │   ├── ThemeContext.jsx         # Dark/light theme persistence
│   │   └── ToastContext.jsx         # Toast notification state
│   ├── hooks/
│   │   ├── useBoard.js             # Core state: tasks, boards, tags, SSE, sync
│   │   └── useKeyboardShortcuts.js # Global keyboard navigation
│   └── utils/
│       ├── constants.js            # Columns, priorities, helpers, dep logic
│       ├── api.js                  # REST client, auth headers, export, insights
│       └── syncQueue.js            # Offline operation queue (localStorage)
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Data Model

### Task

```js
{
  id: string,                // Server-generated unique ID
  title: string,             // Task name
  description: string,       // Details (optional)
  column: string,            // "backlog" | "inProgress" | "completed"
  priority: string,          // "low" | "medium" | "high" | "urgent"
  isAITask: boolean,         // Shows in CurrentlyWorking panel
  tags: string[],            // Tag IDs: "feature", "bug", "learning", etc.
  subtasks: Subtask[],       // Checklist items
  resources: Resource[],     // Links (learning tasks)
  createdAt: number,         // Unix timestamp (ms)
  completedAt: number|null,  // Set when moved to completed
  dueDate: number|null,      // Optional deadline (ms)
  timeEntries: TimeEntry[],  // Start/stop timer log
  boardId: string,           // Which board this belongs to
  blockedBy: string[],       // Task IDs that must complete first
  githubIssue: object|null   // { owner, repo, number, url } if synced
}
```

### Supporting Objects

```js
Subtask:    { text: string, completed: boolean }
Resource:   { title: string, url: string }
TimeEntry:  { start: number, end: number|undefined }
Board:      { id: string, name: string, color: string, createdAt: number }
Tag:        { id: string, label: string, color: string, isLearning: boolean, isLearningTopic: boolean }
History:    { id: string, action: string, taskId: string, timestamp: number, message: string, boardId: string }
```

---

## API Reference

**Base URL:** Set via `VITE_API_URL` env var (defaults to Render deployment)

### Public

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/auth` | Validate PIN, returns `{ success }` |
| GET | `/api/events?token=...` | SSE stream (real-time updates) |
| POST | `/api/webhooks/github` | GitHub webhook receiver (HMAC verified) |

### Protected (requires `Authorization: Bearer <PIN>`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/tasks?boardId=...` | Fetch board data (tasks + history) |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/move` | Move task to column |
| POST | `/api/tasks/:id/timer/start` | Start time tracking |
| POST | `/api/tasks/:id/timer/stop` | Stop time tracking |
| GET | `/api/boards` | List boards |
| POST | `/api/boards` | Create board |
| PUT | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |
| GET | `/api/tags` | List custom tags |
| POST | `/api/tags` | Create tag |
| PUT | `/api/tags/:id` | Update tag |
| DELETE | `/api/tags/:id` | Delete tag |
| GET | `/api/insights?boardId=...` | Pattern analysis insights |
| GET | `/api/export?boardId=...&format=json\|csv` | Export data |

---

## Features

### Core Board
- **Three-column Kanban:** Backlog, In Progress, Completed
- **Drag-and-drop** (desktop) and **swipe gestures** (mobile)
- **Priority levels:** Low, Medium, High, Urgent (color-coded, auto-sorted)
- **Subtask checklists** with progress bar
- **Custom tags** with create/edit/delete via TagManager
- **Multiple boards** with board selector in header
- **Activity feed** with chronological history

### Productivity
- **Due dates** with amber (approaching) and red (overdue) indicators, auto-sort overdue to top
- **Time tracking** with start/stop timer on each card, total time in footer
- **Focus Lock Mode** — Pomodoro timer (25/5/15), distraction-free, auto-logs time entries
- **Morning Briefing** — before 10 AM, shows yesterday's completions and today's focus order
- **Quick Capture** — persistent bottom input, type and press Enter to create tasks instantly
- **Task dependencies** — `blockedBy` field, lock icons, move guards, dependency graph view

### Intelligence
- **Ghost Tasks (Pattern Detection):**
  - Stale task detection (7+ days without movement)
  - Velocity prediction (estimated days to clear backlog)
  - Day-of-week patterns (your most productive days)
  - Subtask completion estimates
  - Completion streaks
- **Learning Dashboard** — per-topic progress tracking for learning goals

### Infrastructure
- **Real-time sync** via Server-Sent Events (SSE)
- **Offline queue** — failed writes are queued in localStorage and replayed on reconnect
- **Optimistic updates** with rollback on server error
- **Data export** — JSON and CSV download
- **Error boundaries** — component-level error isolation

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New task |
| `j` / `k` | Navigate between tasks |
| `Enter` | Edit focused task |
| `D` | Delete focused task |
| `/` | Focus search |
| `R` | Refresh board |
| `Esc` | Close modal / clear focus |

Shortcuts are disabled when typing in inputs or during Focus Mode / Morning Briefing.

---

## Integrations

### Telegram Bot

Manage tasks from your phone without opening a browser.

| Command | Action |
|---------|--------|
| `/start` | Welcome + command list |
| `/add <title>` | Create task in Backlog |
| `/list` | Show in-progress tasks |
| `/backlog` | Show backlog tasks |
| `/done <#>` | Complete task by number or title |
| `/status` | Board overview with counts and streak |

**Setup:** Set `TELEGRAM_BOT_TOKEN` and optionally `TELEGRAM_CHAT_IDS` on your backend host.

### GitHub Issues Sync

Two-way sync between GitHub Issues and ClosedBoard.

- **Issue opened** on GitHub → task created in Backlog (labels mapped to tags)
- **Issue closed** on GitHub → task auto-completed
- **Task completed** on board → GitHub issue auto-closed
- **Issue reopened** on GitHub → task moved back to Backlog

**Setup:**
1. Set `GITHUB_TOKEN` and `GITHUB_WEBHOOK_SECRET` env vars on your backend host
2. In your GitHub repo: Settings → Webhooks → Add webhook
   - Payload URL: `https://<your-backend>/api/webhooks/github`
   - Content type: `application/json`
   - Secret: same as `GITHUB_WEBHOOK_SECRET`
   - Events: select "Issues"

---

## Deployment

### Frontend (GitHub Pages)

Automated via `.github/workflows/deploy.yml` on push to `main`:
1. Checkout → Node 20 → `npm ci` → `npm run build`
2. Upload `dist/` → Deploy to GitHub Pages

### Backend (Render)

Deployed via `render.yaml` blueprint:
- **Runtime:** Node.js (free tier)
- **Build:** `npm install`
- **Start:** `node index.js`
- **Database:** SQLite file (persists across restarts, resets on full redeploy)

### Environment Variables (Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `API_SECRET` | Yes | PIN used for authentication |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `DB_PATH` | No | SQLite file path (default: `./closedboard.db`) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_IDS` | No | Comma-separated authorized Telegram chat IDs |
| `GITHUB_TOKEN` | No | GitHub PAT with `repo` scope (for auto-closing issues) |
| `GITHUB_WEBHOOK_SECRET` | No | Secret for webhook HMAC verification |

### Environment Variables (Frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend API base URL (defaults to Render deployment) |

---

## Configuration

### Columns

| ID | Label | Color |
|----|-------|-------|
| `backlog` | Backlog | Slate |
| `inProgress` | In Progress | Blue |
| `completed` | Completed | Green |

### Priorities

| ID | Label | Icon |
|----|-------|------|
| `low` | Low | Circle |
| `medium` | Medium | CircleDot |
| `high` | High | AlertCircle |
| `urgent` | Urgent | Flame |

### localStorage Keys

| Key | Purpose |
|-----|---------|
| `closedboard_auth` | Auth session (token + timestamp) |
| `closedboard-theme` | Theme preference (`dark` / `light`) |
| `closedboard_data` | Offline task data fallback |
| `closedboard_current_board` | Active board ID |
| `closedboard_sync_queue` | Pending offline operations |
| `closedboard_briefing_dismissed` | Morning briefing daily dismissal |
| `closedboard_dismissed_insights` | Dismissed Ghost Tasks insights |

---

## Getting Started

### Frontend

```bash
git clone https://github.com/MHarisU/closedboard.git
cd closedboard

npm install
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```

### Backend

```bash
cd backend

# Create .env from template
cp .env.example .env
# Edit .env and set API_SECRET to your chosen PIN

npm install
npm run dev       # Dev server at http://localhost:3001
```

The app will show "Demo mode" if the backend is unreachable. All features work with localStorage as the data store, but sync and integrations require the backend.

---

## Known Limitations

1. **Free tier cold starts** — Render spins down after 15 min of inactivity; first request takes ~50s
2. **Ephemeral storage** — SQLite data resets on full Render redeploy (persists across restarts)
3. **No real multi-user auth** — PIN-based access, single user per deployment
4. **No service worker** — PWA manifest exists but no offline caching
5. **No TypeScript** — all JavaScript
6. **No automated tests** — no unit, integration, or e2e tests
7. **Subtask reordering** — subtasks can only be added/removed/toggled, not reordered
8. **dist committed** — build output is in the repo for GitHub Pages (normally handled by CI)

---

Built by **ClosedBot** for Rohail.
