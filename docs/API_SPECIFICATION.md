# REST API Specification

# SocietyClean — Society Waste Management Portal

**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Data Interchange Format:** `application/json` (or `multipart/form-data` for file uploads)  
**Related Documents:** [`docs/PRD.md`](file:///f:/society%20waste%20mangement/docs/PRD.md), [`docs/DATA_MODEL.md`](file:///f:/society%20waste%20mangement/docs/DATA_MODEL.md)

---

## 1. Global Conventions

### 1.1. Standard Response Envelope
All API endpoints return a standardized JSON structure.

#### Success Envelope (`HTTP 200`, `201`)
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2026-10-28T22:45:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 42,
      "totalPages": 3
    }
  }
}
```

#### Error Envelope (`HTTP 400`, `401`, `403`, `404`, `422`, `500`)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Complaint with reference SC-20261028-0012 does not exist",
    "details": []
  },
  "meta": {
    "timestamp": "2026-10-28T22:45:00.000Z"
  }
}
```

### 1.2. Authentication & Headers
- All protected endpoints require a Bearer token in the `Authorization` header, or a valid HTTP-only `token` cookie:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- All responses include standard security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.

---

## 2. Authentication & User Management Endpoints

### 2.1. Register Resident
- **Method:** `POST`
- **Route:** `/api/v1/auth/register`
- **Purpose:** Allows a resident to register an account linked to an existing society.
- **Required Role:** Public
- **Request Body:**
  ```json
  {
    "societyCode": "GREEN-VISTA-01",
    "fullName": "Rajesh Sharma",
    "email": "rajesh.sharma@example.com",
    "password": "StrongPassword123!",
    "phone": "+919876543210",
    "wing": "Wing B",
    "flatNumber": "B-402"
  }
  ```
- **Validation Rules:**
  - `societyCode`: Required, valid uppercase alphanumeric code.
  - `email`: Valid email format, unique per society.
  - `password`: Minimum 8 characters, at least 1 number, 1 uppercase letter, 1 special symbol.
  - `wing`, `flatNumber`: Required non-empty strings.
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "u_987e6543-e21b-12d3-a456-426614174000",
        "fullName": "Rajesh Sharma",
        "email": "rajesh.sharma@example.com",
        "role": "resident",
        "societyId": "soc_123e4567-e89b-12d3-a456-426614174000",
        "wing": "Wing B",
        "flatNumber": "B-402"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Error Codes:** `400 BAD_REQUEST`, `404 SOCIETY_NOT_FOUND`, `409 EMAIL_ALREADY_EXISTS`.

---

### 2.2. Login User
- **Method:** `POST`
- **Route:** `/api/v1/auth/login`
- **Purpose:** Authenticate resident, manager, or staff member.
- **Required Role:** Public
- **Request Body:**
  ```json
  {
    "email": "anita.deshmukh@greenvista.org",
    "password": "ManagerPassword123!"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "u_manager_123",
        "fullName": "Anita Deshmukh",
        "email": "anita.deshmukh@greenvista.org",
        "role": "manager",
        "societyId": "soc_123e4567-e89b-12d3-a456-426614174000"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Error Codes:** `401 INVALID_CREDENTIALS`, `403 ACCOUNT_DISABLED`.

---

### 2.3. Get Current User (`me`)
- **Method:** `GET`
- **Route:** `/api/v1/auth/me`
- **Purpose:** Returns the authenticated user's profile and current society configuration.
- **Required Role:** Authenticated (`resident`, `manager`, `staff`, `platform_admin`)
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "u_987e6543-e21b-12d3-a456-426614174000",
        "fullName": "Rajesh Sharma",
        "email": "rajesh.sharma@example.com",
        "role": "resident",
        "phone": "+919876543210",
        "wing": "Wing B",
        "flatNumber": "B-402",
        "society": {
          "id": "soc_123e4567-e89b-12d3-a456-426614174000",
          "name": "Green Vista Cooperative Housing Society",
          "wings": ["Wing A", "Wing B", "Wing C"]
        }
      }
    }
  }
  ```

---

## 3. Complaint & Incident Endpoints

### 3.1. Submit Complaint (With Image)
- **Method:** `POST`
- **Route:** `/api/v1/complaints`
- **Content-Type:** `multipart/form-data`
- **Purpose:** Lodge a new waste incident complaint.
- **Required Role:** `resident`, `manager`
- **Form Fields:**
  - `category` (string, required): Enum `OVERFLOWING_BIN`, `MISSED_COLLECTION`, `UNCLEAN_ROOM`, `BAD_ODOUR`, `SEGREGATION_VIOLATION`, `OTHER`.
  - `wing` (string, required): e.g. `"Wing B"`.
  - `floorLocation` (string, required): e.g. `"Floor 4 Refuse Chute"`.
  - `description` (string, required): 10 to 1000 characters.
  - `photo` (file, optional): Binary image (`image/jpeg`, `image/png`, `image/webp`), max 5MB.
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "cmp_b1a2c3d4-e5f6-7890-abcd-1234567890ef",
      "referenceNumber": "SC-20261028-0042",
      "category": "OVERFLOWING_BIN",
      "status": "PENDING",
      "wing": "Wing B",
      "floorLocation": "Floor 4 Refuse Chute",
      "description": "Garbage bin overflowing since afternoon, foul smell spreading into the lobby.",
      "photoUrl": "/uploads/complaints/cmp_b1a2c3d4_photo.webp",
      "createdAt": "2026-10-28T22:45:00.000Z"
    }
  }
  ```
- **Error Codes:** `400 VALIDATION_FAILED`, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`.

---

### 3.2. List Society Complaints (Filtered & Paginated)
- **Method:** `GET`
- **Route:** `/api/v1/complaints`
- **Purpose:** Search and filter complaints within the manager/staff society.
- **Required Role:** `manager`, `staff`
- **Query Parameters:**
  - `status`: `ALL`, `PENDING`, `IN_PROGRESS`, `RESOLVED`, `REOPENED` (default: `ALL`).
  - `category`: Category enum (optional).
  - `wing`: Wing name string (optional).
  - `search`: Keyword string for reference number or description.
  - `page`: Integer (default: 1).
  - `limit`: Integer (default: 20, max: 100).
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cmp_b1a2c3d4-e5f6-7890-abcd-1234567890ef",
        "referenceNumber": "SC-20261028-0042",
        "category": "OVERFLOWING_BIN",
        "status": "PENDING",
        "wing": "Wing B",
        "floorLocation": "Floor 4 Refuse Chute",
        "photoUrl": "/uploads/complaints/cmp_b1a2c3d4_photo.webp",
        "resident": {
          "fullName": "Rajesh Sharma",
          "flatNumber": "B-402"
        },
        "assignedTo": null,
        "createdAt": "2026-10-28T22:45:00.000Z"
      }
    ],
    "meta": {
      "pagination": {
        "page": 1,
        "limit": 20,
        "totalItems": 1,
        "totalPages": 1
      }
    }
  }
  ```

---

### 3.3. List Current Resident's Complaints
- **Method:** `GET`
- **Route:** `/api/v1/complaints/my`
- **Purpose:** Retrieve all complaints lodged by the authenticated resident.
- **Required Role:** `resident`
- **Response (`200 OK`):** Array of complaint objects belonging exclusively to `req.user.id`.

---

### 3.4. Get Complaint Details & Timeline
- **Method:** `GET`
- **Route:** `/api/v1/complaints/:id`
- **Purpose:** Complete view of complaint, status stepper, and audit history.
- **Required Role:** Authenticated (Owner, Manager, or Assigned Staff)
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "cmp_b1a2c3d4-e5f6-7890-abcd-1234567890ef",
      "referenceNumber": "SC-20261028-0042",
      "category": "OVERFLOWING_BIN",
      "status": "IN_PROGRESS",
      "wing": "Wing B",
      "floorLocation": "Floor 4 Refuse Chute",
      "description": "Garbage bin overflowing since afternoon.",
      "photoUrl": "/uploads/complaints/cmp_b1a2c3d4_photo.webp",
      "resident": {
        "id": "u_resident_123",
        "fullName": "Rajesh Sharma",
        "flatNumber": "B-402"
      },
      "assignedTo": {
        "id": "u_staff_456",
        "fullName": "Ramesh Kumar"
      },
      "resolutionPhotoUrl": null,
      "resolutionNotes": null,
      "createdAt": "2026-10-28T22:45:00.000Z",
      "statusHistory": [
        {
          "fromStatus": null,
          "toStatus": "PENDING",
          "changedBy": "Rajesh Sharma",
          "notes": "Incident lodged",
          "timestamp": "2026-10-28T22:45:00.000Z"
        },
        {
          "fromStatus": "PENDING",
          "toStatus": "IN_PROGRESS",
          "changedBy": "Anita Deshmukh (Manager)",
          "notes": "Assigned to Ramesh Kumar",
          "timestamp": "2026-10-28T22:52:00.000Z"
        }
      ]
    }
  }
  ```

---

### 3.5. Assign Complaint to Staff
- **Method:** `PATCH`
- **Route:** `/api/v1/complaints/:id/assign`
- **Purpose:** Assign or reassign a complaint to a housekeeping staff member.
- **Required Role:** `manager`
- **Request Body:**
  ```json
  {
    "staffUserId": "u_staff_456",
    "instructions": "Please clear before 11 PM and disinfect floor."
  }
  ```
- **Response (`200 OK`):** Returns updated complaint with `status: IN_PROGRESS` and `assignedTo` object.
- **Error Codes:** `400 INVALID_STAFF_ID`, `404 COMPLAINT_NOT_FOUND`.

---

### 3.6. Resolve Complaint (With Proof)
- **Method:** `POST`
- **Route:** `/api/v1/complaints/:id/resolve`
- **Content-Type:** `multipart/form-data`
- **Purpose:** Mark complaint resolved with optional completion photo.
- **Required Role:** `staff`, `manager`
- **Form Fields:**
  - `notes` (string, optional): Notes on work performed.
  - `resolutionPhoto` (file, optional): Proof image showing cleaned area.
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "cmp_b1a2c3d4-e5f6-7890-abcd-1234567890ef",
      "status": "RESOLVED",
      "resolutionPhotoUrl": "/uploads/complaints/cmp_res_b1a2c3d4.webp",
      "resolutionNotes": "Chute cleared, new liner placed, lobby deodorized.",
      "resolvedAt": "2026-10-28T23:15:00.000Z"
    }
  }
  ```

---

### 3.7. Reopen Complaint
- **Method:** `POST`
- **Route:** `/api/v1/complaints/:id/reopen`
- **Purpose:** Resident flags that waste was not adequately cleared.
- **Required Role:** `resident` (must be ticket owner), `manager`
- **Request Body:**
  ```json
  {
    "reason": "Garbage was picked up but heavy stain and smell remain."
  }
  ```
- **Response (`200 OK`):** Complaint transitioned to `REOPENED`.
- **Validation:** Only complaints in `RESOLVED` status resolved within the last 48 hours can be reopened.

---

## 4. Waste Collection Schedule Endpoints

### 4.1. Get Society Schedule
- **Method:** `GET`
- **Route:** `/api/v1/schedules`
- **Purpose:** Retrieve weekly waste pickup timetable for the society.
- **Required Role:** Authenticated
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "sch_1",
        "wasteCategory": "WET_ORGANIC",
        "days": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        "startTime": "08:00",
        "endTime": "10:00",
        "instructions": "Place segregated green bins outside door by 7:45 AM."
      },
      {
        "id": "sch_2",
        "wasteCategory": "DRY_RECYCLABLE",
        "days": ["MON", "WED", "FRI"],
        "startTime": "10:30",
        "endTime": "12:30",
        "instructions": "Keep paper, cardboard, and clean plastics dry and unmixed."
      }
    ]
  }
  ```

### 4.2. Create Schedule Entry
- **Method:** `POST`
- **Route:** `/api/v1/schedules`
- **Purpose:** Society Manager adds a collection timetable slot.
- **Required Role:** `manager`
- **Request Body:**
  ```json
  {
    "wasteCategory": "WET_ORGANIC",
    "daysOfWeek": ["MON", "WED", "FRI"],
    "startTime": "08:00",
    "endTime": "10:00",
    "instructions": "Place green bins outside doorstep by 7:45 AM.",
    "disposalLocation": "Floor Doorstep"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "sch_123",
      "waste_category": "WET_ORGANIC",
      "days_of_week": ["MON", "WED", "FRI"],
      "start_time": "08:00",
      "end_time": "10:00",
      "instructions": "Place green bins outside doorstep by 7:45 AM.",
      "disposal_location": "Floor Doorstep"
    }
  }
  ```

### 4.3. Update Schedule Entry
- **Method:** `PUT`
- **Route:** `/api/v1/schedules/:id`
- **Purpose:** Society Manager edits an existing collection timetable slot.
- **Required Role:** `manager`
- **Request Body:**
  ```json
  {
    "wasteCategory": "WET_ORGANIC",
    "daysOfWeek": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    "startTime": "07:00",
    "endTime": "09:00",
    "instructions": "Updated door-to-door morning collection schedule.",
    "disposalLocation": "Floor Doorstep"
  }
  ```
- **Response (`200 OK`):** Returns updated schedule object with parsed `days_of_week`.
- **Validation:** Enforces 24-hr `HH:MM` time format and strict `startTime < endTime` condition.

### 4.4. Delete Schedule Entry
- **Method:** `DELETE`
- **Route:** `/api/v1/schedules/:id`
- **Purpose:** Soft-deletes a collection timetable slot (`is_active = 0`).
- **Required Role:** `manager`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": { "id": "sch_123", "deleted": true }
  }
  ```

---

## 5. Analytics & Dashboard Endpoints

### 5.1. Get Manager Analytics Overview
- **Method:** `GET`
- **Route:** `/api/v1/analytics/overview`
- **Purpose:** Computes high-level KPI cards and category distribution.
- **Required Role:** `manager`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "kpis": {
        "totalActive": 14,
        "pendingAssignment": 3,
        "inProgress": 8,
        "resolvedToday": 19,
        "overdueCount": 2,
        "averageResolutionMinutes": 84
      },
      "categoryBreakdown": {
        "OVERFLOWING_BIN": 12,
        "MISSED_COLLECTION": 4,
        "UNCLEAN_ROOM": 6,
        "BAD_ODOUR": 3,
        "SEGREGATION_VIOLATION": 5,
        "OTHER": 1
      }
    }
  }
  ```

---

## 6. Staff Management Endpoints

### 6.1. List Housekeeping Staff
- **Method:** `GET`
- **Route:** `/api/v1/users/staff`
- **Purpose:** Retrieve staff members belonging to the manager's society with workload metrics.
- **Required Role:** `manager`
- **Query Parameters:**
  - `status`: `'all'`, `'active'` (default), `'inactive'`
  - `search`: Substring search for name, email, phone, or employee ID
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "usr_987e6543-e21b-12d3-a456-426614174000",
        "full_name": "Ramesh Kumar",
        "email": "staff@greenvista.org",
        "phone": "+919876543213",
        "employee_id": "HK-001",
        "role": "staff",
        "is_active": 1,
        "active_tasks_count": 2,
        "total_completed_tasks_count": 18
      }
    ]
  }
  ```

### 6.2. Add New Staff Member
- **Method:** `POST`
- **Route:** `/api/v1/users/staff`
- **Purpose:** Create a new staff account with secure password setup.
- **Required Role:** `manager`
- **Request Body:**
  ```json
  {
    "fullName": "Suresh Patil",
    "email": "suresh.patil@greenvista.org",
    "phone": "+919876543299",
    "employeeId": "HK-002",
    "initialPassword": null
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "staff": {
        "id": "usr_...",
        "full_name": "Suresh Patil",
        "email": "suresh.patil@greenvista.org",
        "phone": "+919876543299",
        "employee_id": "HK-002",
        "is_active": 1
      },
      "temporaryPassword": "Clean@87279BB4"
    }
  }
  ```
- **Error Codes:** `400 VALIDATION_FAILED`, `409 EMAIL_ALREADY_EXISTS`, `409 EMPLOYEE_ID_ALREADY_EXISTS`.

### 6.3. Edit Staff Member
- **Method:** `PUT`
- **Route:** `/api/v1/users/staff/:id`
- **Purpose:** Update staff member contact details or employee ID.
- **Required Role:** `manager`

### 6.4. Activate or Deactivate Staff
- **Method:** `PATCH`
- **Route:** `/api/v1/users/staff/:id/status`
- **Purpose:** Toggle staff employment status. Deactivation is safely rejected if active tasks are in progress.
- **Required Role:** `manager`
- **Request Body:** `{ "isActive": false }`
- **Error Codes:** `400 HAS_ACTIVE_TASKS` ("Cannot deactivate staff member because they have active assigned tasks"), `404 STAFF_NOT_FOUND`.

