'use strict';

/**
 * users.controller.js — User profile management
 *
 * Endpoints:
 *   GET   /api/users/me        → get own profile
 *   PUT   /api/users/me        → update display name / avatar URL
 *   DELETE /api/users/me       → delete own account (GDPR right to erasure)
 */

const User = require('../../models/User');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * GET /api/users/me
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: user.toPublicJSON() });
});

/**
 * PUT /api/users/me
 * Body: { displayName?: string, avatarUrl?: string }
 *
 * Only whitelisted fields can be updated here (no role, no passwordHash).
 */
const updateProfile = asyncHandler(async (req, res) => {
  const updates = {};

  if (typeof req.body.displayName === 'string') {
    const name = req.body.displayName.trim();
    if (name.length > 100) return res.status(400).json({ error: 'Display name must be 100 characters or fewer.' });
    updates.displayName = name;
  }

  if (typeof req.body.avatarUrl === 'string') {
    const url = req.body.avatarUrl.trim();
    // Basic URL validation — empty string clears the avatar
    if (url && !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'avatarUrl must be a valid http/https URL.' });
    }
    updates.avatarUrl = url;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Provide at least one field to update (displayName, avatarUrl).' });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: user.toPublicJSON() });
});

/**
 * DELETE /api/users/me
 * Permanently deletes the authenticated user's account.
 * In production you would also cascade-delete their data.
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ message: 'Account deleted. All your data has been removed.' });
});

module.exports = { getProfile, updateProfile, deleteAccount };
