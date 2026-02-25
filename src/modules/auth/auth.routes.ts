import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate, authenticate } from '../../common/middlewares';
import { registerSchema, loginSchema } from './auth.dto';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
// 'all' is required because registerSchema wraps input in { body: ... }
router.post('/register', validate(registerSchema, 'all'), authController.register);

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */
// 'all' is required because loginSchema wraps input in { body: ... }
router.post('/login', validate(loginSchema, 'all'), authController.login);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route   POST /auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route   PUT /auth/me/profile
 * @desc    Update current user profile (firstName, lastName, etc.)
 * @access  Private
 */
router.put('/me/profile', authenticate, authController.updateProfile);

export default router;
