'use strict';

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Sign a JWT for a user.
 * Payload contains only the minimum required claims — never the password.
 */
function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

/**
 * POST /api/auth/register
 * Body (validated by Joi): { email, password, displayName? }
 *
 * Creates a new user, hashes the password via the User pre-save hook,
 * and returns a JWT + public user object.
 *
 * Security:
 *  - Duplicate email returns 409 (via the error handler catching code 11000)
 *  - Password is never stored or logged in plain text
 *  - Rate-limited by strictLimiter on the route
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body;

  // Store the plain-text password in passwordHash — pre-save hook will hash it
  const user = new User({ email, passwordHash: password, displayName });
  await user.save();

  const token = signToken(user);

  res.status(201).json({
    token,
    user: user.toPublicJSON(),
  });
});

/**
 * POST /api/auth/login
 * Body (validated by Joi): { email, password }
 *
 * Security:
 *  - Returns the SAME generic error for wrong email AND wrong password
 *    to prevent user enumeration attacks
 *  - Timing is equalised via bcrypt compare (always runs, even if user not found)
 *  - Rate-limited by strictLimiter on the route
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Fetch with passwordHash (normally excluded by select: false)
  const user = await User.findOne({ email }).select('+passwordHash');

  // Use a dummy compare to prevent timing-based user enumeration
  const DUMMY_HASH = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxx';
  const isValid = user
    ? await user.comparePassword(password)
    : await require('bcryptjs').compare(password, DUMMY_HASH).then(() => false);

  if (!user || !isValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken(user);

  res.json({
    token,
    user: user.toPublicJSON(),
  });
});

/**
 * GET /api/auth/me
 * Protected by authenticate middleware.
 * Returns the current user's public profile.
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: user.toPublicJSON() });
});

/**
 * POST /api/auth/logout
 * Protected by authenticate middleware.
 * JWT is stateless — client must discard the token.
 * This endpoint exists so future token blocklisting (Redis) can be added here.
 */
const logout = asyncHandler(async (req, res) => {
  // Phase 5+: add token to a Redis blocklist here
  res.json({ message: 'Logged out successfully. Discard your token client-side.' });
});

module.exports = { register, login, getMe, logout };
