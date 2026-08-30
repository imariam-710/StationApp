const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

function signToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'sp758f21f89a97c38af710c',
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// One-click access for regular users — no account, no password. Issues a
// valid "user"-role token straight away so anyone can jump into the
// dashboard and start entering data. Only the admin account (seeded via
// server/seed.js, or created directly in the database) needs real
// credentials — there's no public self-registration anymore.
router.post('/guest-login', async (req, res) => {
  try {
    const token = signToken({ _id: 'guest', name: 'Station User', email: null, role: 'user' });
    res.json({ token, user: { id: 'guest', name: 'Station User', email: null, role: 'user' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  if (req.user.id === 'guest') {
    return res.json({ user: { id: 'guest', name: 'Station User', email: null, role: 'user' } });
  }
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

module.exports = router;