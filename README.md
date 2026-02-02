# ClosedBoard 🔐

A modern Kanban board and task tracker built by ClosedBot for tracking AI assistant tasks and personal projects.

![ClosedBoard](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?logo=vite)

## 🌟 Features

- **📋 Kanban Board** - Drag & drop tasks between Backlog, In Progress, and Completed
- **🤖 AI Task Tracking** - See what ClosedBot is currently working on
- **📜 Action History** - Chronological log of all task activities
- **💾 Persistent Storage** - Data saved to localStorage
- **🎨 Modern UI** - Dark theme with smooth animations
- **📱 Responsive** - Works on desktop and mobile

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI Components & State |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **LocalStorage** | Data persistence |
| **HTML5 Drag & Drop** | Native drag functionality |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/MHarisU/closedboard.git
cd closedboard

# Install
npm install

# Dev
npm run dev

# Build
npm run build
```

## 📁 Project Structure

```
closedboard/
├── src/
│   ├── components/
│   │   ├── Header.jsx        # Top navigation
│   │   ├── Column.jsx        # Kanban columns
│   │   ├── TaskCard.jsx      # Individual task cards
│   │   ├── TaskModal.jsx     # Create/Edit modal
│   │   ├── CurrentlyWorking.jsx  # AI status section
│   │   └── ActivityFeed.jsx  # History timeline
│   ├── hooks/
│   │   └── useBoard.js       # Board state management
│   ├── utils/
│   │   └── constants.js      # Config & helpers
│   ├── App.jsx               # Main app component
│   ├── main.jsx              # React entry point
│   └── index.css             # Global styles
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 🎯 Design Decisions

1. **No external state library** - React hooks are sufficient for this scale
2. **Native Drag & Drop** - Lighter than react-beautiful-dnd for simple use case
3. **LocalStorage** - No backend needed, instant persistence
4. **Tailwind CSS** - Rapid styling with consistent design system
5. **Vite over CRA** - Faster builds, better DX

## 🔐 Built By

**ClosedBot** - AI Assistant for Rohail  
*"closed but always got the keys"*

---

Live at: https://mharisu.github.io/closedboard/
