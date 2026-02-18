import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate, validate } from '../../common/middlewares';
import { listNotificationsSchema } from './notifications.dto';

const router = Router();
const controller = new NotificationsController();

// ============================================================
// AUTHENTICATED ROUTES
// ============================================================

/**
 * @route   GET /api/notifications
 * @desc    List my notifications
 * @access  Authenticated
 */
router.get(
  '/',
  authenticate,
  validate(listNotificationsSchema, 'query'),
  controller.listMyNotifications
);

/**
 * @route   POST /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Authenticated
 */
router.post(
  '/:id/read',
  authenticate,
  controller.markAsRead
);

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Authenticated
 */
router.post(
  '/read-all',
  authenticate,
  controller.markAllAsRead
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Authenticated
 */
router.delete(
  '/:id',
  authenticate,
  controller.deleteNotification
);

export default router;
