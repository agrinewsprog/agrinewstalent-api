import { JobApplication, ApplicationEvent, CompanyNote, Prisma, ApplicationStatus } from '@prisma/client';
import { prisma } from '../../config/database';

export interface ApplicationsFilters {
  status?: ApplicationStatus;
  offerId?: number;
  studentId?: number;
  companyId?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class ApplicationsRepository {
  async findAll(
    filters?: ApplicationsFilters,
    pagination?: PaginationOptions
  ): Promise<{ applications: JobApplication[]; total: number }> {
    const where: Prisma.JobApplicationWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.offerId) {
      where.offerId = filters.offerId;
    }

    if (filters?.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters?.companyId) {
      where.offer = {
        companyId: filters.companyId,
      };
    }

    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit;

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              resumeUrl: true,
              linkedinUrl: true,
              city: true,
              country: true,
              bio: true,
              skills: true,
            },
          },
          offer: {
            include: {
              company: {
                select: {
                  companyName: true,
                  logoUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              events: true,
              notes: true,
            },
          },
        },
        orderBy: {
          appliedAt: 'desc',
        },
        skip,
        take,
      }),
      prisma.jobApplication.count({ where }),
    ]);

    return { applications, total };
  }

  async findById(id: number): Promise<JobApplication | null> {
    return prisma.jobApplication.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            resumeUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            city: true,
            country: true,
            bio: true,
            skills: true,
          },
        },
        offer: {
          include: {
            company: {
              select: {
                id: true,
                userId: true,
                companyName: true,
                logoUrl: true,
              },
            },
          },
        },
        events: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async findByStudentAndOffer(
    studentId: number,
    offerId: number
  ): Promise<JobApplication | null> {
    return prisma.jobApplication.findUnique({
      where: {
        studentId_offerId: {
          studentId,
          offerId,
        },
      },
    });
  }

  async create(data: Prisma.JobApplicationCreateInput): Promise<JobApplication> {
    return prisma.jobApplication.create({
      data,
      include: {
        offer: {
          include: {
            company: {
              select: {
                companyName: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async updateStatus(
    id: number,
    status: ApplicationStatus,
    previousStatus: ApplicationStatus
  ): Promise<JobApplication> {
    return prisma.$transaction(async (tx) => {
      // Update application
      const application = await tx.jobApplication.update({
        where: { id },
        data: { status },
      });

      // Create event
      await tx.applicationEvent.create({
        data: {
          applicationId: id,
          eventType: 'status_change',
          fromStatus: previousStatus,
          toStatus: status,
          description: `Status changed from ${previousStatus} to ${status}`,
        },
      });

      return application;
    });
  }

  async addEvent(data: Prisma.ApplicationEventCreateInput): Promise<ApplicationEvent> {
    return prisma.applicationEvent.create({
      data,
    });
  }

  async getTimeline(applicationId: number): Promise<ApplicationEvent[]> {
    return prisma.applicationEvent.findMany({
      where: { applicationId },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async addNote(data: Prisma.CompanyNoteCreateInput): Promise<CompanyNote> {
    return prisma.companyNote.create({
      data,
    });
  }

  async getNotes(applicationId: number): Promise<CompanyNote[]> {
    return prisma.companyNote.findMany({
      where: { applicationId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async countByOffer(offerId: number): Promise<number> {
    return prisma.jobApplication.count({
      where: { offerId },
    });
  }

  async countByStudent(studentId: number): Promise<number> {
    return prisma.jobApplication.count({
      where: { studentId },
    });
  }
}
