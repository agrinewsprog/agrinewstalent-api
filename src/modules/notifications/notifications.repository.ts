import { prisma } from '../../config/database';
import { CreateNotificationDto } from './notifications.dto';

export class NotificationsRepository {
  // ============================================================
  // CREATE NOTIFICATION
  // ============================================================

  async create(data: CreateNotificationDto) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type as any,
        relatedId: data.relatedId,
      },
    });
  }

  // ============================================================
  // FIND USER NOTIFICATIONS
  // ============================================================

  async findByUserId(
    userId: number,
    skip: number,
    take: number,
    isRead?: boolean,
    type?: string
  ) {
    const where: any = { userId };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  // ============================================================
  // FIND BY ID
  // ============================================================

  async findById(id: number) {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  // ============================================================
  // MARK AS READ
  // ============================================================

  async markAsRead(id: number) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  async markAllAsRead(userId: number) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  // ============================================================
  // GET UNREAD COUNT
  // ============================================================

  async getUnreadCount(userId: number) {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // ============================================================
  // DELETE NOTIFICATION
  // ============================================================

  async delete(id: number) {
    return prisma.notification.delete({
      where: { id },
    });
  }
}
