# 🚀 Enterprise E-Procurement & Supplier Portal Platform

An enterprise-grade Source-to-Pay (S2P) and Procure-to-Pay (P2P) automation suite featuring dual portals (Internal Enterprise Management & External Supplier Portal), multi-level dynamic approval workflows, automated 3-way matching, sealed bid evaluation, and centralized user access governance.

---

## 📚 Complete Project Documentation

For detailed step-by-step instructions, refer to the documentation files included in this repository:

1. **[Setup & Prerequisites Guide (`SETUP_AND_PREREQUISITES.md`)](./SETUP_AND_PREREQUISITES.md)**
   - System prerequisites (Node.js LTS, npm).
   - Step-by-step fresh installation & database seeder execution.
   - Default login credentials for all 7 role accounts (`password123`).
   - Troubleshooting common port and build issues.

2. **[End-to-End Process & User Guide (`PROCESS_AND_USER_GUIDE.md`)](./PROCESS_AND_USER_GUIDE.md)**
   - Complete architectural walkthrough of the 9 core business flows (Supplier Onboarding, PR, Sourcing/Tenders, Evaluation Scoring, Awards, Contracts, POs, Dock GRNs, 3-Way Matching, and Payment Disbursements).
   - Complete Screen-by-Screen Reference (which screen is used for what).
   - Multi-Level Approval Journey & Decision Trail guide.
   - User & Access Master governance manual.

---

## ⚡ Quick Start (Run Locally in 3 Steps)

### 1. Install Dependencies
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Start Application
```bash
npm run dev
```

- **Frontend Client Portal**: `http://localhost:3000`
- **Backend API Server**: `http://localhost:5000`

---

## 👥 Default Demo & Testing Accounts (Password: `password123`)

| User Name | Role | Login Email | Responsibilities |
|---|---|---|---|
| **Alexander Wright** | Super Administrator | `admin@eprocure.local` | Master governance, User Master, Executive sign-offs |
| **Sarah Jenkins** | Procurement Administrator | `proc.admin@eprocure.local` | Sourcing events, RFQs, PO issuance, Dock GRN logging |
| **Marcus Vance** | Approver (Dept VP) | `approver@eprocure.local` | Purchase Requisitions (PR) drafting and department review |
| **Dr. Elena Rostova** | Evaluator | `evaluator@eprocure.local` | Evaluation committee scoring matrix & winner ranking |
| **Rachel Greenfield** | Finance User | `finance@eprocure.local` | Budget verification, 3-Way matching, payment disbursements |
| **Jonathan Sterling** | Contract Manager | `contract.manager@eprocure.local` | Legal contracts, milestones, and governance |
| **Saqlain Supariwala** | Supplier (Iqra Technology) | `supplier@eprocure.local` | Vendor portal: Bids, PO acceptance, and E-Invoices |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express.js, TypeScript, JWT Authentication, Multer
- **Database**: SQLite (SQL.js WebAssembly with automated disk persistence)
- **Reporting**: jsPDF, XLSX Spreadsheet Exporter
