import { Request, Response } from 'express';
import { NotificationsService } from './notifications.service';
import { listNotificationsSchema } from './notifications.dto';

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
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userId = req.user.userId;
      const dto = listNotificationsSchema.parse(req.query);
      const result = await this.notificationsService.listMyNotifications(userId, dto);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // MARK AS READ
  // ============================================================

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = parseInt(req.params.id as string);
      const userId = req.user.userId;
      const result = await this.notificationsService.markAsRead(id, userId);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Notification not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Unauthorized to mark this notification as read') {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userId = req.user.userId;
      const result = await this.notificationsService.markAllAsRead(userId);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // DELETE NOTIFICATION
  // ============================================================

  deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const id = parseInt(req.params.id as string);
      const userId = req.user.userId;
      const result = await this.notificationsService.deleteNotification(id, userId);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Notification not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Unauthorized to delete this notification') {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  };
}
