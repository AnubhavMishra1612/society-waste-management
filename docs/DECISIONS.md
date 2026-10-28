# Architectural Decision Records (ADRs)

# SocietyClean — Society Waste Management Portal

**Version:** 1.0.0  
**Status:** Approved  
**Last Updated:** October 2026  
**Related Documents:** [`docs/PRD.md`](file:///f:/society%20waste%20mangement/docs/PRD.md), [`docs/ARCHITECTURE.md`](file:///f:/society%20waste%20mangement/docs/ARCHITECTURE.md)

---

## Index of Decisions

- [ADR-001: Repository Inspection and Clean-Slate Greenfield Baseline](#adr-001-repository-inspection-and-clean-slate-greenfield-baseline)
- [ADR-002: Node.js, Express & TypeScript for Full-Stack Architecture](#adr-002-nodejs-express--typescript-for-full-stack-architecture)
- [ADR-003: Forest Green & Mint Design System with Vanilla CSS Tokens](#adr-003-forest-green--mint-design-system-with-vanilla-css-tokens)
- [ADR-004: Relational SQL Storage with Strict Multi-Tenant Society Scoping](#adr-004-relational-sql-storage-with-strict-multi-tenant-society-scoping)
- [ADR-005: Abstracted File Storage Driver for Local and Cloud Uploads](#adr-005-abstracted-file-storage-driver-for-local-and-cloud-uploads)
- [ADR-006: Strict Finite State Machine with Immutable Audit History](#adr-006-strict-finite-state-machine-with-immutable-audit-history)

---

## ADR-001: Repository Inspection and Clean-Slate Greenfield Baseline

### Context
On October 28, 2026, the workspace `f:/society waste mangement` was inspected prior to any code generation or architecture documentation. Inspection via file listings and shell commands revealed that the repository was completely empty with no existing codebase, dependencies, or Git history.

### Decision
Treat the repository as a greenfield architecture. Establish strict architectural patterns, directory structures, and documentation guidelines from day one without needing to refactor or preserve legacy code.

### Consequences
- **Positive:** No technical debt or conflicting legacy patterns.
- **Negative:** Everything from scaffolding to deployment pipelines must be defined cleanly from scratch.

---

## ADR-002: Node.js, Express & TypeScript for Full-Stack Architecture

### Context
We need a robust, scalable backend and responsive frontend that can be maintained by standard engineering teams, run with minimal operational overhead, and support future multi-tenant SaaS features.

### Decision
Standardize the application stack on **Node.js (v20+ LTS) with TypeScript**, using **Express.js** for the API server and a responsive **React** single-page application (or modular Next.js/Vite frontend).

### Rationale
- TypeScript allows sharing data contracts (interfaces, enums, validation schemas) between client and server.
- Express provides a reliable, transparent middleware chain ideal for tenant extraction, role-based authorization, and file upload validation.

---

## ADR-003: Forest Green & Mint Design System with Vanilla CSS Tokens

### Context
Residential waste management portals often suffer from generic, unpolished admin templates. SocietyClean requires an institutional yet modern aesthetic that inspires confidence among society management committees and residents.

### Decision
Adopt a curated **Forest Green (`#1b4332`), Mint (`#52b788`), and crisp neutral** color system utilizing **Vanilla CSS Custom Properties (CSS variables)**. Avoid bloated CSS frameworks that enforce generic component look-and-feel.

### Rationale
- Pure CSS design tokens provide zero-build runtime styling, extreme rendering speed, and total customization.
- Forest green communicates cleanliness, environmental sustainability, and authority.

---

## ADR-004: Relational SQL Storage with Strict Multi-Tenant Society Scoping

### Context
Housing societies operate as distinct administrative silos. Complaints, resident data, and housekeeping assignments must never leak across society boundaries. Furthermore, complaints require strict relational constraints with users, audit history, and assignments.

### Decision
Use a relational SQL database (PostgreSQL in staging/production, SQLite supported in local dev). Every table must have a mandatory `society_id` foreign key. Middleware must inject `societyId` from the verified session, and all repository queries must enforce tenant scoping.

### Rationale
- Relational foreign keys and unique constraints prevent orphaned status records or duplicate reference numbers.
- SQL queries provide guaranteed transactional consistency when transitioning complaint states.

---

## ADR-005: Abstracted File Storage Driver for Local and Cloud Uploads

### Context
Residents upload photos of overflowing bins or dirty garbage rooms, and staff upload completion proof photos. Local development needs simple disk storage, whereas production deployments require cloud object storage (AWS S3, Cloudflare R2, or Supabase Storage).

### Decision
Implement a `StorageService` interface with a `LocalStorageDriver` for development (saving to `uploads/` with sanitized UUIDs) and an `S3StorageDriver` for production.

### Rationale
- Decouples business logic from external cloud providers.
- Local development works out-of-the-box without requiring cloud API keys.

---

## ADR-006: Strict Finite State Machine with Immutable Audit History

### Context
In housing societies, disputes frequently arise over whether a complaint was resolved or who authorized a status change.

### Decision
Implement a formalized finite state machine (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `REOPENED` $\rightarrow$ `CANCELLED`). Every transition automatically appends an immutable entry to `status_history` recording `from_status`, `to_status`, `changed_by_user_id`, `notes`, and timestamp.

### Rationale
- Eliminates invalid transitions (e.g. going directly from `PENDING` to `RESOLVED` without assignment/completion).
- Creates a tamper-proof audit trail for society committee reviews.
