import { ApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export interface CandidatesFilters {
  status?: ApplicationStatus;
  offerId?: number;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class CompaniesRepository {
  // ============================================================
  // GET COMPANY CANDIDATES (APPLICATIONS TO COMPANY OFFERS)
  // ============================================================

  async findCompanyCandidates(
    companyId: number,
    filters?: CandidatesFilters,
    pagination?: PaginationOptions
  ) {
    const where: Prisma.JobApplicationWhereInput = {
      offer: {
        companyId,
      },
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.offerId) {
      where.offerId = filters.offerId;
    }

    if (filters?.search) {
      where.student = {
        OR: [
          {
            firstName: {
              contains: filters.search,
            },
          },
          {
            lastName: {
              contains: filters.search,
            },
          },
        ],
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
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              city: true,
              country: true,
              resumeUrl: true,
              linkedinUrl: true,
              githubUrl: true,
              bio: true,
              skills: true,
              careerField: true,
            },
          },
          offer: {
            select: {
              id: true,
              title: true,
              location: true,
              workMode: true,
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

  // ============================================================
  // GET CANDIDATE BY ID (WITH AUTHORIZATION CHECK)
  // ============================================================

  async findCandidateById(applicationId: number, companyId: number) {
    return prisma.jobApplication.findFirst({
      where: {
        id: applicationId,
        offer: {
          companyId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            city: true,
            country: true,
            resumeUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            bio: true,
            skills: true,
            dateOfBirth: true,
            careerField: true,
            createdAt: true,
          },
        },
        offer: {
          include: {
            company: {
              select: {
                id: true,
                companyName: true,
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

  // ============================================================
  // GET CANDIDATE STATISTICS
  // ============================================================

  async getCandidateStats(companyId: number) {
    const [total, byStatus] = await Promise.all([
      prisma.jobApplication.count({
        where: {
          offer: {
            companyId,
          },
        },
      }),
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: {
          offer: {
            companyId,
          },
        },
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<ApplicationStatus, number>);

    return {
      total,
      byStatus: statusCounts,
    };
  }
}
