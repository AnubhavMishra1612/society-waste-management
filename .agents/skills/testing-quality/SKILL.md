---
name: testing-quality
description: Protocols for writing, executing, and reporting unit, integration, and E2E tests, verifying builds, and preventing falsified test claims for SocietyClean.
---

# Testing & Quality Assurance Skill (`testing-quality`)

Use this skill when developing automated tests, creating test fixtures, validating builds, measuring coverage, and executing regression checks for SocietyClean.

---

## 1. Golden Rule for Verification Claims

> **NEVER report that tests passed unless you personally executed the test command in the terminal and verified an exit code of `0`.**
> 
> If a test command fails, report the exact error, file name, and failing assertion. If tests were not run, state: *"Tests were not executed in this turn."*

---

## 2. Test Architecture & Directory Structure

Organize tests strictly by layer under `tests/`:

```text
tests/
├── unit/                         # Fast, pure unit tests (no DB, no network)
│   ├── referenceGenerator.test.ts
│   ├── stateMachine.test.ts
│   └── validators.test.ts
├── integration/                  # API routes, middleware, and database queries
│   ├── auth.integration.test.ts
│   ├── complaints.integration.test.ts
│   ├── tenantIsolation.integration.test.ts
│   └── schedule.integration.test.ts
├── fixtures/                     # Deterministic mock data & seed helpers
│   ├── mockSociety.ts
│   ├── mockUsers.ts
│   └── sampleComplaints.ts
└── helpers/                      # Test client, auth token generator
    └── testServer.ts
```

---

## 3. Writing High-Value Integration Tests

When testing API endpoints, always assert:
1. **HTTP Status Code:** Verify exact expected code (`200`, `201`, `400`, `401`, `403`, `404`, `422`).
2. **Standard Envelope:** Ensure response contains `success: boolean`, `data`, and `error`.
3. **Database Side Effects:** Query the database to confirm mutations occurred as expected.
4. **Tenant Isolation:** In the same test, issue a request from a second mock society and assert that the first society's record is completely invisible.

---

## 4. Test Execution & Build Verification Sequence

Before completing any implementation step, execute the complete build and verification suite:

```bash
# 1. Typecheck the codebase
npm run typecheck

# 2. Lint and format checks
npm run lint

# 3. Execute unit and integration tests
npm test

# 4. Verify production build succeeds
npm run build
```

---

## 5. Test Data Management

- Always run integration tests against an isolated test database (e.g., PostgreSQL test schema or in-memory SQLite).
- Use transactions that roll back after each test run, or use a cleanup helper in `afterEach()` to avoid state pollution between test cases.
- Never use production credentials or real resident personal information in test fixtures.
