import { v4 as uuidv4 } from 'uuid';

export class ComplaintService {
  constructor(db) {
    this.db = db;
  }

  generateReferenceNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SC-${dateStr}-${randPart}`;
  }

  createComplaint({ societyId, residentId, category, description, wing, floorLocation, photoUrl }) {
    if (!category || !description || !wing || !floorLocation) {
      const err = new Error('Category, description, wing, and floor location are required.');
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    if (description.trim().length < 10) {
      const err = new Error('Description must be at least 10 characters long.');
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    const complaintId = 'cmp_' + uuidv4();
    let refNum = this.generateReferenceNumber();

    // Ensure reference number uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const exists = this.db.prepare('SELECT id FROM complaints WHERE reference_number = ?').get(refNum);
      if (!exists) break;
      refNum = this.generateReferenceNumber();
      attempts++;
    }

    const now = new Date().toISOString();

    const insertComplaint = this.db.prepare(`
      INSERT INTO complaints (
        id, society_id, reference_number, resident_id, category, description,
        wing, floor_location, photo_url, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `);

    const insertHistory = this.db.prepare(`
      INSERT INTO status_history (
        id, complaint_id, from_status, to_status, changed_by_user_id, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertComplaint.run(
        complaintId,
        societyId,
        refNum,
        residentId,
        category,
        description.trim(),
        wing,
        floorLocation,
        photoUrl || null,
        now,
        now
      );

      insertHistory.run(
        'sth_' + uuidv4(),
        complaintId,
        null,
        'PENDING',
        residentId,
        'Incident reported by resident',
        now
      );
    });

    transaction();

    return this.getComplaintById(complaintId, societyId, residentId, 'resident');
  }

  listComplaints({ societyId, residentId = null, assignedStaffId = null, status = null, category = null, wing = null, search = null, page = 1, limit = 20 }) {
    let sql = `
      SELECT 
        c.*,
        u.full_name as resident_name,
        u.flat_number as resident_flat,
        s.full_name as assigned_staff_name
      FROM complaints c
      JOIN users u ON c.resident_id = u.id
      LEFT JOIN users s ON c.assigned_to_user_id = s.id
      WHERE c.society_id = ? AND c.deleted_at IS NULL
    `;
    const params = [societyId];

    if (residentId) {
      sql += ' AND c.resident_id = ?';
      params.push(residentId);
    }

    if (assignedStaffId) {
      sql += ' AND c.assigned_to_user_id = ?';
      params.push(assignedStaffId);
    }

    if (status && status !== 'ALL') {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    if (category && category !== 'ALL') {
      sql += ' AND c.category = ?';
      params.push(category);
    }

    if (wing && wing !== 'ALL') {
      sql += ' AND c.wing = ?';
      params.push(wing);
    }

    if (search && search.trim()) {
      sql += ' AND (c.reference_number LIKE ? OR c.description LIKE ? OR c.floor_location LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY c.created_at DESC';

    // Pagination
    const offset = (Math.max(1, page) - 1) * limit;
    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const rows = this.db.prepare(paginatedSql).all(...params, limit, offset);

    // Count
    let countSql = `
      SELECT COUNT(*) as total 
      FROM complaints c
      WHERE c.society_id = ? AND c.deleted_at IS NULL
    `;
    const countParams = [societyId];
    if (residentId) {
      countSql += ' AND c.resident_id = ?';
      countParams.push(residentId);
    }
    if (assignedStaffId) {
      countSql += ' AND c.assigned_to_user_id = ?';
      countParams.push(assignedStaffId);
    }
    if (status && status !== 'ALL') {
      countSql += ' AND c.status = ?';
      countParams.push(status);
    }
    if (category && category !== 'ALL') {
      countSql += ' AND c.category = ?';
      countParams.push(category);
    }
    if (wing && wing !== 'ALL') {
      countSql += ' AND c.wing = ?';
      countParams.push(wing);
    }
    if (search && search.trim()) {
      countSql += ' AND (c.reference_number LIKE ? OR c.description LIKE ? OR c.floor_location LIKE ?)';
      const s = `%${search.trim()}%`;
      countParams.push(s, s, s);
    }

    const total = this.db.prepare(countSql).get(...countParams).total;

    return {
      complaints: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  getComplaintById(id, societyId, userId, role) {
    const complaint = this.db.prepare(`
      SELECT 
        c.*,
        u.full_name as resident_name,
        u.flat_number as resident_flat,
        u.phone as resident_phone,
        s.full_name as assigned_staff_name,
        s.phone as assigned_staff_phone
      FROM complaints c
      JOIN users u ON c.resident_id = u.id
      LEFT JOIN users s ON c.assigned_to_user_id = s.id
      WHERE c.id = ? AND c.society_id = ? AND c.deleted_at IS NULL
    `).get(id, societyId);

    if (!complaint) {
      const err = new Error('Complaint not found or belongs to another society.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Role BOLA check: if resident, can only view own complaints
    if (role === 'resident' && complaint.resident_id !== userId) {
      const err = new Error('Unauthorized to view this complaint.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Fetch history
    const history = this.db.prepare(`
      SELECT 
        sh.*,
        u.full_name as changed_by_name,
        u.role as changed_by_role
      FROM status_history sh
      JOIN users u ON sh.changed_by_user_id = u.id
      WHERE sh.complaint_id = ?
      ORDER BY sh.created_at ASC
    `).all(id);

    return {
      ...complaint,
      statusHistory: history
    };
  }

  assignComplaint({ id, societyId, managerId, staffUserId, instructions }) {
    const complaint = this.db.prepare('SELECT * FROM complaints WHERE id = ? AND society_id = ?').get(id, societyId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const staffUser = this.db.prepare('SELECT id, full_name, role, is_active FROM users WHERE id = ? AND society_id = ?').get(staffUserId, societyId);
    if (!staffUser || staffUser.role !== 'staff') {
      const err = new Error('Invalid staff user specified for assignment.');
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    if (!staffUser.is_active) {
      const err = new Error('Cannot assign task to an inactive staff member.');
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    const now = new Date().toISOString();
    const prevStatus = complaint.status;
    const newStatus = 'IN_PROGRESS';

    const transaction = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE complaints
        SET status = ?, assigned_to_user_id = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, staffUserId, now, id);

      this.db.prepare(`
        INSERT INTO status_history (
          id, complaint_id, from_status, to_status, changed_by_user_id, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'sth_' + uuidv4(),
        id,
        prevStatus,
        newStatus,
        managerId,
        instructions ? `Assigned to ${staffUser.full_name}: ${instructions}` : `Assigned to ${staffUser.full_name}`,
        now
      );
    });

    transaction();
    return this.getComplaintById(id, societyId, managerId, 'manager');
  }

  updateStatus({ id, societyId, userId, userRole, newStatus, notes }) {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      const err = new Error(`Invalid status: ${newStatus}`);
      err.code = 'VALIDATION_FAILED';
      throw err;
    }

    const complaint = this.db.prepare('SELECT * FROM complaints WHERE id = ? AND society_id = ?').get(id, societyId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    // State machine transitions:
    // PENDING -> IN_PROGRESS, CANCELLED
    // IN_PROGRESS -> RESOLVED, PENDING, CANCELLED
    // RESOLVED -> REOPENED
    // REOPENED -> IN_PROGRESS, RESOLVED
    const allowedTransitions = {
      PENDING: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['RESOLVED', 'PENDING', 'CANCELLED'],
      RESOLVED: ['REOPENED'],
      REOPENED: ['IN_PROGRESS', 'RESOLVED'],
      CANCELLED: ['PENDING']
    };

    if (!allowedTransitions[complaint.status]?.includes(newStatus) && complaint.status !== newStatus) {
      const err = new Error(`Illegal state transition from ${complaint.status} to ${newStatus}`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }

    const now = new Date().toISOString();
    const resolvedAt = newStatus === 'RESOLVED' ? now : complaint.resolved_at;

    const transaction = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE complaints
        SET status = ?, resolved_at = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, resolvedAt, now, id);

      this.db.prepare(`
        INSERT INTO status_history (
          id, complaint_id, from_status, to_status, changed_by_user_id, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'sth_' + uuidv4(),
        id,
        complaint.status,
        newStatus,
        userId,
        notes || `Status transitioned to ${newStatus}`,
        now
      );
    });

    transaction();
    return this.getComplaintById(id, societyId, userId, userRole);
  }

  resolveComplaint({ id, societyId, userId, userRole, resolutionPhotoUrl = null, resolutionNotes = null }) {
    const complaint = this.db.prepare('SELECT * FROM complaints WHERE id = ? AND society_id = ?').get(id, societyId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (userRole === 'staff' && complaint.assigned_to_user_id !== userId) {
      const err = new Error('Unauthorized: You can only resolve tasks assigned to you.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const now = new Date().toISOString();
    const transaction = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE complaints
        SET status = 'RESOLVED',
            resolution_photo_url = ?,
            resolution_notes = ?,
            resolved_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(resolutionPhotoUrl || null, resolutionNotes || 'Cleaned and verified.', now, now, id);

      this.db.prepare(`
        INSERT INTO status_history (
          id, complaint_id, from_status, to_status, changed_by_user_id, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'sth_' + uuidv4(),
        id,
        complaint.status,
        'RESOLVED',
        userId,
        resolutionNotes ? `Marked resolved: ${resolutionNotes}` : 'Task completed and resolved',
        now
      );
    });

    transaction();
    return this.getComplaintById(id, societyId, userId, userRole);
  }

  reopenComplaint({ id, societyId, residentId, reason }) {
    const complaint = this.db.prepare('SELECT * FROM complaints WHERE id = ? AND society_id = ?').get(id, societyId);
    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (complaint.resident_id !== residentId) {
      const err = new Error('Only the reporting resident can reopen this complaint.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (complaint.status !== 'RESOLVED') {
      const err = new Error('Only resolved complaints can be reopened.');
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }

    // Check 48h limit
    if (complaint.resolved_at) {
      const resolvedTime = new Date(complaint.resolved_at).getTime();
      const diffHours = (Date.now() - resolvedTime) / (1000 * 60 * 60);
      if (diffHours > 48) {
        const err = new Error('Complaints cannot be reopened after 48 hours from resolution.');
        err.code = 'WINDOW_EXPIRED';
        throw err;
      }
    }

    const now = new Date().toISOString();
    const transaction = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE complaints
        SET status = 'REOPENED', updated_at = ?
        WHERE id = ?
      `).run(now, id);

      this.db.prepare(`
        INSERT INTO status_history (
          id, complaint_id, from_status, to_status, changed_by_user_id, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'sth_' + uuidv4(),
        id,
        'RESOLVED',
        'REOPENED',
        residentId,
        `Reopened by resident: ${reason || 'Waste issue persists'}`,
        now
      );
    });

    transaction();
    return this.getComplaintById(id, societyId, residentId, 'resident');
  }

  getAnalyticsOverview(societyId) {
    const counts = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'REOPENED' THEN 1 ELSE 0 END) as reopened
      FROM complaints
      WHERE society_id = ? AND deleted_at IS NULL
    `).get(societyId);

    const categories = this.db.prepare(`
      SELECT category, COUNT(*) as count
      FROM complaints
      WHERE society_id = ? AND deleted_at IS NULL
      GROUP BY category
    `).all(societyId);

    const categoryBreakdown = {};
    categories.forEach(c => {
      categoryBreakdown[c.category] = c.count;
    });

    return {
      kpis: {
        totalActive: (counts.pending || 0) + (counts.in_progress || 0) + (counts.reopened || 0),
        pendingAssignment: counts.pending || 0,
        inProgress: counts.in_progress || 0,
        resolvedTotal: counts.resolved || 0,
        reopenedCount: counts.reopened || 0
      },
      categoryBreakdown
    };
  }
}
