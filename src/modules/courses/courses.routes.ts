import { Router } from 'express';
import { CoursesController } from './courses.controller';
import { authenticate } from '../../common/middlewares';

const router = Router();
const controller = new CoursesController();

// ============================================================
// PUBLIC ROUTES (authenticated)
// ============================================================

/**
 * @route   GET /api/courses
 * @desc    List all courses
 * @access  Authenticated
 */
router.get('/', authenticate, controller.listCourses);

// ============================================================
// STUDENT ROUTES
// ============================================================

/**
 * @route   POST /api/courses/:id/complete
 * @desc    Mark course as completed (students only)
 * @access  Student
 */
router.post('/:id/complete', authenticate, controller.completeCourse);

/**
 * @route   GET /api/courses/me/completions
 * @desc    Get my completed courses (students only)
 * @access  Student
 */
router.get('/me/completions', authenticate, controller.getMyCompletedCourses);

export default router;
