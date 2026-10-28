import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'societyclean_dev_jwt_secret_super_secure_32_characters';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is missing or malformed',
        details: []
      },
      meta: { timestamp: new Date().toISOString() }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.societyId = decoded.societyId;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid or expired authentication token',
        details: []
      },
      meta: { timestamp: new Date().toISOString() }
    });
  }
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: requires one of the following roles: ${allowedRoles.join(', ')}`,
          details: []
        },
        meta: { timestamp: new Date().toISOString() }
      });
    }
    next();
  };
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
