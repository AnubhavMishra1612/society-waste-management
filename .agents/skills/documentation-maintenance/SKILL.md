---
name: documentation-maintenance
description: Protocols for keeping the PRD, architecture, API specifications, data models, changelog, and README synchronized across all development cycles.
---

# Documentation Maintenance Skill (`documentation-maintenance`)

Use this skill when introducing architectural modifications, altering database tables, creating new API routes, adding environment variables, or updating implementation milestones in SocietyClean.

---

## 1. Documentation Synchronization Protocol

Whenever code is modified, update the corresponding documentation files before closing the task:

| Code Change | Mandatory Documentation Update |
| :--- | :--- |
| **New or altered API endpoint** | [`docs/API_SPECIFICATION.md`](file:///f:/society%20waste%20mangement/docs/API_SPECIFICATION.md) |
| **Database schema migration or new column** | [`docs/DATA_MODEL.md`](file:///f:/society%20waste%20mangement/docs/DATA_MODEL.md) |
| **Scope, role permissions, or feature criteria** | [`docs/PRD.md`](file:///f:/society%20waste%20mangement/docs/PRD.md) |
| **High-level stack or architectural pattern** | [`docs/ARCHITECTURE.md`](file:///f:/society%20waste%20mangement/docs/ARCHITECTURE.md) & [`docs/DECISIONS.md`](file:///f:/society%20waste%20mangement/docs/DECISIONS.md) |
| **Environment variable added or renamed** | `.env.example` & [`README.md`](file:///f:/society%20waste%20mangement/README.md) |
| **Milestone completed or phase progressed** | [`docs/IMPLEMENTATION_ROADMAP.md`](file:///f:/society%20waste%20mangement/docs/IMPLEMENTATION_ROADMAP.md) |
| **Any release or substantive feature change** | [`docs/CHANGELOG.md`](file:///f:/society%20waste%20mangement/docs/CHANGELOG.md) |

---

## 2. Rules for Maintaining Documentation Integrity

1. **Zero Fake or Stale Statuses:**
   - Mark features accurately as `Planned`, `In Progress`, or `Implemented`.
   - Never describe an unbuilt feature as working.
2. **Never Commit Secrets to Documentation:**
   - Always document environment variables with descriptive placeholder values (e.g. `JWT_SECRET=your_jwt_secret_min_32_chars`), never real keys.
3. **Keep Links Clickable and Relative:**
   - Ensure markdown links within documents point to the correct relative paths or standard workspace URIs.
4. **Follow Keep a Changelog Format:**
   - Group entries in [`docs/CHANGELOG.md`](file:///f:/society%20waste%20mangement/docs/CHANGELOG.md) under standard headers: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
