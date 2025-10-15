const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { revokeToken } = require('../middleware/auth');
const logger = require('../lib/logger');

// Register a new user
router.post('/register', async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const user = await User.create({ first_name, last_name, email, password, role });
    res.status(201).json({ message: 'User created successfully', user });

  } catch (error) {
    logger.error(`Error en el registro de usuario: ${error.message}`, error);
    next(error);
  }
});

// Login a user
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
      },
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (error) {
    logger.error(`Fallo en el intento de login para el usuario: ${req.body.email}`, error);
    next(error);
  }
});

// Logout a user
router.post('/logout', (req, res) => {
  const authHeader = req.header('Authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      revokeToken(token);
    }
  }
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
