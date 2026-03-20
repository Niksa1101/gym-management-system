# Gym Management System

A local desktop application for managing gym members, memberships, daily check-ins, and payments. Built for single-PC use — no internet connection or server required.

![Electron](https://img.shields.io/badge/Electron-29-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-sql.js-003B57?logo=sqlite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)

---

## Features

- **Dnevna evidencija (Daily Log)** — Check in members, track visit types, assign locker keys, record payments at check-in, look up lost locker keys
- **Clanovi (Members)** — Add/edit/delete members, manage memberships, view attendance history with a punch-card visual, discount eligibility
- **Uplate (Payments)** — View payment history by day, week, or month with totals
- **Cenovnik (Prices)** — Quick staff reference for all membership prices

### Membership types
| Key | Name |
|-----|------|
| `personal_trainer` | Individualni treninzi |
| `duo_workout` | Duo treninzi |
| `group_workout` | Vodjeni treninzi |
| `standard_gym` | Samostalno vezbanje |
| `just_cardio` | Kardio |

### Visit types
- **Trening** — deducts one session from the active membership
- **Solo** — visit without deducting a session (available on PT / Duo / Group memberships)
- **FitPass Group** — single-visit FitPass, auto-logs 300 din payment
- **FitPass Solo** — free FitPass visit

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Electron](https://www.electronjs.org/) 29 |
| UI framework | [React](https://react.dev/) 18 |
| Build tool | [Vite](https://vitejs.dev/) 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 3 |
| Database | [sql.js](https://sql.js.org/) (SQLite compiled to WebAssembly) |
| Packaging | [electron-builder](https://www.electron.build/) |

**Why sql.js instead of better-sqlite3?**  
`sql.js` is a pure WebAssembly build of SQLite — it requires zero native compilation, so it works on Windows without Python, Visual Studio Build Tools, or any other native toolchain.

**Data persistence**  
The SQLite database is stored as a `.db` file in the OS user-data directory (`app.getPath('userData')`). It is read on startup and saved after every write. The file never leaves the local machine.

---

## Project Structure

```
gym-management-system/
├── electron/
│   ├── main.js          # Electron main process, IPC handlers
│   ├── preload.js       # contextBridge — exposes window.api to renderer
│   └── database.js      # All SQLite operations via sql.js
├── src/
│   ├── App.jsx           # Root component, page routing
│   ├── lib/
│   │   └── constants.js  # Membership types, prices, helper functions
│   └── components/
│       ├── Sidebar.jsx
│       ├── DailyLog/
│       │   ├── DailyLogPage.jsx
│       │   └── CheckInModal.jsx
│       ├── Members/
│       │   ├── MembersPage.jsx
│       │   ├── MemberCard.jsx
│       │   ├── MemberForm.jsx
│       │   └── MembershipForm.jsx
│       ├── Payments/
│       │   └── PaymentsPage.jsx
│       └── Prices/
│           └── PricesPage.jsx
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (comes with Node.js)

### Install & run in development

```bash
git clone https://github.com/Niksa1101/gym-management-system.git
cd gym-management-system
npm install
npm run dev
```

This starts Vite (hot-reload renderer on `localhost:5173`) and Electron simultaneously via `concurrently`.

### Build a distributable installer

```bash
npm run electron:build
```

Output is placed in the `release/` folder (`.exe` installer on Windows).

---

## Database Schema

```sql
CREATE TABLE members (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  surname          TEXT NOT NULL,
  phone            TEXT,
  discount_eligible INTEGER DEFAULT 0,
  discount_category TEXT,
  notes            TEXT,
  created_at       TEXT DEFAULT (date('now'))
);

CREATE TABLE memberships (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id           INTEGER NOT NULL,
  membership_type     TEXT NOT NULL,
  membership_category TEXT NOT NULL,
  sessions_total      INTEGER,
  sessions_used       INTEGER DEFAULT 0,
  start_date          TEXT NOT NULL,
  expiry_date         TEXT NOT NULL,
  is_active           INTEGER DEFAULT 1,
  created_at          TEXT DEFAULT (date('now'))
);

CREATE TABLE attendance (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id      INTEGER NOT NULL,
  membership_id  INTEGER,
  date           TEXT NOT NULL,
  locker_key     TEXT,
  visit_type     TEXT DEFAULT 'session',
  session_counted INTEGER DEFAULT 0
);

CREATE TABLE payments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id           INTEGER NOT NULL,
  member_name         TEXT NOT NULL,
  date                TEXT NOT NULL,
  membership_type     TEXT,
  membership_category TEXT,
  amount              INTEGER NOT NULL
);
```

---

## License

MIT
