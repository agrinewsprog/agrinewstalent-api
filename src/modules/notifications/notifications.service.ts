import { NotificationsRepository } from './notifications.repository';
import { CreateNotificationDto, ListNotificationsDto } from './notifications.dto';
import {
  isApplicationNotificationType,
  getNotificationI18n,
  getDefaultLang,
} from '../../common/utils/notification-i18n.util';

export class NotificationsService {
  private notificationsRepository: NotificationsRepository;

  constructor() {
    this.notificationsRepository = new NotificationsRepository();
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private parseMetadata(raw: string | null): Record<string, any> | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private normalizeNavigationMetadata(type: string, meta: Record<string, any> | null) {
    if (!meta) return null;

    const source =
      meta.source === 'program' || (meta.programId && meta.programOfferId)
        ? 'program'
        : 'job';

    const legacyOfferId = typeof meta.offerId === 'number' ? meta.offerId : null;
    const jobOfferId = meta.jobOfferId ?? (source === 'job' ? legacyOfferId : null);
    const programOfferId = meta.programOfferId ?? (source === 'program' ? legacyOfferId : null);
    const hasAmbiguousProgramContext = Boolean(
      meta.programId && source === 'job' && !programOfferId,
    );
    const normalized = {
      ...meta,
      source,
      applicationId: meta.applicationId ?? null,
      jobOfferId: jobOfferId ?? null,
      programOfferId: programOfferId ?? null,
      programId: meta.programId ?? null,
      companyId: meta.companyId ?? null,
      offerTitle: meta.offerTitle ?? null,
      programTitle: meta.programTitle ?? null,
      companyName: meta.companyName ?? null,
      hasAmbiguousProgramContext,
    };

    if (!isApplicationNotificationType(type)) {
      return normalized;
    }

    return normalized;
  }

  private buildLink(type: string, meta: Record<string, any> | null): string | null {
    if (!meta) return null;
    if (isApplicationNotificationType(type)) {
      if (meta.source === 'program' && meta.programId && meta.programOfferId) {
        return `/programs/${meta.programId}/offers/${meta.programOfferId}`;
      }
      if (meta.source === 'job' && meta.jobOfferId && !meta.hasAmbiguousProgramContext) {
        return `/offers/${meta.jobOfferId}`;
      }
      if (meta.applicationId) return `/applications/${meta.applicationId}`;
    }
    return null;
  }

  private formatNotification(n: any, lang?: string) {
    const meta = this.normalizeNavigationMetadata(n.type, this.parseMetadata(n.metadata));
    const resolvedLang = getDefaultLang(lang);
    const link = this.buildLink(n.type, meta);
    const routeContext = meta && isApplicationNotificationType(n.type)
      ? {
          resource: meta.source === 'program' && meta.programOfferId && meta.programId
            ? 'program-offer'
            : meta.jobOfferId && !meta.hasAmbiguousProgramContext
              ? 'job-offer'
              : 'application',
          source: meta.source,
          applicationId: meta.applicationId,
          jobOfferId: meta.jobOfferId,
          programOfferId: meta.programOfferId,
          programId: meta.programId,
          companyId: meta.companyId,
          resourceId: meta.source === 'program'
            ? meta.programOfferId ?? meta.applicationId
            : meta.hasAmbiguousProgramContext
              ? meta.applicationId
              : meta.jobOfferId ?? meta.applicationId,
        }
      : null;

    let title = n.title;
    let message = n.message;

    if (isApplicationNotificationType(n.type) && meta?.offerTitle) {
      const i18n = getNotificationI18n(n.type, resolvedLang, meta.offerTitle);
      if (i18n) {
        title = i18n.title;
        message = i18n.message;
      }
    }

    return {
      id: n.id,
      type: n.type,
      title,
      message,
      isRead: n.isRead,
      createdAt: n.createdAt,
      relatedId: n.relatedId,
      link,
      hasLink: Boolean(link),
      routeContext,
      metadata: meta,
    };
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
    const { page = 1, limit = 20, isRead, type, lang } = dto;
    const skip = (page - 1) * limit;

    const { notifications, total } = await this.notificationsRepository.findByUserId(
      userId,
      skip,
      limit,
      isRead,
      type,
    );

    const unreadCount = await this.notificationsRepository.getUnreadCount(userId);

    return {
      notifications: notifications.map((n: any) => this.formatNotification(n, lang)),
      unreadCount,
      meta: {
        hasNotifications: total > 0,
        hasUnreadNotifications: unreadCount > 0,
        emptyState: total === 0
          ? {
              kind: 'NO_NOTIFICATIONS',
              message: 'There are no notifications yet.',
            }
          : null,
      },
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
      return {
        message: 'Notification already marked as read',
        notification: this.formatNotification(notification),
        idempotent: true,
      };
    }

    const updatedNotification = await this.notificationsRepository.markAsRead(id);

    return {
      message: 'Notification marked as read',
      notification: this.formatNotification(updatedNotification),
      idempotent: false,
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
      alreadyUpToDate: result.count === 0,
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
}
