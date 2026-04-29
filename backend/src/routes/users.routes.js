const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const { imageUpload, validateImageMagic } = require('../middleware/upload');
const UserController = require('../controllers/users.controller');
const {
  email,
  password,
  personName,
  rut,
  phoneNumber,
} = require('../lib/validation');

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const roleSchema = Joi.string().valid('admin', 'supervisor');

const selfUpdateUserSchema = Joi.object({
  first_name: personName,
  last_name: personName,
  password: password.allow(''),
  rut: rut.allow(''),
  phone_number: phoneNumber.allow(''),
}).min(1);

const createUserSchema = Joi.object({
  first_name: personName.required().messages({
    'any.required': 'El nombre es obligatorio',
  }),
  last_name: personName.required().messages({
    'any.required': 'El apellido es obligatorio',
  }),
  email: email.required().messages({
    'any.required': 'El email es obligatorio',
  }),
  password: password.required().messages({
    'any.required': 'La contraseña es obligatoria',
  }),
  role: roleSchema.default('supervisor'),
  client_id: Joi.any().allow(null, '').default(null),
  rut: rut.allow('', null),
  phone_number: phoneNumber.allow('', null),
});

const updateUserSchema = Joi.object({
  first_name: personName,
  last_name: personName,
  email,
  password,
  role: roleSchema,
  estado: Joi.string().valid('activo', 'inactivo', 'bloqueado'),
  client_id: Joi.any().allow(null, '').default(null),
  rut: rut.allow('', null),
  phone_number: phoneNumber.allow('', null),
}).min(1);

const validateBody = (schema) => {
  return async (req, _res, next) => {
    try {
      req.body = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};

const validateParam = (schema, source = 'params') => {
  return async (req, _res, next) => {
    try {
      req[source] = await schema.validateAsync(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};

const userIdParamSchema = Joi.object({
  id: uuid.required(),
});

router.get('/me', authMiddleware, UserController.getOwnProfile);

router.put('/me', authMiddleware, validateBody(selfUpdateUserSchema), UserController.updateOwnProfile);

router.post(
  '/me/picture',
  authMiddleware,
  imageUpload.single('profile_picture'),
  validateImageMagic,
  UserController.uploadProfilePicture
);

router.get('/', authMiddleware, isAdmin, UserController.getAllUsers);

router.get('/:id', authMiddleware, isAdmin, validateParam(userIdParamSchema), UserController.getUserById);

router.post('/', authMiddleware, isAdmin, validateBody(createUserSchema), UserController.createUser);

router.put(
  '/:id',
  authMiddleware,
  isAdmin,
  validateParam(userIdParamSchema),
  validateBody(updateUserSchema),
  UserController.updateUser
);

router.delete('/:id', authMiddleware, isAdmin, validateParam(userIdParamSchema), UserController.deleteUser);

module.exports = router;
