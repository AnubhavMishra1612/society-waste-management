import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';
import Database from 'better-sqlite3';
import { initDatabase } from '../../src/server/db/schema.js';
import { seedDatabase } from '../../src/server/db/seed.js';

describe('SocietyClean End-to-End API & Business Logic Integration Suite', () => {
  let app;
  let db;
  let residentToken;
  let managerToken;
  let staffToken;
  let createdComplaintId;
  let createdRefNumber;

  beforeAll(() => {
    // In-memory SQLite database for deterministic test execution
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Run schema creation on test database
    initDatabase(':memory:');
    
    // We create the real schema in our test db
    db.exec(`
      CREATE TABLE IF NOT EXISTS societies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        wings_config TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        society_id TEXT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'resident',
        phone TEXT,
        employee_id TEXT,
        wing TEXT,
        flat_number TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (society_id) REFERENCES societies(id)
      );

      CREATE TABLE IF NOT EXISTS complaints (
        id TEXT PRIMARY KEY,
        society_id TEXT NOT NULL,
        reference_number TEXT UNIQUE NOT NULL,
        resident_id TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        wing TEXT NOT NULL,
        floor_location TEXT NOT NULL,
        photo_url TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        assigned_to_user_id TEXT,
        resolution_photo_url TEXT,
        resolution_notes TEXT,
        resolved_at TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (society_id) REFERENCES societies(id),
        FOREIGN KEY (resident_id) REFERENCES users(id),
        FOREIGN KEY (assigned_to_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS status_history (
        id TEXT PRIMARY KEY,
        complaint_id TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT NOT NULL,
        changed_by_user_id TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS collection_schedules (
        id TEXT PRIMARY KEY,
        society_id TEXT NOT NULL,
        waste_category TEXT NOT NULL,
        days_of_week TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        instructions TEXT,
        disposal_location TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (society_id) REFERENCES societies(id)
      );
    `);

    // Seed test database
    seedDatabase(db);

    const appObj = createApp(db);
    app = appObj.app;
  });

  it('TC-AUTH-01: Resident can login and receive JWT with role resident', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'resident@greenvista.org',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('resident');
    expect(res.body.data.token).toBeDefined();
    residentToken = res.body.data.token;
  });

  it('TC-AUTH-02: Manager can login and receive JWT with role manager', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'manager@greenvista.org',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('manager');
    managerToken = res.body.data.token;
  });

  it('TC-AUTH-03: Staff can login and receive JWT with role staff', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'staff@greenvista.org',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('staff');
    staffToken = res.body.data.token;
  });

  it('TC-AUTH-04: Invalid credentials return 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'resident@greenvista.org',
        password: 'WrongPassword!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('TC-COMP-01: Resident can submit a waste complaint with valid data and persistence', async () => {
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: 'OVERFLOWING_BIN',
        description: 'Large garbage bin overflowing with compostable waste on 5th floor landing.',
        wing: 'Wing B',
        floorLocation: 'Floor 5 Garbage Chute'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reference_number).toMatch(/^SC-\d{8}-[A-Z0-9]{4}$/);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.category).toBe('OVERFLOWING_BIN');

    createdComplaintId = res.body.data.id;
    createdRefNumber = res.body.data.reference_number;

    // Verify persistence directly in SQLite DB
    const dbRecord = db.prepare('SELECT * FROM complaints WHERE id = ?').get(createdComplaintId);
    expect(dbRecord).toBeDefined();
    expect(dbRecord.reference_number).toBe(createdRefNumber);
    expect(dbRecord.status).toBe('PENDING');
  });

  it('TC-COMP-02: Submitting complaint with short description (<10 chars) fails validation', async () => {
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: 'OVERFLOWING_BIN',
        description: 'Smelly',
        wing: 'Wing B',
        floorLocation: 'Floor 2'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('TC-COMP-03: Resident can see their newly submitted complaint in /my list', async () => {
    const res = await request(app)
      .get('/api/v1/complaints/my')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find(c => c.id === createdComplaintId);
    expect(found).toBeDefined();
    expect(found.status).toBe('PENDING');
  });

  it('TC-RBAC-01: Resident is forbidden from viewing manager analytics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('TC-MGR-01: Society Manager can view all complaints and filter by status', async () => {
    const res = await request(app)
      .get('/api/v1/complaints?status=PENDING')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data.find(c => c.id === createdComplaintId);
    expect(found).toBeDefined();
  });

  it('TC-MGR-02: Society Manager can view operational analytics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kpis.pendingAssignment).toBeGreaterThanOrEqual(1);
  });

  it('TC-WORK-01: Manager assigns complaint to housekeeping staff -> transitions to IN_PROGRESS', async () => {
    // Get staff id
    const staffUser = db.prepare("SELECT id FROM users WHERE email = 'staff@greenvista.org'").get();

    const res = await request(app)
      .patch(`/api/v1/complaints/${createdComplaintId}/assign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        staffUserId: staffUser.id,
        instructions: 'Clear bin and sanitize floor promptly'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('IN_PROGRESS');
    expect(res.body.data.assigned_to_user_id).toBe(staffUser.id);

    // Verify audit trail recorded in status_history
    const history = db.prepare('SELECT * FROM status_history WHERE complaint_id = ? ORDER BY created_at DESC').all(createdComplaintId);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].to_status).toBe('IN_PROGRESS');
  });

  it('TC-WORK-02: Staff marks complaint RESOLVED with resolution notes', async () => {
    const res = await request(app)
      .post(`/api/v1/complaints/${createdComplaintId}/resolve`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        resolutionNotes: 'Cleared overflowing waste, bleached floor, and inserted heavy duty fresh liner.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.resolution_notes).toContain('Cleared overflowing waste');
    expect(res.body.data.resolved_at).toBeDefined();
  });

  it('TC-WORK-03: Resident views updated complaint and sees RESOLVED status and notes', async () => {
    const res = await request(app)
      .get(`/api/v1/complaints/${createdComplaintId}`)
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.resolution_notes).toContain('bleached floor');
    expect(res.body.data.statusHistory.some(h => h.to_status === 'RESOLVED')).toBe(true);
  });

  it('TC-WORK-04: Resident reopens resolved complaint within 48 hours', async () => {
    const res = await request(app)
      .post(`/api/v1/complaints/${createdComplaintId}/reopen`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        reason: 'Trash bag was removed but grease stain and bad smell remain.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REOPENED');

    // Verify audit history
    const history = db.prepare("SELECT * FROM status_history WHERE complaint_id = ? AND to_status = 'REOPENED'").get(createdComplaintId);
    expect(history).toBeDefined();
    expect(history.notes).toContain('grease stain');
  });

  it('TC-SCHED-01: Authenticated users can view society collection timetable', async () => {
    const res = await request(app)
      .get('/api/v1/schedules')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].waste_category).toBe('WET_ORGANIC');
  });

  // ==========================================
  // STAFF MANAGEMENT TEST SUITE
  // ==========================================
  let newStaffId;
  let newStaffEmail = 'suresh.sanitation@greenvista.org';
  let newStaffTempPassword;

  it('TC-STAFF-01: Manager successfully creates a new housekeeping staff member', async () => {
    const res = await request(app)
      .post('/api/v1/users/staff')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        fullName: 'Suresh Patil',
        email: newStaffEmail,
        phone: '+919876543299',
        employeeId: 'EMP-0042'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.staff.full_name).toBe('Suresh Patil');
    expect(res.body.data.staff.email).toBe(newStaffEmail);
    expect(res.body.data.staff.employee_id).toBe('EMP-0042');
    expect(res.body.data.staff.is_active).toBe(1);
    expect(res.body.data.temporaryPassword).toBeDefined();

    newStaffId = res.body.data.staff.id;
    newStaffTempPassword = res.body.data.temporaryPassword;

    // Verify in database
    const dbStaff = db.prepare('SELECT * FROM users WHERE id = ?').get(newStaffId);
    expect(dbStaff).toBeDefined();
    expect(dbStaff.full_name).toBe('Suresh Patil');
    expect(dbStaff.password_hash).not.toBe(newStaffTempPassword); // Hashed, not plaintext!
  });

  it('TC-STAFF-02: Creating staff with invalid input is rejected', async () => {
    // Missing fullName
    const res1 = await request(app)
      .post('/api/v1/users/staff')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        email: 'invalid@example.com'
      });
    expect(res1.status).toBe(400);
    expect(res1.body.error.code).toBe('VALIDATION_FAILED');

    // Invalid email format
    const res2 = await request(app)
      .post('/api/v1/users/staff')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        fullName: 'Test Staff',
        email: 'not-an-email'
      });
    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('TC-STAFF-03: Duplicate email is rejected with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/users/staff')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        fullName: 'Duplicate Suresh',
        email: newStaffEmail // Already exists
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('TC-STAFF-04: Staff records persist and are retrieved by Manager', async () => {
    const res = await request(app)
      .get('/api/v1/users/staff?status=all')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const created = res.body.data.find(s => s.id === newStaffId);
    expect(created).toBeDefined();
    expect(created.employee_id).toBe('EMP-0042');
    expect(created.active_tasks_count).toBe(0);
  });

  it('TC-STAFF-05: Manager can edit staff details', async () => {
    const res = await request(app)
      .put(`/api/v1/users/staff/${newStaffId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        fullName: 'Suresh B. Patil',
        phone: '+919876543200',
        employeeId: 'EMP-0042-SR'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.full_name).toBe('Suresh B. Patil');
    expect(res.body.data.phone).toBe('+919876543200');
    expect(res.body.data.employee_id).toBe('EMP-0042-SR');
  });

  it('TC-STAFF-06: Resident cannot access staff management endpoints (403 Forbidden)', async () => {
    const resGet = await request(app)
      .get('/api/v1/users/staff')
      .set('Authorization', `Bearer ${residentToken}`);
    expect(resGet.status).toBe(403);
    expect(resGet.body.error.code).toBe('FORBIDDEN');

    const resPost = await request(app)
      .post('/api/v1/users/staff')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ fullName: 'Hacker', email: 'hacker@example.com' });
    expect(resPost.status).toBe(403);
  });

  it('TC-STAFF-07: Manager cannot manage staff from another society', async () => {
    // Create a separate society and staff in that society
    const otherSocId = 'soc_other_123';
    const otherStaffId = 'usr_other_staff';
    db.prepare(`
      INSERT INTO societies (id, name, code, address, city)
      VALUES (?, 'Other Society', 'OTHER-01', 'Address', 'Pune')
    `).run(otherSocId);

    db.prepare(`
      INSERT INTO users (id, society_id, full_name, email, password_hash, role, is_active)
      VALUES (?, ?, 'Foreign Staff', 'foreign@other.org', 'hash', 'staff', 1)
    `).run(otherStaffId, otherSocId);

    // Green Vista manager attempts to edit foreign staff
    const res = await request(app)
      .put(`/api/v1/users/staff/${otherStaffId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ fullName: 'Malicious Rename' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('STAFF_NOT_FOUND');
  });

  it('TC-STAFF-08: Deactivating staff with active tasks is rejected', async () => {
    // Assign a task to Suresh first
    const complaintRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: 'BAD_ODOUR',
        description: 'Foul garbage odour in Wing C basement parking lot.',
        wing: 'Wing C',
        floorLocation: 'Basement Parking'
      });
    const cId = complaintRes.body.data.id;

    // Assign to Suresh
    await request(app)
      .patch(`/api/v1/complaints/${cId}/assign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ staffUserId: newStaffId, instructions: 'Inspect basement' });

    // Try to deactivate Suresh while task is in progress
    const res = await request(app)
      .patch(`/api/v1/users/staff/${newStaffId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('HAS_ACTIVE_TASKS');
    expect(res.body.error.message).toContain('active assigned task');

    // Clean up task by resolving it so Suresh has 0 open tasks
    await request(app)
      .post(`/api/v1/complaints/${cId}/resolve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ resolutionNotes: 'Manager resolved basement task.' });
  });

  it('TC-STAFF-09: Manager deactivates staff with 0 active tasks', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/staff/${newStaffId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isActive).toBe(false);

    // Verify in database
    const dbRecord = db.prepare('SELECT is_active FROM users WHERE id = ?').get(newStaffId);
    expect(dbRecord.is_active).toBe(0);
  });

  it('TC-STAFF-10: Inactive staff cannot receive new task assignments', async () => {
    // Create new complaint
    const cmpRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: 'UNCLEAN_ROOM',
        description: 'Floor 1 garbage chute requires mop and bleaching.',
        wing: 'Wing A',
        floorLocation: 'Floor 1'
      });
    const cmpId = cmpRes.body.data.id;

    // Try to assign to deactivated Suresh
    const res = await request(app)
      .patch(`/api/v1/complaints/${cmpId}/assign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ staffUserId: newStaffId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.message).toContain('inactive');
  });

  it('TC-STAFF-11: Newly created staff member can log in using temporary password', async () => {
    // Re-activate Suresh for login test
    await request(app)
      .patch(`/api/v1/users/staff/${newStaffId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ isActive: true });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: newStaffEmail,
        password: newStaffTempPassword
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.role).toBe('staff');
    expect(loginRes.body.data.token).toBeDefined();
  });

  // ==========================================
  // COLLECTION SCHEDULE MANAGEMENT TEST SUITE
  // ==========================================
  let testScheduleId;

  it('TC-SCHED-02: Manager edits collection schedule slot -> persists in SQLite', async () => {
    // Get existing schedule
    const listRes = await request(app)
      .get('/api/v1/schedules')
      .set('Authorization', `Bearer ${managerToken}`);

    testScheduleId = listRes.body.data[0].id;

    const res = await request(app)
      .put(`/api/v1/schedules/${testScheduleId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        wasteCategory: 'WET_ORGANIC',
        daysOfWeek: ['MON', 'WED', 'FRI', 'SUN'],
        startTime: '07:30',
        endTime: '09:30',
        instructions: 'Revised: Place green organic bins by 7:15 AM outside door.',
        disposalLocation: 'Floor Collection Chutes'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.start_time).toBe('07:30');
    expect(res.body.data.end_time).toBe('09:30');
    expect(res.body.data.days_of_week).toEqual(['MON', 'WED', 'FRI', 'SUN']);
    expect(res.body.data.instructions).toContain('Revised: Place green organic');
    expect(res.body.data.disposal_location).toBe('Floor Collection Chutes');

    // Resident refreshes and sees the updated schedule
    const residentCheck = await request(app)
      .get('/api/v1/schedules')
      .set('Authorization', `Bearer ${residentToken}`);

    const updatedSlot = residentCheck.body.data.find(s => s.id === testScheduleId);
    expect(updatedSlot).toBeDefined();
    expect(updatedSlot.start_time).toBe('07:30');
    expect(updatedSlot.days_of_week).toEqual(['MON', 'WED', 'FRI', 'SUN']);
  });

  it('TC-SCHED-03: Invalid schedule times (start >= end) are rejected with 400', async () => {
    const res = await request(app)
      .put(`/api/v1/schedules/${testScheduleId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        wasteCategory: 'WET_ORGANIC',
        daysOfWeek: ['MON'],
        startTime: '10:00',
        endTime: '08:00', // Invalid: end before start!
        instructions: 'Test invalid times'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('TC-SCHED-04: Non-manager (resident/staff) forbidden from editing schedule (403 Forbidden)', async () => {
    const resResident = await request(app)
      .put(`/api/v1/schedules/${testScheduleId}`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        wasteCategory: 'DRY_RECYCLABLE',
        daysOfWeek: ['TUE'],
        startTime: '09:00',
        endTime: '11:00'
      });

    expect(resResident.status).toBe(403);
    expect(resResident.body.error.code).toBe('FORBIDDEN');

    const resStaff = await request(app)
      .put(`/api/v1/schedules/${testScheduleId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        wasteCategory: 'DRY_RECYCLABLE',
        daysOfWeek: ['TUE'],
        startTime: '09:00',
        endTime: '11:00'
      });

    expect(resStaff.status).toBe(403);
    expect(resStaff.body.error.code).toBe('FORBIDDEN');
  });

  it('TC-SCHED-05: Manager adds a new collection schedule slot', async () => {
    const res = await request(app)
      .post('/api/v1/schedules')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        wasteCategory: 'GARDEN_PRUNINGS',
        daysOfWeek: ['THU'],
        startTime: '14:00',
        endTime: '16:00',
        instructions: 'Bundle trimmed branches and leaves near garden compost pit.',
        disposalLocation: 'East Garden Pit'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.waste_category).toBe('GARDEN_PRUNINGS');

    const newId = res.body.data.id;

    // Verify it appears in society schedule list
    const checkRes = await request(app)
      .get('/api/v1/schedules')
      .set('Authorization', `Bearer ${residentToken}`);
    expect(checkRes.body.data.some(s => s.id === newId)).toBe(true);

    // Clean up with TC-SCHED-06 deletion
    const delRes = await request(app)
      .delete(`/api/v1/schedules/${newId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deleted).toBe(true);
  });

  it('TC-SCHED-06: Manager cannot edit schedule of another society (404 Not Found)', async () => {
    // Schedule from other society created in earlier test
    const foreignScheduleId = 'sch_foreign_999';
    db.prepare(`
      INSERT INTO collection_schedules (id, society_id, waste_category, days_of_week, start_time, end_time)
      VALUES (?, 'soc_other_123', 'WET_ORGANIC', '["MON"]', '08:00', '10:00')
    `).run(foreignScheduleId);

    const res = await request(app)
      .put(`/api/v1/schedules/${foreignScheduleId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        wasteCategory: 'WET_ORGANIC',
        daysOfWeek: ['TUE'],
        startTime: '08:00',
        endTime: '10:00'
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

