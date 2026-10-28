# Changelog

All notable changes to the **SocietyClean — Society Waste Management Portal** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-10-28

### Added
- **Professional Authentication & Login Entry Screen (`src/client/App.jsx`, `src/client/styles/app.css`)**:
  - Polished responsive login screen using forest-green and mint design system tokens.
  - Three role portal options: Resident (🏠), Housekeeping Staff (🧹), and Society Manager (📋).
  - Show / Hide password toggle (`👁️` / `🙈`) with native input masking.
  - Server-authenticated login against real `POST /api/v1/auth/login` endpoint.
  - Role verification guard: validates returned server role against selected portal hint; prevents unauthorized access and displays actionable error on mismatch.
  - Role-specific redirection to Resident, Staff, or Manager dashboard upon successful login.
  - College presentation quick-fill helper: populates demo accounts directly into masked password input without exposing plaintext passwords on the screen.
  - Safe session logout (`handleLogout`) that terminates user tokens and cleans session state.
  - Global 401 session expiry interceptor that redirects expired/invalid sessions to the login view.
  - Production-style top navigation: removed the public one-click role switcher from the header and added an authenticated user badge and explicit Sign Out action.

## [1.3.0] - 2026-10-28

### Added
- **Collection Schedule Editing Endpoints (`src/server/routes/scheduleRoutes.js`)**:
  - `PUT /api/v1/schedules/:id`: Authenticated manager-only endpoint for editing collection schedule categories, days of week, start/end times, instructions, and disposal location.
  - `DELETE /api/v1/schedules/:id`: Authenticated manager-only soft deletion endpoint for schedule slots.
  - Strict 24-hour time range validation (`HH:MM` format and `startTime < endTime`).
  - Society multi-tenant isolation ensuring managers cannot access or modify schedules belonging to other societies.
- **Collection Timetable UI Enhancements (`src/client/App.jsx`, `src/client/styles/app.css`)**:
  - Added visible "✏️ Edit Schedule" button on each timetable card for managers.
  - Added "+ Add Schedule Slot" modal and action bar.
  - Interactive day selection pill toggles (`MON` - `SUN`).
  - Native time inputs for start and end times with instant validation.
  - Optional disposal location tag (`📍 Floor Doorstep`, `📍 Clubhouse Drop Point`).
  - Native confirmation dialogs preventing accidental schedule modifications or deletions.
  - Instant refresh of timetable data and toast feedback upon saving.
- **Collection Schedule Integration Tests (`tests/integration/api.test.js`)**:
  - Added 5 new test cases (`TC-SCHED-02` through `TC-SCHED-06`): schedule editing persistence in SQLite, time range order validation (`startTime >= endTime` rejected with 400), non-manager access prevention (403 Forbidden for resident/staff), adding new schedule slots, and cross-tenant foreign schedule isolation (404 Not Found).
  - Test suite now has **31 passing tests** with 100% pass rate.

### Added
- **Repository Inspection Baseline**: Inspected empty repository on 2026-10-28 and established clean greenfield architectural standards.
- **Product Requirements Document (`docs/PRD.md`)**: Full PRD covering problem, solution, personas, scope (MVP 1, MVP 2, SaaS), functional requirements (`FR-001` through `FR-013`), RBAC matrix, user workflows, and UI specifications.
- **System Architecture Document (`docs/ARCHITECTURE.md`)**: Complete technical stack specification covering Node.js/TypeScript, Express, React, PostgreSQL/SQLite, storage adapter, security middleware, and directory structure.
- **REST API Specification (`docs/API_SPECIFICATION.md`)**: Detailed endpoint contracts for Auth, Complaints, Schedules, and Manager Analytics with request/response schemas and status codes.
- **Data Model Specification (`docs/DATA_MODEL.md`)**: Full relational schema covering `societies`, `users`, `complaints`, `status_history`, `task_assignments`, and `collection_schedules`.
- **Implementation Roadmap (`docs/IMPLEMENTATION_ROADMAP.md`)**: 4-phase milestone delivery plan from Foundation (M1) to MVP 1 Core (M2), Pilot Verification (M3), and SaaS Expansion (M4).
- **QA & Test Plan (`docs/TEST_PLAN.md`)**: Testing pyramid, test cases matrix (`TC-AUTH`, `TC-COMP`, `TC-ISOL`, `TC-WORK`, `TC-UI`), and automation command reference.
- **Architectural Decision Records (`docs/DECISIONS.md`)**: Formally recorded ADR-001 through ADR-006 documenting technology choices, design system tokens, multi-tenancy, and state machines.
- **Agent Operating Standards (`AGENTS.md`)**: Universal rules and workflow protocols for all AI coding agents working on the codebase.
- **Agent Skills (`.agents/skills/*`)**: Created 9 specialized agent skill sets for product requirements, frontend, backend, database, security, testing, UI/UX, file uploads, and documentation maintenance.
- **Project README (`README.md`)**: Top-level developer onboarding guide with quickstart, environment variables, and status tracking.

## [1.2.0] - 2026-10-28

### Added
- **Staff Management REST Endpoints (`src/server/routes/userRoutes.js`)**:
  - `GET /api/v1/users/staff`: Filter staff by status (`all`, `active`, `inactive`) and search query; returns workload counts (`active_tasks_count`, `total_completed_tasks_count`).
  - `POST /api/v1/users/staff`: Secure creation of housekeeping staff with name, email validation, duplicate prevention, and automatic high-entropy temporary password generation with bcrypt hashing.
  - `PUT /api/v1/users/staff/:id`: Edit staff details (full name, phone, employee ID, email with duplicate protection).
  - `PATCH /api/v1/users/staff/:id/status`: Activate or deactivate staff with protection against deactivating staff with open tasks (`HAS_ACTIVE_TASKS`).
- **Improved Assignment Modal & Workload Scoping (`src/server/services/complaintService.js`, `src/client/App.jsx`)**:
  - Server-side assignment validation preventing assignment to inactive staff (`STAFF_INACTIVE`).
  - Dynamic fetch of active staff in assignment modal with open-task count.
  - Staff tasks scoped strictly to the authenticated staff member's assigned complaints (`assigned_to_user_id`).
  - Staff resolve ownership check: staff cannot resolve complaints assigned to another staff member.
- **Manager Staff Directory UI (`src/client/App.jsx`, `src/client/styles/app.css`)**:
  - Manage Staff tab accessible to authenticated society managers.
  - Search by name, email, phone, employee ID, and status filter (All, Active, Inactive).
  - Copyable temporary password alert banner displayed immediately upon staff creation.
  - Add & Edit Staff responsive modals with validation.
  - Instant dashboard & workload synchronization without manual page reload.
- **Staff Management Integration Tests (`tests/integration/api.test.js`)**:
  - Added 11 automated test cases (`TC-STAFF-01` to `TC-STAFF-11`), covering staff creation, input validation, duplicate handling, deactivation guards, inactive assignment rejection, cross-tenant isolation, and temporary password login. Total 26 tests passing.

## [1.1.0] - 2026-10-28

### Added
- **SQLite Database Engine (`src/server/db/schema.js`)**: Implemented high-performance SQLite engine with WAL mode and foreign key constraints for `societies`, `users`, `complaints`, `status_history`, and `collection_schedules`.
- **Demo Seed Data (`src/server/db/seed.js`)**: Automated seed generator provisioning demo society (Green Vista) with Resident, Manager, and Staff accounts, waste collection schedules, and sample tickets.
- **Auth & RBAC Middleware (`src/server/middleware/auth.js`)**: Stateless JWT session handling with role verification (`resident`, `manager`, `staff`) and society scoping.
- **Multipart Upload Handler (`src/server/middleware/upload.js`)**: Multer image upload filter enforcing 5MB cap and JPEG/PNG/WebP MIME whitelist.
- **Complaint Business Logic (`src/server/services/complaintService.js`)**: Unique ticket reference generator (`SC-YYYYMMDD-XXXX`), status state machine, immutable audit history logging, and manager analytics calculator.
- **REST API Endpoints (`src/server/routes/*`)**:
  - Auth: `/api/v1/auth/login`, `/register`, `/me`
  - Complaints: `POST /api/v1/complaints`, `GET /my`, `GET /`, `GET /:id`, `PATCH /:id/assign`, `PATCH /:id/status`, `POST /:id/resolve`, `POST /:id/reopen`
  - Schedules: `GET /api/v1/schedules`, `POST /`
  - Analytics: `GET /api/v1/analytics/overview`
  - Users: `GET /api/v1/users/staff`
- **Responsive React SPA (`src/client/*`)**:
  - Forest Green & Mint design system with Vanilla CSS tokens
  - Resident incident submission form with category grid and photo upload dropzone
  - Resident ticket tracking with 3-step progress stepper and before/after photo viewer
  - Manager operations hub with KPI cards, multi-filter toolbar, and staff task assignment drawer
  - Staff mobile task queue with photo-proof completion workflow
  - Weekly waste collection schedule calendar
  - Quick demo role switcher between Resident, Manager, and Staff
- **Automated Test Suite (`tests/integration/api.test.js`)**: 15 end-to-end integration tests covering authentication, complaint submission, persistence, RBAC enforcement, staff dispatch, resolution proof, resident dispute reopening, and schedule listing. All 15 tests executed and passing.
- **Production Build**: Verified client bundle compilation via `vite build` to `dist/`.
