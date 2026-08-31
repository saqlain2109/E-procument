# 🚀 Setup & Prerequisites Guide: Enterprise E-Procurement Platform

This document contains everything required to install, configure, initialize, and run the **Enterprise E-Procurement & Supplier Portal Platform** from scratch on any machine (Windows, macOS, or Linux).

---

## 📋 System Prerequisites

Before getting started, ensure you have the following installed on your system:

| Software / Tool | Minimum Version | Recommended Version | Verification Command |
|---|---|---|---|
| **Node.js** | `v18.0.0` | `v20.x` or `v22.x` (LTS) | `node -v` |
| **npm** (Node Package Manager) | `v9.0.0` | `v10.x` | `npm -v` |
| **Git** | `v2.x` | Latest | `git --version` |
| **Web Browser** | Chrome, Edge, Firefox, Safari | Latest Chromium / WebKit | Modern browser with ES6 support |

> [!NOTE]
> No separate database server installation (e.g., PostgreSQL or MySQL) is required. The platform uses **SQLite (SQL.js WebAssembly)** with automated disk persistence to `server/src/db/database.sqlite`.

---

## 🛠️ Step-by-Step Installation

### Step 1: Clone or Extract the Repository
Open your terminal (PowerShell, Command Prompt, or Bash) and navigate to your working directory:
```bash
git clone <REPOSITORY_URL> e-procurement-system
cd e-procurement-system
```

---

### Step 2: Install Dependencies

Install root, backend, and frontend dependencies:

```bash
# 1. Install root orchestration dependencies
npm install

# 2. Install backend (server) dependencies
cd server
npm install

# 3. Install frontend (client) dependencies
cd ../client
npm install

# 4. Return to root folder
cd ..
```

---

### Step 3: Initialize & Seed the Database

Run the automated seeder to initialize all system tables, configurations, master data, UNSPSC categories, auto-numbering sequences, email templates, workflows, and clean workflow users:

```bash
# From the project root folder:
npm run seed

# Or manually inside server directory:
cd server
npx ts-node src/db/seed.ts
cd ..
```

Output should confirm:
```text
Database initialized successfully with SQL.js.
🌱 Seeding Enterprise E-Procurement master configurations & clean users...
✅ Database cleaned and initialized with essential master data & clean users.
```

---

### Step 4: Start the Application

You can start both the backend API and frontend client concurrently with a single command from the project root:

```bash
npm run dev
```

This starts:
- **Backend API Server**: `http://localhost:5000` (Node.js + Express + SQLite)
- **Frontend Client Portal**: `http://localhost:3000` (React 18 + Vite)

> [!TIP]
> Open your browser and navigate to **`http://localhost:3000`** to access the login page.

---

## 👥 Default Demo & Testing Accounts

All seeded workflow users are pre-configured with the default password: **`password123`**

| # | User Name | Role | Email (Username) | Password | Responsibilities |
|---|---|---|---|---|---|
| 1 | **Alexander Wright** | Super Administrator | `admin@eprocure.local` | `password123` | Master governance, User & Access Master, Executive sign-offs |
| 2 | **Sarah Jenkins** | Procurement Administrator | `proc.admin@eprocure.local` | `password123` | Sourcing events, RFQs, PO dispatch, Dock GRN logging |
| 3 | **Marcus Vance** | Approver (Dept VP) | `approver@eprocure.local` | `password123` | Department purchase requisition (PR) creation & review |
| 4 | **Dr. Elena Rostova** | Evaluator | `evaluator@eprocure.local` | `password123` | Technical & commercial sealed bid scoring & ranking |
| 5 | **Rachel Greenfield** | Finance User | `finance@eprocure.local` | `password123` | Budget verification, 3-Way matching, payment disbursements |
| 6 | **Jonathan Sterling** | Contract Manager | `contract.manager@eprocure.local` | `password123` | Contract milestones, SLA monitoring & legal compliance |
| 7 | **Saqlain Supariwala** | Supplier (Iqra Technology) | `supplier@eprocure.local` | `password123` | Vendor portal: Bid submissions, PO acceptance, E-Invoicing |

---

## ⚙️ Environment Variables (Optional Configuration)

Default fallback values are embedded for seamless plug-and-play development. If you wish to customize port or security secrets, create a `.env` file in the `server/` directory:

`server/.env`:
```env
PORT=5000
JWT_SECRET=enterprise_eprocurement_super_secure_jwt_secret_key_2026
NODE_ENV=development
```

`client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📜 Available NPM Scripts

From the root directory:

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `concurrently ...` | Starts both backend API (`:5000`) and frontend Vite (`:3000`) concurrently. |
| `npm run dev:server` | `cd server && npm run dev` | Starts only the backend API server with nodemon auto-restart. |
| `npm run dev:client` | `cd client && npm run dev` | Starts only the frontend Vite development server. |
| `npm run build` | `...` | Builds TypeScript server and bundles production frontend assets. |
| `npm run seed` | `cd server && npm run seed` | Resets master data, sequences, and workflow users. |

---

## 🔧 Troubleshooting & FAQ

### 1. Port 5000 or 3000 Already in Use
If another application is using port 5000 or 3000:
- **Windows**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
  ```
- **macOS / Linux**:
  ```bash
  lsof -ti:5000 | xargs kill -9
  lsof -ti:3000 | xargs kill -9
  ```

### 2. Reset Database to Clean State
If you wish to wipe transactional test data and restore clean master data:
```bash
cd server
npm run seed
```

### 3. Mobile Device / Tablet Access
To test mobile responsiveness from your phone or tablet on the same local Wi-Fi network:
1. Find your machine's local IP address (`ipconfig` on Windows or `ifconfig` on macOS/Linux).
2. Open `http://<YOUR_LOCAL_IP>:3000` on your mobile browser.
3. The responsive hamburger menu drawer (`☰`) will automatically adapt.
