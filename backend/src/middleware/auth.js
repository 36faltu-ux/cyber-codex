'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * authenticate — verifies a Bearer JWT from the Authorization header.
 *
 * On success:  attaches `req.user = { _id, email, role }` and calls next().
 * On failure:  returns 401 with a generic error message.
 *              (Never reveals whether the token is missing vs. invalid.)
 *
 * Usage:
 *   router.get('/protected', authenticate, handler);
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7); // Strip "Bearer "

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    // Attach only the minimum needed — never the full DB document
    req.user = {
      _id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    // Catches both JsonWebTokenError and TokenExpiredError
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * requireRole — role-based access control middleware.
 * Must be used AFTER authenticate.
 *
 * Usage:
 *   router.delete('/admin-only', authenticate, requireRole('admin'), handler);
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'user')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
