import { Request, Response } from 'express';
import { NotificationsService } from './notifications.service';
import { listNotificationsSchema } from './notifications.dto';

function sendNotificationsError(
  res: Response,
  status: number,
  message: string,
  code: string,
): void {
  res.status(status).json({ error: { message, code } });
}

function parsePositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export class NotificationsController {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  // ============================================================
  // LIST MY NOTIFICATIONS
  // ============================================================

  listMyNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendNotificationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const userId = req.user.userId;
      const dto = listNotificationsSchema.parse(req.query);
      const result = await this.notificationsService.listMyNotifications(userId, dto);

      res.status(200).json(result);
    } catch (error: any) {
      sendNotificationsError(res, 400, error.message, 'BAD_REQUEST');
    }
  };

  // ============================================================
  // MARK AS READ
  // ============================================================

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendNotificationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const id = parsePositiveInt(req.params.id);
      if (!id) {
        sendNotificationsError(res, 400, 'Invalid notification ID', 'INVALID_ID');
        return;
      }
      const userId = req.user.userId;
      const result = await this.notificationsService.markAsRead(id, userId);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Notification not found') {
        sendNotificationsError(res, 404, error.message, 'NOT_FOUND');
        return;
      }
      if (error.message === 'Unauthorized to mark this notification as read') {
        sendNotificationsError(res, 403, error.message, 'FORBIDDEN');
        return;
      }
      sendNotificationsError(res, 400, error.message, 'BAD_REQUEST');
    }
  };

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendNotificationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const userId = req.user.userId;
      const result = await this.notificationsService.markAllAsRead(userId);

      res.status(200).json(result);
    } catch (error: any) {
      sendNotificationsError(res, 400, error.message, 'BAD_REQUEST');
    }
  };

  // ============================================================
  // DELETE NOTIFICATION
  // ============================================================

  deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendNotificationsError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
        return;
      }

      const id = parsePositiveInt(req.params.id);
      if (!id) {
        sendNotificationsError(res, 400, 'Invalid notification ID', 'INVALID_ID');
        return;
      }
      const userId = req.user.userId;
      const result = await this.notificationsService.deleteNotification(id, userId);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Notification not found') {
        sendNotificationsError(res, 404, error.message, 'NOT_FOUND');
        return;
      }
      if (error.message === 'Unauthorized to delete this notification') {
        sendNotificationsError(res, 403, error.message, 'FORBIDDEN');
        return;
      }
      sendNotificationsError(res, 400, error.message, 'BAD_REQUEST');
    }
  };
}
