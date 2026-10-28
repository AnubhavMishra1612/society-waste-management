---
name: product-requirements
description: Guidelines for interpreting the SocietyClean PRD, converting requirements into incremental tasks, maintaining feature IDs, and preventing scope creep.
---

# Product Requirements Skill (`product-requirements`)

Use this skill when interpreting product specifications, planning new feature increments, validating scope boundaries, or updating functional requirements in the SocietyClean codebase.

---

## 1. Core Operating Principles

1. **Single Source of Truth:** [`docs/PRD.md`](file:///f:/society%20waste%20mangement/docs/PRD.md) is the authoritative definition of all product scope. Never implement features that deviate from the PRD without documenting an approved change.
2. **Explicit Feature Traceability:** Every pull request, commit, or coding step must cite the corresponding Feature ID (e.g. `FR-001`, `FR-002`, `FR-003`).
3. **Strict Scope Discipline:** Distinguish between **MVP 1 (Mandatory Initial Release)**, **MVP 2 (Enhancements)**, and **Future SaaS Capabilities**. Resist adding features from MVP 2 into MVP 1 unless approved.
4. **Acceptance Criteria Verification:** Work is only considered complete when all testable acceptance criteria defined under the feature story in the PRD are satisfied.

---

## 2. Converting Requirements to Actionable Tasks

When receiving a feature request, execute this decomposition protocol:

```text
PRD Feature ID (e.g., FR-002)
  ├── 1. Data Contract (Types, Enums in shared/types.ts)
  ├── 2. Database Schema & Migration (tables, foreign keys, indexes)
  ├── 3. Backend Route & Middleware (validation, auth, tenant filter)
  ├── 4. Business Logic Service (state checks, transactions, file handling)
  ├── 5. Frontend UI Component (forms, states, design tokens)
  └── 6. Automated Verification (unit + integration tests)
```

---

## 3. Scope Gatekeeping Matrix

| Feature | Scope Category | Action |
| :--- | :---: | :--- |
| Resident photo-incident reporting | **MVP 1** | Implement immediately |
| Unique ticket numbers (`SC-YYYYMMDD-XXXX`) | **MVP 1** | Implement immediately |
| Manager dashboard with status filters | **MVP 1** | Implement immediately |
| Staff task queue & photo resolution | **MVP 1** | Implement immediately |
| Weekly waste collection schedule | **MVP 1** | Implement immediately |
| Automated WhatsApp / SMS webhooks | **MVP 2** | Defer to Phase 4 |
| Resident 5-star satisfaction ratings | **MVP 2** | Defer to Phase 4 |
| Bin QR code scanning | **MVP 2** | Defer to Phase 4 |
| Multi-society self-service subscription billing | **SaaS** | Defer to Phase 4 |

---

## 4. Handling Ambiguities & Scope Changes

- If a user prompt asks for behavior that conflicts with `docs/PRD.md`, pause and flag the conflict.
- If a new requirement is approved:
  1. Assign a new Feature ID (e.g. `FR-014`).
  2. Update [`docs/PRD.md`](file:///f:/society%20waste%20mangement/docs/PRD.md) with preconditions, expected behavior, and acceptance criteria.
  3. Record the rationale in [`docs/DECISIONS.md`](file:///f:/society%20waste%20mangement/docs/DECISIONS.md).
  4. Log the update in [`docs/CHANGELOG.md`](file:///f:/society%20waste%20mangement/docs/CHANGELOG.md).
