import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateToken, authMiddleware } from '../middleware/auth.js';

export function createAuthRouter(db) {
  const router = express.Router();

  // POST /api/v1/auth/register
  router.post('/register', (req, res) => {
    try {
      const { societyCode, fullName, email, password, phone, wing, flatNumber } = req.body;

      if (!societyCode || !fullName || !email || !password || !wing || !flatNumber) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'societyCode, fullName, email, password, wing, and flatNumber are required.',
            details: []
          }
        });
      }

      // Check society
      const society = db.prepare('SELECT id, name, wings_config FROM societies WHERE code = ? AND is_active = 1').get(societyCode.trim().toUpperCase());
      if (!society) {
        return res.status(404).json({
          success: false,
          data: null,
          error: {
            code: 'SOCIETY_NOT_FOUND',
            message: `Housing society with code '${societyCode}' does not exist or is inactive.`,
            details: []
          }
        });
      }

      // Check if email already registered
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
      if (existingUser) {
        return res.status(409).json({
          success: false,
          data: null,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email address already exists.',
            details: []
          }
        });
      }

      const userId = 'usr_' + uuidv4();
      const passwordHash = bcrypt.hashSync(password, 10);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, society_id, full_name, email, password_hash, role, phone, wing, flat_number, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'resident', ?, ?, ?, ?, ?)
      `).run(userId, society.id, fullName.trim(), email.trim().toLowerCase(), passwordHash, phone || null, wing.trim(), flatNumber.trim(), now, now);

      const token = generateToken({
        id: userId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: 'resident',
        societyId: society.id,
        wing: wing.trim(),
        flatNumber: flatNumber.trim()
      });

      return res.status(201).json({
        success: true,
        data: {
          user: {
            id: userId,
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            role: 'resident',
            societyId: society.id,
            societyName: society.name,
            wing: wing.trim(),
            flatNumber: flatNumber.trim()
          },
          token
        },
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: 'Internal server error during registration', details: [] }
      });
    }
  });

  // POST /api/v1/auth/login
  router.post('/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_FAILED', message: 'Email and password are required', details: [] }
        });
      }

      const user = db.prepare(`
        SELECT u.*, s.name as society_name, s.wings_config
        FROM users u
        LEFT JOIN societies s ON u.society_id = s.id
        WHERE u.email = ? AND u.is_active = 1
      `).get(email.trim().toLowerCase());

      if (!user) {
        return res.status(401).json({
          success: false,
          data: null,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', details: [] }
        });
      }

      const validPassword = bcrypt.compareSync(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          data: null,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', details: [] }
        });
      }

      const token = generateToken({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        societyId: user.society_id,
        wing: user.wing,
        flatNumber: user.flat_number
      });

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            role: user.role,
            societyId: user.society_id,
            societyName: user.society_name,
            wing: user.wing,
            flatNumber: user.flat_number
          },
          token
        },
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: 'Internal server error during login', details: [] }
      });
    }
  });

  // GET /api/v1/auth/me
  router.get('/me', authMiddleware, (req, res) => {
    try {
      const user = db.prepare(`
        SELECT u.id, u.full_name, u.email, u.role, u.phone, u.wing, u.flat_number, u.society_id,
               s.name as society_name, s.wings_config, s.code as society_code
        FROM users u
        LEFT JOIN societies s ON u.society_id = s.id
        WHERE u.id = ? AND u.is_active = 1
      `).get(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { code: 'USER_NOT_FOUND', message: 'User account not found', details: [] }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            wing: user.wing,
            flatNumber: user.flat_number,
            society: {
              id: user.society_id,
              name: user.society_name,
              code: user.society_code,
              wings: JSON.parse(user.wings_config || '[]')
            }
          }
        },
        error: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      console.error('Auth me error:', err);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: 'Failed to fetch user session', details: [] }
      });
    }
  });

  return router;
}
