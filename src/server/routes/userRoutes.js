import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, requireRole } from '../middleware/auth.js';

export function createUserRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  // Email format validator regex
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Helper to generate secure random temporary password
  function generateTemporaryPassword() {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `Clean@${randomHex}`;
  }

  // GET /api/v1/users/staff (Manager gets staff list with filters and workload counts)
  router.get('/staff', requireRole(['manager']), (req, res) => {
    try {
      const { status = 'active', search } = req.query;

      let sql = `
        SELECT 
          u.id, 
          u.full_name, 
          u.email, 
          u.phone, 
          u.employee_id,
          u.role,
          u.is_active, 
          u.created_at,
          u.updated_at,
          COUNT(CASE WHEN c.status = 'IN_PROGRESS' AND c.deleted_at IS NULL THEN 1 END) as active_tasks_count,
          COUNT(CASE WHEN c.status = 'RESOLVED' AND c.deleted_at IS NULL THEN 1 END) as total_completed_tasks_count
        FROM users u
        LEFT JOIN complaints c ON u.id = c.assigned_to_user_id
        WHERE u.society_id = ? AND u.role = 'staff'
      `;
      const params = [req.societyId];

      if (status === 'active') {
        sql += ' AND u.is_active = 1';
      } else if (status === 'inactive') {
        sql += ' AND u.is_active = 0';
      } // if 'all', do not filter on is_active

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.employee_id LIKE ?)';
        params.push(term, term, term, term);
      }

      sql += ' GROUP BY u.id ORDER BY u.is_active DESC, u.full_name ASC';

      const staffList = db.prepare(sql).all(...params);

      return res.status(200).json({
        success: true,
        data: staffList,
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      console.error('Error fetching staff list:', err);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: err.message }
      });
    }
  });

  // POST /api/v1/users/staff (Manager creates new staff member)
  router.post('/staff', requireRole(['manager']), (req, res) => {
    try {
      const { fullName, email, phone, employeeId, initialPassword } = req.body;

      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'Full name is required and must be at least 2 characters long' }
        });
      }

      if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'A valid email address is required' }
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if email already in use
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (existing) {
        return res.status(409).json({
          success: false,
          data: null,
          error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email address already exists.' }
        });
      }

      // Check if employeeId already in use within this society (if provided)
      if (employeeId && employeeId.trim()) {
        const existingEmp = db.prepare('SELECT id FROM users WHERE society_id = ? AND employee_id = ?').get(req.societyId, employeeId.trim());
        if (existingEmp) {
          return res.status(409).json({
            success: false,
            data: null,
            error: { code: 'EMPLOYEE_ID_ALREADY_EXISTS', message: 'A staff member with this Employee ID already exists in this society.' }
          });
        }
      }

      // Secure password generation if not provided
      const rawPassword = initialPassword && initialPassword.trim().length >= 8
        ? initialPassword.trim()
        : generateTemporaryPassword();

      const passwordHash = bcrypt.hashSync(rawPassword, 10);
      const staffId = 'usr_' + uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (
          id, society_id, full_name, email, password_hash, role,
          phone, employee_id, wing, flat_number, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'staff', ?, ?, NULL, NULL, 1, ?, ?)
      `).run(
        staffId,
        req.societyId,
        fullName.trim(),
        normalizedEmail,
        passwordHash,
        phone ? phone.trim() : null,
        employeeId ? employeeId.trim() : null,
        now,
        now
      );

      const createdStaff = db.prepare(`
        SELECT id, full_name, email, phone, employee_id, role, is_active, created_at, updated_at
        FROM users WHERE id = ?
      `).get(staffId);

      return res.status(201).json({
        success: true,
        data: {
          staff: {
            ...createdStaff,
            active_tasks_count: 0,
            total_completed_tasks_count: 0
          },
          temporaryPassword: rawPassword
        },
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      console.error('Error creating staff member:', err);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: err.message }
      });
    }
  });

  // PUT /api/v1/users/staff/:id (Manager updates staff details)
  router.put('/staff/:id', requireRole(['manager']), (req, res) => {
    try {
      const { id } = req.params;
      const { fullName, email, phone, employeeId } = req.body;

      const staff = db.prepare("SELECT * FROM users WHERE id = ? AND society_id = ? AND role = 'staff'").get(id, req.societyId);
      if (!staff) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { code: 'STAFF_NOT_FOUND', message: 'Staff member not found in your society' }
        });
      }

      const updates = {};
      if (fullName !== undefined) {
        if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
          return res.status(400).json({
            success: false,
            data: null,
            error: { code: 'VALIDATION_FAILED', message: 'Full name must be at least 2 characters long' }
          });
        }
        updates.full_name = fullName.trim();
      }

      if (email !== undefined) {
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
          return res.status(400).json({
            success: false,
            data: null,
            error: { code: 'VALIDATION_FAILED', message: 'A valid email address is required' }
          });
        }
        const normalized = email.trim().toLowerCase();
        if (normalized !== staff.email) {
          const duplicate = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(normalized, id);
          if (duplicate) {
            return res.status(409).json({
              success: false,
              data: null,
              error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email address already exists.' }
            });
          }
        }
        updates.email = normalized;
      }

      if (phone !== undefined) {
        updates.phone = phone ? phone.trim() : null;
      }

      if (employeeId !== undefined) {
        const empId = employeeId ? employeeId.trim() : null;
        if (empId && empId !== staff.employee_id) {
          const duplicateEmp = db.prepare('SELECT id FROM users WHERE society_id = ? AND employee_id = ? AND id != ?').get(req.societyId, empId, id);
          if (duplicateEmp) {
            return res.status(409).json({
              success: false,
              data: null,
              error: { code: 'EMPLOYEE_ID_ALREADY_EXISTS', message: 'Another staff member in this society already has this Employee ID.' }
            });
          }
        }
        updates.employee_id = empId;
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            email = COALESCE(?, email),
            phone = ?,
            employee_id = ?,
            updated_at = ?
        WHERE id = ? AND society_id = ?
      `).run(
        updates.full_name || staff.full_name,
        updates.email || staff.email,
        updates.phone !== undefined ? updates.phone : staff.phone,
        updates.employee_id !== undefined ? updates.employee_id : staff.employee_id,
        now,
        id,
        req.societyId
      );

      const updated = db.prepare(`
        SELECT 
          u.id, u.full_name, u.email, u.phone, u.employee_id, u.role, u.is_active, u.created_at, u.updated_at,
          COUNT(CASE WHEN c.status = 'IN_PROGRESS' AND c.deleted_at IS NULL THEN 1 END) as active_tasks_count,
          COUNT(CASE WHEN c.status = 'RESOLVED' AND c.deleted_at IS NULL THEN 1 END) as total_completed_tasks_count
        FROM users u
        LEFT JOIN complaints c ON u.id = c.assigned_to_user_id
        WHERE u.id = ? AND u.society_id = ?
        GROUP BY u.id
      `).get(id, req.societyId);

      return res.status(200).json({
        success: true,
        data: updated,
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      console.error('Error updating staff member:', err);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: err.message }
      });
    }
  });

  // PATCH /api/v1/users/staff/:id/status (Manager activates or deactivates staff)
  router.patch('/staff/:id/status', requireRole(['manager']), (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'isActive boolean flag is required' }
        });
      }

      const staff = db.prepare("SELECT id, full_name, is_active FROM users WHERE id = ? AND society_id = ? AND role = 'staff'").get(id, req.societyId);
      if (!staff) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { code: 'STAFF_NOT_FOUND', message: 'Staff member not found in your society' }
        });
      }

      // If deactivating, prevent removal if they have unresolved tasks
      if (!isActive) {
        const activeTasks = db.prepare(`
          SELECT COUNT(*) as count 
          FROM complaints 
          WHERE assigned_to_user_id = ? AND status = 'IN_PROGRESS' AND deleted_at IS NULL
        `).get(id).count;

        if (activeTasks > 0) {
          return res.status(400).json({
            success: false,
            data: null,
            error: {
              code: 'HAS_ACTIVE_TASKS',
              message: `Cannot deactivate staff member '${staff.full_name}' because they have ${activeTasks} active assigned task(s). Please reassign their open tasks before deactivating.`
            }
          });
        }
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users
        SET is_active = ?, updated_at = ?
        WHERE id = ? AND society_id = ?
      `).run(isActive ? 1 : 0, now, id, req.societyId);

      return res.status(200).json({
        success: true,
        data: {
          id,
          fullName: staff.full_name,
          isActive
        },
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      console.error('Error changing staff status:', err);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: err.message }
      });
    }
  });

  return router;
}
