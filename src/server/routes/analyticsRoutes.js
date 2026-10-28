import express from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { ComplaintService } from '../services/complaintService.js';

export function createAnalyticsRouter(db) {
  const router = express.Router();
  const complaintService = new ComplaintService(db);

  router.use(authMiddleware);
  router.use(requireRole(['manager']));

  // GET /api/v1/analytics/overview
  router.get('/overview', (req, res) => {
    try {
      const data = complaintService.getAnalyticsOverview(req.societyId);
      return res.status(200).json({
        success: true,
        data,
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
