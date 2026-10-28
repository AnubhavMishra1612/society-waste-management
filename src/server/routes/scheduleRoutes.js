import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, requireRole } from '../middleware/auth.js';

function isValidTime(t) {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function createScheduleRouter(db) {
  const router = express.Router();
  router.use(authMiddleware);

  // GET /api/v1/schedules (Available to all authenticated roles in the society)
  router.get('/', (req, res) => {
    try {
      const schedules = db.prepare(`
        SELECT * FROM collection_schedules 
        WHERE society_id = ? AND is_active = 1
        ORDER BY created_at ASC
      `).all(req.societyId);

      const parsed = schedules.map(s => ({
        ...s,
        days_of_week: JSON.parse(s.days_of_week || '[]')
      }));

      return res.status(200).json({
        success: true,
        data: parsed,
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: err.message }
      });
    }
  });

  // POST /api/v1/schedules (Manager only)
  router.post('/', requireRole(['manager']), (req, res) => {
    try {
      const { wasteCategory, daysOfWeek, startTime, endTime, instructions, disposalLocation } = req.body;
      if (!wasteCategory || !daysOfWeek || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'wasteCategory, daysOfWeek, startTime and endTime are required' }
        });
      }

      const daysArr = Array.isArray(daysOfWeek) ? daysOfWeek : [daysOfWeek];
      if (daysArr.length === 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'At least one day of week must be selected' }
        });
      }

      if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'Times must be formatted as HH:MM (24-hour)' }
        });
      }

      if (startTime >= endTime) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'Start time must be strictly earlier than end time' }
        });
      }

      const id = 'sch_' + uuidv4();
      const daysJson = JSON.stringify(daysArr);

      db.prepare(`
        INSERT INTO collection_schedules (id, society_id, waste_category, days_of_week, start_time, end_time, instructions, disposal_location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.societyId, wasteCategory, daysJson, startTime, endTime, instructions || null, disposalLocation || null);

      return res.status(201).json({
        success: true,
        data: {
          id,
          society_id: req.societyId,
          waste_category: wasteCategory,
          days_of_week: daysArr,
          start_time: startTime,
          end_time: endTime,
          instructions: instructions || null,
          disposal_location: disposalLocation || null
        },
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: err.message }
      });
    }
  });

  // PUT /api/v1/schedules/:id (Manager only)
  router.put('/:id', requireRole(['manager']), (req, res) => {
    try {
      const scheduleId = req.params.id;
      const existing = db.prepare(`
        SELECT * FROM collection_schedules WHERE id = ? AND society_id = ? AND is_active = 1
      `).get(scheduleId, req.societyId);

      if (!existing) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Collection schedule not found' }
        });
      }

      const { wasteCategory, daysOfWeek, startTime, endTime, instructions, disposalLocation } = req.body;
      if (!wasteCategory || !daysOfWeek || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'wasteCategory, daysOfWeek, startTime and endTime are required' }
        });
      }

      const daysArr = Array.isArray(daysOfWeek) ? daysOfWeek : [daysOfWeek];
      if (daysArr.length === 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'At least one day of week must be selected' }
        });
      }

      if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'Times must be formatted as HH:MM (24-hour)' }
        });
      }

      if (startTime >= endTime) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'Start time must be strictly earlier than end time' }
        });
      }

      const daysJson = JSON.stringify(daysArr);

      db.prepare(`
        UPDATE collection_schedules 
        SET waste_category = ?, days_of_week = ?, start_time = ?, end_time = ?, instructions = ?, disposal_location = ?
        WHERE id = ? AND society_id = ?
      `).run(
        wasteCategory,
        daysJson,
        startTime,
        endTime,
        instructions || null,
        disposalLocation !== undefined ? disposalLocation : (existing.disposal_location || null),
        scheduleId,
        req.societyId
      );

      const updated = db.prepare(`SELECT * FROM collection_schedules WHERE id = ?`).get(scheduleId);
      return res.status(200).json({
        success: true,
        data: {
          ...updated,
          days_of_week: JSON.parse(updated.days_of_week || '[]')
        },
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: err.message }
      });
    }
  });

  // DELETE /api/v1/schedules/:id (Manager only)
  router.delete('/:id', requireRole(['manager']), (req, res) => {
    try {
      const scheduleId = req.params.id;
      const existing = db.prepare(`
        SELECT * FROM collection_schedules WHERE id = ? AND society_id = ? AND is_active = 1
      `).get(scheduleId, req.societyId);

      if (!existing) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Collection schedule not found' }
        });
      }

      db.prepare(`
        UPDATE collection_schedules SET is_active = 0 WHERE id = ? AND society_id = ?
      `).run(scheduleId, req.societyId);

      return res.status(200).json({
        success: true,
        data: { id: scheduleId, deleted: true },
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: err.message }
      });
    }
  });

  return router;
}
