---
name: backend-api
description: Guidelines for designing, building, and testing RESTful APIs, controllers, services, middleware, and business logic for SocietyClean.
---

# Backend API Skill (`backend-api`)

Use this skill when implementing API routes, controllers, middleware, input validators, or background business workflows in the SocietyClean server.

---

## 1. Architectural Layer Separation

All server code must respect the three-tier layer model:

```text
HTTP Request
     │
     ▼
[Middleware Layer]        --> authMiddleware, tenantMiddleware, rateLimiter, multerUpload
     │
     ▼
[Controller Layer]        --> Request unpacking, schema validation, HTTP response formatting
     │
     ▼
[Service Layer]           --> Business rules, status state machine, notifications
     │
     ▼
[Repository / DB Layer]   --> SQL transactions, queries with strict WHERE society_id = ...
```

- **Controllers** must never execute direct SQL queries or bypass business rules.
- **Services** must never interact with Express `req` or `res` objects.
- **Repositories** must always guarantee tenant scoping.

---

## 2. API Contract & Response Formatting

Every endpoint must conform to the standard envelopes defined in [`docs/API_SPECIFICATION.md`](file:///f:/society%20waste%20mangement/docs/API_SPECIFICATION.md):

```typescript
// Standard Success Response
res.status(statusCode).json({
  success: true,
  data: resultData,
  error: null,
  meta: { timestamp: new Date().toISOString() }
});

// Standard Error Response
res.status(errorStatus).json({
  success: false,
  data: null,
  error: {
    code: errorCode, // e.g. "VALIDATION_FAILED", "UNAUTHORIZED"
    message: errorMessage,
    details: errorDetailsArray || []
  },
  meta: { timestamp: new Date().toISOString() }
});
```

---

## 3. Strict Input Validation

- Always validate incoming request bodies, query params, and route parameters at the controller boundary using Zod, Joi, or custom TypeScript validators.
- Reject unexpected or extra fields (`strip` or `strict` validation).
- Never trust raw user input in SQL queries (always use parameterized queries or ORM abstractions).

---

## 4. Multi-Tenant Authorization Enforcement

Before accessing or mutating any resource:
1. Verify the JWT and extract `userId`, `role`, and `societyId`.
2. Check role authorization (`requireRole(['manager', 'staff'])`).
3. Inject `societyId` into service parameters.
4. If accessing a specific resource by ID (e.g., `/api/v1/complaints/:id`):
   - Verify the record's `society_id` matches `req.societyId`. If not, return HTTP 404 (do not leak existence across societies).
   - If the user is a `resident`, verify `complaint.resident_id === req.userId`.

---

## 5. Pagination & Filtering Standard

All listing endpoints (e.g. `GET /api/v1/complaints`) must implement:
- Default `page = 1`, `limit = 20` (max limit capped at 100).
- Explicit total count calculation in database query.
- Structured sorting: Default `created_at DESC`.
- Sanitized SQL `LIKE` or full-text filters for keywords.

---

## 6. Backward Compatibility & Error Logging

- Never remove or rename existing response fields without updating API versioning.
- Log all 5xx errors with full stack traces, request method, path, and sanitized user IDs.
- Never log passwords, tokens, or PII.
