# Abariisa — Smart Farm Management System

Sprint 1 (Frontend) + Sprint 2 (Backend, Database, API Integration & Authentication)

A full-stack MERN application (MongoDB, Express, React, Node.js) for managing livestock,
workers, tasks, attendance, and Worker Trust Scores on Ugandan farms.

## 📁 Project Structure

```
abariisa/
├── client/                 # React frontend (Sprint 1)
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── dashboard/  # Shared UI library (Button, Card, Modal, Table…)
│       │   └── layout/     # Sidebar, Topbar, AppLayout
│       ├── context/        # AuthContext (global auth state)
│       ├── pages/           # Login, Register, Dashboard, Livestock, Tasks…
│       └── utils/           # Axios API client
│
├── server/                  # Node.js + Express backend (Sprint 2)
│   ├── config/              # MongoDB connection
│   ├── controllers/         # Business logic
│   ├── middleware/          # JWT auth & role-based access control
│   ├── models/              # Mongoose schemas (User, Livestock, Task, TrustScore…)
│   ├── routes/              # API route definitions
│   ├── seed.js              # Sample data seeder
│   └── index.js             # Server entry point
│
└── package.json             # Root scripts (run both client & server together)
```

## 🚀 Getting Started in VS Code

### 1. Prerequisites
- Node.js v18+ installed
- A MongoDB Atlas account (free tier) — or local MongoDB

### 2. Install dependencies

```bash
# From the project root
npm run install:all
```

This installs dependencies for the root, `client/`, and `server/`.

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/abariisa
JWT_SECRET=replace_this_with_a_long_random_string
JWT_EXPIRE=7d
NODE_ENV=development
```

> Get a free MongoDB Atlas connection string at https://www.mongodb.com/cloud/atlas

### 4. (Optional) Seed sample data

```bash
cd server
node seed.js
```

This creates demo accounts:
| Role    | Email                | Password    |
|---------|----------------------|-------------|
| Manager | manager@abariisa.com | password123 |
| Worker  | james@abariisa.com   | password123 |
| Worker  | grace@abariisa.com   | password123 |

### 5. Run the app

From the project root, run both client and server together:

```bash
npm run dev
```

- Backend API: http://localhost:5000
- Frontend:    http://localhost:3000

Or run them separately:

```bash
npm run dev:server   # Terminal 1
npm run dev:client   # Terminal 2
```

## 🔑 Sprint 1 — Frontend (React)

- Login & Registration screens (role selection: Manager / Worker)
- Farm Manager dashboard — KPI cards, recent tasks table
- Worker dashboard — same shell, scoped to own tasks/attendance
- Livestock management screens (table, filters, add/edit modal)
- Task assignment & monitoring screens
- Attendance check-in/out interface
- Notifications centre
- Worker profile with Trust Score visualisation

**HCI principles applied:**
- Clear visual hierarchy and consistent navigation (persistent sidebar + topbar)
- Immediate feedback via toast notifications for every action
- Colour-coded status badges (success/warning/danger) for fast scanning
- Accessible forms: labelled inputs, error messages with `aria-live`, focus rings
- Minimal cognitive load: collapsible sidebar, empty states with guidance
- Responsive layout and keyboard-navigable components

## 🔑 Sprint 2 — Backend, Database, API & Authentication

- **Models**: User, Livestock, Task, Attendance, TrustScore, Notification
- **Auth**: JWT-based login/register, bcrypt password hashing, role-based access control
  (`manager`, `worker`, `admin`)
- **API routes**:
  - `/api/auth` — register, login, current user
  - `/api/users` — worker listing & profile management
  - `/api/livestock` — CRUD + stats + vaccination records
  - `/api/tasks` — create/assign/update/delete + auto risk-flagging
  - `/api/attendance` — check-in/out + manager records
  - `/api/notifications` — list, mark read

**Worker Trust Score logic (foundation for Sprint 3):**
- `TrustScore` model stores 5 weighted components (attendance, punctuality, task
  completion, responsiveness, consistency) plus a 30-day history for trend charts
- Automatically recalculated when attendance is logged or tasks are completed/overdue
- High-priority tasks assigned to low-trust workers are auto-flagged with a risk level

## 🛣️ Next: Sprint 3

Sprint 3 will build on the `TrustScore` and `Task.riskFlag` foundations already in place
to implement the full Task Risk Prediction module and richer dashboard alerts.
