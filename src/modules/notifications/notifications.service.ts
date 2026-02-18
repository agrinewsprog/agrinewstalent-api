import { NotificationsRepository } from './notifications.repository';
import { CreateNotificationDto, ListNotificationsDto } from './notifications.dto';

export class NotificationsService {
  private notificationsRepository: NotificationsRepository;

  constructor() {
    this.notificationsRepository = new NotificationsRepository();
  }

  // ============================================================
  // CREATE NOTIFICATION
  // ============================================================

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.notificationsRepository.create(dto);

    return {
      message: 'Notification created successfully',
      notification,
    };
  }

  // ============================================================
  // LIST MY NOTIFICATIONS
  // ============================================================

  async listMyNotifications(userId: number, dto: ListNotificationsDto) {
    const { page = 1, limit = 20, isRead, type } = dto;
    const skip = (page - 1) * limit;

    const { notifications, total } = await this.notificationsRepository.findByUserId(
      userId,
      skip,
      limit,
      isRead,
      type
    );

    const unreadCount = await this.notificationsRepository.getUnreadCount(userId);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // MARK AS READ
  // ============================================================

  async markAsRead(id: number, userId: number) {
    const notification = await this.notificationsRepository.findById(id);

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Unauthorized to mark this notification as read');
    }

    if (notification.isRead) {
      throw new Error('Notification is already marked as read');
    }

    const updatedNotification = await this.notificationsRepository.markAsRead(id);

    return {
      message: 'Notification marked as read',
      notification: updatedNotification,
    };
  }

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  async markAllAsRead(userId: number) {
    const result = await this.notificationsRepository.markAllAsRead(userId);

    return {
      message: `${result.count} notifications marked as read`,
      count: result.count,
    };
  }

  // ============================================================
  // DELETE NOTIFICATION
  // ============================================================

  async deleteNotification(id: number, userId: number) {
    const notification = await this.notificationsRepository.findById(id);

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Unauthorized to delete this notification');
    }

    await this.notificationsRepository.delete(id);

    return {
      message: 'Notification deleted successfully',
    };
  }

  // ============================================================
  // HELPER: Create application status notification
  // ============================================================

  async notifyApplicationStatusChange(
    userId: number,
    applicationId: number,
    status: string,
    offerTitle: string
  ) {
    const statusMessages: Record<string, string> = {
      VIEWED: 'Tu postulación ha sido vista',
      INTERVIEW_REQUESTED: 'Te han solicitado una entrevista',
      HIRED: '¡Felicitaciones! Has sido contratado/a',
      REJECTED: 'Tu postulación ha sido rechazada',
      REVIEWED: 'Tu postulación ha sido revisada',
      ACCEPTED: '¡Felicitaciones! Tu postulación ha sido aceptada',
    };

    const title = statusMessages[status] || 'Actualización de postulación';
    const message = `Tu postulación a "${offerTitle}" ha cambiado a: ${status}`;

    return this.createNotification({
      userId,
      title,
      message,
      type: 'APPLICATION_STATUS_CHANGED',
      relatedId: applicationId,
    });
  }
}
