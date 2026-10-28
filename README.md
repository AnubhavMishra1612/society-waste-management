# SocietyClean — Society Waste Management Portal

[![Status: Greenfield Documentation](https://img.shields.io/badge/Status-Documented%20%26%20Planned-brightgreen)](#current-implementation-status)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue)](#)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-forestgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](#)

A modern, responsive waste management and housekeeping coordination portal designed for residential housing societies and apartment communities. SocietyClean centralizes resident incident reporting, housekeeping task dispatch, waste collection timetable broadcasting, and photo-verified cleanup workflows.

---

## 📌 Project Overview

Urban residential societies struggle with informal communication (WhatsApp groups, phone calls, verbal messages) for waste management. Missed garbage collections, overflowing chutes, and unclean refuse rooms often go unaddressed for days.

**SocietyClean** transforms society sanitation operations through:
- **Residents:** 30-second mobile complaint lodging with photo evidence and live status tracking.
- **Society Managers:** Operational control room with complaint filtering, staff assignment, and hygiene metrics.
- **Housekeeping Staff:** Mobile task queue with after-cleanup photo evidence submission.
- **Community:** Published weekly waste collection schedules for wet, dry, e-waste, and hazardous streams.

---

## 🚀 Key Features (MVP 1 Scope)

| Feature | Description | PRD Feature ID |
| :--- | :--- | :--- |
| **Authentication & RBAC** | Role-based authentication (Resident, Manager, Staff) with society-level scoping. | `FR-001` |
| **Incident Reporting** | Mobile-first complaint lodging with category, wing, floor, description, and photo. | `FR-002`, `FR-003` |
| **Automated Reference IDs** | Human-readable ticket references (`SC-YYYYMMDD-XXXX`). | `FR-004` |
| **Resident Tracking** | Visual status stepper (`Pending` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`). | `FR-005` |
| **Manager Hub & Analytics** | Filterable complaints queue and KPI summary cards. | `FR-006`, `FR-007` |
| **Staff Task Dispatch** | Assign cleaning tasks to housekeeping staff with mobile queue view. | `FR-008`, `FR-009` |
| **Resolution Proof** | Staff submit resolution notes and after-cleanup photo evidence. | `FR-010` |
| **Collection Schedule** | Weekly timetable for segregated wet, dry, and special waste pickups. | `FR-011` |
| **Staff Directory & Management** | Manager directory: Add staff, edit details, workload counts, active/deactivate status with active-task protection. | `FR-012` |
| **Schedule Slot Editor** | Manager controls to edit, add, and remove collection schedule slots with 24-hr time validation. | `FR-013` |

---

## 🛠️ Technology Stack

- **Runtime & Language:** Node.js (v20+ LTS) with TypeScript
- **Backend API:** Express.js with modular Controller-Service-Repository architecture
- **Frontend UI:** Responsive React SPA styled with custom Forest Green & Mint Vanilla CSS tokens
- **Database:** PostgreSQL (with Neon / Supabase compatibility) or SQLite for local development
- **File & Media Storage:** Abstracted storage service (Local disk in `uploads/` for dev; S3/R2 for prod)
- **Security:** Argon2id / bcrypt password hashing, stateless JWT with HTTP-only cookies, Helmet, Rate Limiter

---

## 📂 Architecture & Documentation Index

All technical, product, and agent documentation is centralized in [`docs/`](file:///f:/society%20waste%20mangement/docs/):

- 📋 **[Product Requirements Document (PRD)](docs/PRD.md):** Complete specifications, scope, user stories, and acceptance criteria.
- 🏗️ **[System Architecture](docs/ARCHITECTURE.md):** Architectural patterns, component diagrams, and directory structure.
- 🔌 **[REST API Specification](docs/API_SPECIFICATION.md):** Complete endpoint contracts, payload schemas, and response formats.
- 🗄️ **[Data Model Specification](docs/DATA_MODEL.md):** Relational SQL tables, fields, constraints, and entity diagrams.
- 🗺️ **[Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md):** 4-phase milestone delivery plan.
- 🧪 **[Quality Assurance & Test Plan](docs/TEST_PLAN.md):** Test scenarios, isolation verifications, and QA checklists.
- ⚖️ **[Architectural Decision Records](docs/DECISIONS.md):** ADRs documenting foundational technical decisions.
- 📜 **[Project Changelog](docs/CHANGELOG.md):** Version history and modification records.
- 🤖 **[Agent Instructions (AGENTS.md)](AGENTS.md):** Universal operating rules for AI coding agents.

---

## ⚙️ Environment Variables

Copy the template file to configure your local environment:

```bash
cp .env.example .env
```

Key environment configurations:

```bash
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
JWT_SECRET=replace_with_secure_random_key_min_32_chars
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/society_waste_dev
STORAGE_DRIVER=local
LOCAL_UPLOAD_PATH=./uploads
```

---

## 💻 Development & Testing Commands

Once dependencies and scaffolding are initialized (Phase 1):

```bash
# Install dependencies
npm install

# Run database migrations & seed initial demo society
npm run db:migrate
npm run db:seed

# Start development servers (frontend + backend)
npm run dev

# Run automated tests
npm test

# Run type check and linting
npm run typecheck
npm run lint
```

---

## 📊 Current Implementation Status

- **Status:** **MVP 1 Management Features Fully Implemented, Built & Tested (100% Pass Rate)**
- **Database:** SQLite with WAL mode (`data/societyclean.db`).
- **Production Build:** Verified with `npm run build` (dist bundle generated and served by Express).
- **Test Suite:** **31 / 31 integration tests passing** (`npm test`).
- **Features Verified:**
  - Dedicated authentication & login screen with 3 role portals (Resident, Staff, Manager).
  - Role verification guard blocking mismatched portal sign-ins.
  - Password visibility toggle (show/hide) and presentation quick-fill with masked passwords.
  - Safe session logout and automatic session expiry handling.
  - Full staff management directory with add, edit, and workload counters.
  - Active task protection on staff deactivation (`HAS_ACTIVE_TASKS`).
  - Collection schedule timetable editing, slot addition, and deletion.
  - Strict server-side RBAC and multi-tenant society isolation.

### 🔑 Demo Accounts (Pre-Seeded)

The database comes pre-seeded with a demo housing society (**Green Vista CHS**) and 3 role personas:

| Role | User Name | Email | Society Code | Access Portal |
| :--- | :--- | :--- | :--- | :--- |
| **Resident** | Rajesh Sharma (Wing B, B-402) | `resident@greenvista.org` | `GREEN-VISTA-01` | Resident Portal |
| **Society Manager** | Anita Deshmukh (Secretary) | `manager@greenvista.org` | `GREEN-VISTA-01` | Manager Hub |
| **Housekeeping Staff** | Ramesh Kumar | `staff@greenvista.org` | `GREEN-VISTA-01` | Staff Queue |

*Tip: The login page includes a discreet presentation quick-fill helper that automatically populates the masked password input for college demonstrations without displaying passwords in plaintext.*

---

## 🏃 Running the Application

```bash
# 1. Start the server (serves both API & Frontend on http://localhost:4000)
npm start

# Or for hot-reloading development:
# Terminal 1: npm start
# Terminal 2: npx vite
```
Open **`http://localhost:4000`** in any browser.
