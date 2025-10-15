const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/user');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { uploadFile } = require('../lib/googleCloud');
const logger = require('../lib/logger');

// Multer config for in-memory storage
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// ===== Self-service routes for logged-in users =====

// A user can get their own data
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    // Omit password_hash from the response
    const { password_hash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    logger.error(`Error al obtener los datos del usuario: ${err.message}`, err);
    next(err);
  }
});

const selfUpdateUserSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(100),
  last_name: Joi.string().trim().min(2).max(100),
  password: Joi.string().min(8).allow(''),
  rut: Joi.string().trim().allow(''),
  phone_number: Joi.string().trim().allow(''),
}).min(1); // Require at least one field to update

// A user can update their own data
router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const validatedData = await selfUpdateUserSchema.validateAsync(req.body);

    // Users cannot change their own role via this route
    delete validatedData.role;
    delete validatedData.email;

    const updatedUser = await User.update(req.user.id, validatedData);

    // Issue a new token with updated info
    const payload = {
      user: {
        id: updatedUser.id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        role: updatedUser.role,
        profile_picture_url: updatedUser.profile_picture_url,
      },
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' }, (err, token) => {
      if (err) throw err;
      
      const { password_hash, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword, token });
    });
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al actualizar los datos del usuario: ${err.message}`, err);
    next(err);
  }
});

// ===== Admin-only routes =====

router.use(authMiddleware, isAdmin);

// GET all users
router.get('/', async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.role) {
      filters.role = req.query.role;
    }
    const users = await User.getAll(filters);
    res.json(users);
  } catch (err) {
    logger.error(`Error al obtener todos los usuarios: ${err.message}`, err);
    next(err);
  }
});

// GET user by id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (err) {
    logger.error(`Error al obtener el usuario con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

const createUserSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(100).required(),
  last_name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('admin', 'technician', 'client').default('client'),
});

// POST a new user
router.post('/', async (req, res, next) => {
  try {
    const validatedData = await createUserSchema.validateAsync(req.body);
    const newUser = await User.create(validatedData);
    res.status(201).json(newUser);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al crear un nuevo usuario: ${err.message}`, err);
    next(err);
  }
});

const updateUserSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(100),
  last_name: Joi.string().trim().min(2).max(100),
  email: Joi.string().email(),
  password: Joi.string().min(8),
  role: Joi.string().valid('admin', 'technician', 'client'),
  rut: Joi.string().trim().allow(''),
  phone_number: Joi.string().trim().allow(''),
});

// PUT to update a user
router.put('/:id', async (req, res, next) => {
  try {
    const validatedData = await updateUserSchema.validateAsync(req.body);
    const updatedUser = await User.update(req.params.id, validatedData);
    res.json(updatedUser);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al actualizar el usuario con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

// DELETE a user
router.delete('/:id', async (req, res, next) => {
  try {
    const deletedUser = await User.delete(req.params.id);
    res.json(deletedUser);
  } catch (err) {
    logger.error(`Error al eliminar el usuario con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

// POST to upload a user's profile picture
router.post('/me/picture', authMiddleware, upload.single('profile_picture'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const imageUrl = await uploadFile(req.file);
    const updatedUser = await User.update(req.user.id, { profile_picture_url: imageUrl });

    // Issue a new token with the updated picture URL
    const payload = {
      user: {
        id: updatedUser.id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        role: updatedUser.role,
        profile_picture_url: updatedUser.profile_picture_url,
      },
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    const { password_hash, ...userWithoutPassword } = updatedUser;
    res.json({ user: userWithoutPassword, token });
  } catch (err) {
    logger.error(`Error al subir la foto de perfil: ${err.message}`, err);
    next(err);
  }
});

module.exports = router;
