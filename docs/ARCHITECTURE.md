# Technical Architecture Document

# SocietyClean — Society Waste Management Portal

**Version:** 1.0.0  
**Status:** Approved  
**Last Updated:** October 2026  
**Related Documents:** [`docs/PRD.md`](file:///f:/society%20waste%20mangement/docs/PRD.md), [`docs/API_SPECIFICATION.md`](file:///f:/society%20waste%20mangement/docs/API_SPECIFICATION.md), [`docs/DATA_MODEL.md`](file:///f:/society%20waste%20mangement/docs/DATA_MODEL.md)

---

## 1. Executive Architecture Summary

SocietyClean is designed as a high-performance, modular web application engineered for residential housing society waste management. The system employs a clean three-tier architecture with clear layer boundaries:

```mermaid
graph TB
    subgraph Client Tier [Responsive Web Client]
        ResidentUI[Resident Portal]
        ManagerUI[Manager Operations Hub]
        StaffUI[Staff Mobile Task Queue]
    end

    subgraph API Gateway / Middleware
        AuthMW[JWT & RBAC Middleware]
        TenantMW[Society Tenant Scoper]
        RateLimitMW[Rate Limiter]
        UploadMW[Multer File Upload Validator]
    end

    subgraph Application Tier [Core Backend Services]
        AuthService[Auth & User Service]
        ComplaintService[Complaint & Workflow Service]
        AssignmentService[Task Assignment Service]
        ScheduleService[Collection Schedule Service]
        AnalyticsService[Dashboard Metrics Service]
    end

    subgraph Storage Tier [Persistence & Media]
        SQLDB[(Relational DB: PostgreSQL / SQLite)]
        MediaStorage[(Media Storage: Local Disk / S3 / Cloudflare R2)]
    end

    ResidentUI --> AuthMW
    ManagerUI --> AuthMW
    StaffUI --> AuthMW

    AuthMW --> TenantMW
    TenantMW --> RateLimitMW
    RateLimitMW --> UploadMW

    UploadMW --> ComplaintService
    RateLimitMW --> AuthService
    RateLimitMW --> AssignmentService
    RateLimitMW --> ScheduleService
    RateLimitMW --> AnalyticsService

    ComplaintService --> SQLDB
    ComplaintService --> MediaStorage
    AuthService --> SQLDB
    AssignmentService --> SQLDB
    ScheduleService --> SQLDB
    AnalyticsService --> SQLDB
```

---

## 2. Technology Stack & Rationale

| Component | Technology | Rationale | Alternatives Evaluated |
| :--- | :--- | :--- | :--- |
| **Runtime & Language** | Node.js (v20+ LTS) with TypeScript | Strong typing across client/server contracts; rapid development; massive ecosystem. | Python (FastAPI), Go |
| **Backend Framework** | Express.js / Fastify | Minimalist, well-understood middleware pipeline, battle-tested for enterprise APIs. | NestJS, Django |
| **Frontend Framework** | React (Vite / Next.js compatible) | Component reusability, fast client-side routing, huge community of UI primitives. | Svelte, Vue 3 |
| **Styling & Design Tokens** | Vanilla CSS with Custom Properties | Zero build overhead, precise token control, superior loading performance, strict brand palette adherence. | TailwindCSS, Bootstrap |
| **Database** | PostgreSQL / SQLite | Strict ACID compliance, relational integrity for ticket status transitions and multi-tenant foreign keys. | MongoDB, DynamoDB |
| **Database Access** | Prisma ORM / Kysely / Drizzle | Type-safe queries, migration automation, compile-time schema verification. | Raw SQL, TypeORM |
| **Authentication** | JWT (JSON Web Tokens) with HTTP-only cookies | Stateless, secure across mobile & desktop, simple role-based claims decoding. | Session cookies + Redis |
| **File / Media Storage** | Abstracted Storage Service (Local / S3) | Decouples local filesystem development from cloud object storage in production. | Direct DB blobs |

---

## 3. Directory & Codebase Organization

The recommended repository layout organizes frontend, backend, and shared contracts clearly:

```text
society-waste-management/
├── .agents/                          # Customization root
│   └── skills/                       # Specialized AI agent skills
│       ├── product-requirements/
│       ├── frontend-development/
│       ├── backend-api/
│       ├── database-management/
│       ├── security-review/
│       ├── testing-quality/
│       ├── ui-ux-design/
│       ├── file-uploads/
│       └── documentation-maintenance/
├── docs/                             # Project documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── API_SPECIFICATION.md
│   ├── DATA_MODEL.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── TEST_PLAN.md
│   ├── DECISIONS.md
│   └── CHANGELOG.md
├── src/
│   ├── client/                       # Frontend application
│   │   ├── assets/                   # Static images, icons, branding
│   │   ├── components/               # Reusable UI components
│   │   │   ├── common/               # Button, Modal, Badge, Input, Card
│   │   │   ├── layout/               # Header, BottomNav, Sidebar
│   │   │   ├── complaints/           # ComplaintCard, ComplaintForm, Stepper
│   │   │   └── dashboard/            # MetricCard, FilterToolbar, ChartCard
│   │   ├── context/                  # AuthContext, ToastContext
│   │   ├── hooks/                    # useAuth, useComplaints, useSchedule
│   │   ├── pages/                    # Route pages (Resident, Manager, Staff)
│   │   ├── styles/                   # index.css, tokens.css, components.css
│   │   └── utils/                    # formatting, validators, date helpers
│   ├── server/                       # Backend application
│   │   ├── config/                   # env validation, constants
│   │   ├── controllers/              # HTTP request/response handlers
│   │   ├── middleware/               # auth, tenant, validation, error handler
│   │   ├── models/ or db/            # Database schema, migrations, seeds
│   │   ├── routes/                   # REST routing definitions
│   │   ├── services/                 # Business logic, workflows, notifications
│   │   └── storage/                  # Local and S3 upload drivers
│   └── shared/                       # Shared TypeScript types & enums
│       ├── types.ts                  # Complaint, User, Society interfaces
│       └── enums.ts                  # Role, Status, Category enums
├── tests/                            # Automated test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── uploads/                          # Local media storage (git-ignored)
├── .env.example                      # Template environment variables
├── AGENTS.md                         # Global agent operating standards
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript compiler configuration
└── README.md                         # Project readme
```

---

## 4. Key Architectural Patterns

### 4.1. Strict Multi-Tenant Society Isolation
Every transactional entity (`User`, `Complaint`, `CollectionSchedule`, `StatusHistory`) has a mandatory `society_id` foreign key.
- **Middleware Enforcement:** The `tenantMiddleware` extracts the authenticated user's `society_id` from their verified session token and injects it into `req.societyId`.
- **Query Guardrail:** All database queries must explicitly include `WHERE society_id = req.societyId`.
- **Zero Cross-Talk:** It is architecturally impossible for a query executed by a resident or manager of Society A to read or mutate Society B's data.

### 4.2. State Machine Pattern for Complaint Lifecycle
Status transitions are strictly mediated through a state machine validator:

```mermaid
stateDiagram-v2
    [*] --> PENDING: Resident Submits
    PENDING --> IN_PROGRESS: Manager Assigns Staff
    PENDING --> CANCELLED: Resident Retracts / Manager Cancels
    IN_PROGRESS --> RESOLVED: Staff Completes + Photo Proof
    IN_PROGRESS --> PENDING: Manager Reassigns / Revokes
    RESOLVED --> REOPENED: Resident Disputes Resolution
    REOPENED --> IN_PROGRESS: Manager Re-assigns Staff
    RESOLVED --> [*]: Closed
    CANCELLED --> [*]: Closed
```

### 4.3. Abstracted Storage Adapter
All file uploads enter through a `StorageService` interface:
```typescript
export interface StorageService {
  uploadFile(file: Express.Multer.File, folder: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
  getPublicUrl(storedPath: string): string;
}
```
In development, the `LocalStorageDriver` writes to the `uploads/` directory with UUID filenames and sanitization. In production, this can be swapped for an `S3StorageDriver` without modifying application business logic.

---

## 5. Environment Variables & Configuration

A valid `.env` file must provide the following variables (templates provided in `.env.example`):

```bash
# Server Configuration
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Security Secrets
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
COOKIE_SECRET=super_secret_cookie_signing_string

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/society_waste_dev
# Or for local SQLite:
# DATABASE_URL=file:./dev.db

# Storage Driver ('local' or 's3')
STORAGE_DRIVER=local
LOCAL_UPLOAD_PATH=./uploads
S3_BUCKET_NAME=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 6. Error Handling & Logging Strategy

- **Unified Error Filter:** All unhandled exceptions and validation errors pass through a central Express error-handling middleware.
- **Consistent Error Payload:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "Category and Wing are required fields",
      "details": [{ "field": "category", "issue": "Must be a valid category enum" }]
    }
  }
  ```
- **Logging:** Structured JSON logs utilizing Winston or Pino, capturing request method, route, status code, response time, and user ID (PII like passwords and raw tokens are explicitly redacted).
