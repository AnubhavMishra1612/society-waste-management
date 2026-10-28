import express from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { ComplaintService } from '../services/complaintService.js';

export function createComplaintRouter(db) {
  const router = express.Router();
  const complaintService = new ComplaintService(db);

  // All complaint endpoints require authentication
  router.use(authMiddleware);

  // POST /api/v1/complaints (Resident or Manager submits a complaint)
  router.post('/', (req, res) => {
    uploadMiddleware.single('photo')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            data: null,
            error: { code: 'FILE_TOO_LARGE', message: 'Photo exceeds the 5MB maximum file size limit' }
          });
        }
        if (err.code === 'UNSUPPORTED_MEDIA_TYPE') {
          return res.status(415).json({
            success: false,
            data: null,
            error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: err.message }
          });
        }
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'UPLOAD_ERROR', message: err.message || 'File upload failed' }
        });
      }

      try {
        const { category, description, wing, floorLocation } = req.body;
        const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const complaint = complaintService.createComplaint({
          societyId: req.societyId,
          residentId: req.user.id,
          category,
          description,
          wing: wing || req.user.wing,
          floorLocation,
          photoUrl
        });

        return res.status(201).json({
          success: true,
          data: complaint,
          error: null,
          meta: { timestamp: new Date().toISOString() }
        });
      } catch (error) {
        const statusCode = error.code === 'VALIDATION_FAILED' ? 400 : 500;
        return res.status(statusCode).json({
          success: false,
          data: null,
          error: { code: error.code || 'SERVER_ERROR', message: error.message }
        });
      }
    });
  });

  // GET /api/v1/complaints/my (Resident views their own complaints)
  router.get('/my', (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const result = complaintService.listComplaints({
        societyId: req.societyId,
        residentId: req.user.id,
        status: status || null,
        page: Number(page),
        limit: Number(limit)
      });

      return res.status(200).json({
        success: true,
        data: result.complaints,
        error: null,
        meta: {
          pagination: result.pagination,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: error.message }
      });
    }
  });

  // GET /api/v1/complaints (Manager or Staff views society complaints with filters)
  router.get('/', requireRole(['manager', 'staff']), (req, res) => {
    try {
      const { status, category, wing, search, page = 1, limit = 20 } = req.query;
      const assignedStaffId = req.user.role === 'staff' ? req.user.id : null;
      const result = complaintService.listComplaints({
        societyId: req.societyId,
        assignedStaffId,
        status: status || null,
        category: category || null,
        wing: wing || null,
        search: search || null,
        page: Number(page),
        limit: Number(limit)
      });

      return res.status(200).json({
        success: true,
        data: result.complaints,
        error: null,
        meta: {
          pagination: result.pagination,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: error.message }
      });
    }
  });

  // GET /api/v1/complaints/:id (View complaint detail & status stepper history)
  router.get('/:id', (req, res) => {
    try {
      const complaint = complaintService.getComplaintById(
        req.params.id,
        req.societyId,
        req.user.id,
        req.user.role
      );

      return res.status(200).json({
        success: true,
        data: complaint,
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 : error.code === 'FORBIDDEN' ? 403 : 500;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error: { code: error.code || 'SERVER_ERROR', message: error.message }
      });
    }
  });

  // PATCH /api/v1/complaints/:id/assign (Manager assigns staff)
  router.patch('/:id/assign', requireRole(['manager']), (req, res) => {
    try {
      const { staffUserId, instructions } = req.body;
      if (!staffUserId) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'staffUserId is required' }
        });
      }

      const updated = complaintService.assignComplaint({
        id: req.params.id,
        societyId: req.societyId,
        managerId: req.user.id,
        staffUserId,
        instructions
      });

      return res.status(200).json({
        success: true,
        data: updated,
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 : error.code === 'VALIDATION_FAILED' ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error: { code: error.code || 'SERVER_ERROR', message: error.message }
      });
    }
  });

  // PATCH /api/v1/complaints/:id/status (Manager or Staff transitions status)
  router.patch('/:id/status', requireRole(['manager', 'staff']), (req, res) => {
    try {
      const { status, notes } = req.body;
      if (!status) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'status is required' }
        });
      }

      const updated = complaintService.updateStatus({
        id: req.params.id,
        societyId: req.societyId,
        userId: req.user.id,
        userRole: req.user.role,
        newStatus: status,
        notes
      });

      return res.status(200).json({
        success: true,
        data: updated,
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 :
                         error.code === 'ILLEGAL_TRANSITION' ? 422 :
                         error.code === 'VALIDATION_FAILED' ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error: { code: error.code || 'SERVER_ERROR', message: error.message }
      });
    }
  });

  // POST /api/v1/complaints/:id/resolve (Staff or Manager marks resolved with proof)
  router.post('/:id/resolve', requireRole(['staff', 'manager']), (req, res) => {
    uploadMiddleware.single('resolutionPhoto')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'UPLOAD_ERROR', message: err.message }
        });
      }

      try {
        const { resolutionNotes } = req.body;
        const resolutionPhotoUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const resolved = complaintService.resolveComplaint({
          id: req.params.id,
          societyId: req.societyId,
          userId: req.user.id,
          userRole: req.user.role,
          resolutionPhotoUrl,
          resolutionNotes
        });

        return res.status(200).json({
          success: true,
          data: resolved,
          error: null,
          meta: { timestamp: new Date().toISOString() }
        });
      } catch (error) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(statusCode).json({
          success: false,
          data: null,
          error: { code: error.code || 'SERVER_ERROR', message: error.message }
        });
      }
    });
  });

  // POST /api/v1/complaints/:id/reopen (Resident reopens complaint)
  router.post('/:id/reopen', requireRole(['resident', 'manager']), (req, res) => {
    try {
      const { reason } = req.body;
      const reopened = complaintService.reopenComplaint({
        id: req.params.id,
        societyId: req.societyId,
        residentId: req.user.id,
        reason
      });

      return res.status(200).json({
        success: true,
        data: reopened,
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 :
                         error.code === 'FORBIDDEN' ? 403 :
                         error.code === 'WINDOW_EXPIRED' ? 400 :
                         error.code === 'ILLEGAL_TRANSITION' ? 422 : 500;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error: { code: error.code || 'SERVER_ERROR', message: error.message }
      });
    }
  });

  return router;
}
