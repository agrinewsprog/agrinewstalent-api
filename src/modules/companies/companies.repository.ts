import { ApplicationStatus, ProgramApplicationStatus, Prisma } from '@prisma/client';
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
  // GET COMPANY PROFILE
  // ============================================================

  async getProfile(userId: number) {
    return prisma.companyProfile.findUnique({
      where: { userId },
    });
  }

  // ============================================================
  // UPDATE COMPANY PROFILE
  // ============================================================

  async updateProfile(userId: number, data: any) {
    return prisma.companyProfile.update({
      where: { userId },
      data,
    });
  }

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
  // GET ALL APPLICATION STATUS COUNTS (JobApplication + ProgramApplication)
  // Used by dashboard for unified status metrics.
  // ============================================================

  async getAllApplicationStatusCounts(companyId: number) {
    const [jobByStatus, programByStatus] = await Promise.all([
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: { offer: { companyId } },
        _count: true,
      }),
      prisma.programApplication.groupBy({
        by: ['status'],
        where: { offer: { companyId } },
        _count: true,
      }),
    ]);

    const merged: Record<string, number> = {};
    for (const row of jobByStatus) {
      merged[row.status] = (merged[row.status] ?? 0) + row._count;
    }
    for (const row of programByStatus) {
      merged[row.status] = (merged[row.status] ?? 0) + row._count;
    }

    return merged;
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
            // Only normal offers (not linked to programs)
            programOffer: { is: null },
          },
        },
      }),
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: {
          offer: {
            companyId,
            programOffer: { is: null },
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

  // ============================================================
  // GET ACTIVE OFFERS WITH APPLICATION COUNTS (for dashboard)
  // ============================================================

  async getActiveOffersWithCounts(companyId: number) {
    return prisma.jobOffer.findMany({
      where: {
        companyId,
        status: { in: ['PUBLISHED', 'DRAFT'] },
        // Only normal offers (not linked to programs)
        programOffer: { is: null },
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // CHECK IF COMPANY HAS PUBLISHED OFFERS IN PROGRAMS
  // ============================================================

  async hasPublishedProgramOffers(companyId: number): Promise<boolean> {
    const count = await prisma.programOffer.count({
      where: {
        companyId,
        status: 'APPROVED',
      },
    });
    return count > 0;
  }

  async getActiveProgramOffersWithCounts(companyId: number) {
    return prisma.jobOffer.findMany({
      where: {
        companyId,
        status: { in: ['PUBLISHED', 'DRAFT'] },
        programOffer: { isNot: null },
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        _count: { select: { applications: true } },
        programOffer: {
          select: {
            id: true,
            programId: true,
            program: { select: { id: true, title: true } },
            _count: { select: { applications: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // GET PROGRAM APPLICATION STATISTICS
  // ============================================================

  async getProgramApplicationStats(companyId: number) {
    const [total, byStatus] = await Promise.all([
      prisma.programApplication.count({
        where: { offer: { companyId } },
      }),
      prisma.programApplication.groupBy({
        by: ['status'],
        where: { offer: { companyId } },
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return { total, byStatus: statusCounts };
  }

  // ============================================================
  // GET DIRECT PROGRAM APPLICATION COUNTS BY STATUS
  // (Single source of truth — no merge needed)
  // ============================================================

  async getDirectProgramApplicationCounts(companyId: number) {
    // ProgramApplication table
    const [programApps, jobProgramApps] = await Promise.all([
      prisma.programApplication.findMany({
        where: { offer: { companyId } },
        select: { id: true, status: true },
      }),
      prisma.jobApplication.findMany({
        where: { offer: { companyId, programOffer: { isNot: null } } },
        select: { id: true, status: true },
      }),
    ]);

    const all = [
      ...programApps.map((a) => ({ id: a.id, status: a.status, source: 'program' as const })),
      ...jobProgramApps.map((a) => ({ id: a.id, status: a.status, source: 'job' as const })),
    ];

    const byStatus: Record<string, number> = {};
    for (const a of all) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }

    return {
      total: all.length,
      byStatus,
      pending: all.filter((a) => a.status === 'PENDING'),
      all,
    };
  }

  // ============================================================
  // GET LATEST PROGRAM APPLICATIONS (for dashboard)
  // ============================================================

  async getLatestProgramApplications(companyId: number, limit: number = 10) {
    return prisma.programApplication.findMany({
      where: { offer: { companyId } },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
        offer: {
          select: {
            id: true,
            jobOfferId: true,
            title: true,
            program: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: limit,
    });
  }

  // ============================================================
  // GET JOB APPLICATION STATISTICS FOR OFFERS LINKED TO PROGRAMS
  // ============================================================

  async getJobApplicationStatsForPrograms(companyId: number) {
    const [total, byStatus] = await Promise.all([
      prisma.jobApplication.count({
        where: { offer: { companyId, programOffer: { isNot: null } } },
      }),
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: { offer: { companyId, programOffer: { isNot: null } } },
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return { total, byStatus: statusCounts };
  }

  // ============================================================
  // GET LATEST JOB APPLICATIONS FOR OFFERS LINKED TO PROGRAMS
  // ============================================================

  async getLatestJobApplicationsForPrograms(companyId: number, limit: number = 10) {
    return prisma.jobApplication.findMany({
      where: { offer: { companyId, programOffer: { isNot: null } } },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
        offer: {
          select: {
            id: true,
            title: true,
            programOffer: {
              select: {
                id: true,
                title: true,
                program: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: limit,
    });
  }

  // ============================================================
  // GET OFFER WITH OWNERSHIP CHECK
  // ============================================================

  async findOfferByIdAndCompany(offerId: number, companyId: number) {
    return prisma.jobOffer.findFirst({
      where: {
        id: offerId,
        companyId,
        programOffer: { is: null },
      },
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        location: true,
        salary: true,
        workMode: true,
        contractType: true,
        experienceLevel: true,
        status: true,
        companyId: true,
        publishedAt: true,
        closedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { applications: true } },
      },
    });
  }

  // ============================================================
  // GET OFFER BY ID (no ownership check — for dev diagnostics only)
  // ============================================================

  async findOfferById(offerId: number) {
    return prisma.jobOffer.findUnique({
      where: { id: offerId },
      select: { id: true, title: true, status: true, companyId: true },
    });
  }

  // ============================================================
  // GET PROGRAM OFFER WITH OWNERSHIP CHECK
  // ============================================================

  async findProgramOfferByIdAndCompany(programOfferId: number, companyId: number) {
    return prisma.programOffer.findFirst({
      where: { id: programOfferId, companyId },
      select: {
        id: true,
        title: true,
        status: true,
        companyId: true,
        jobOfferId: true,
        programId: true,
        program: { select: { id: true, title: true } },
      },
    });
  }

  async findProgramOfferForManagement(programOfferId: number, companyId: number) {
    return prisma.programOffer.findFirst({
      where: { id: programOfferId, companyId },
      include: {
        program: {
          select: {
            id: true,
            title: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        jobOffer: {
          select: {
            id: true,
            status: true,
            publishedAt: true,
            closedAt: true,
            _count: {
              select: {
                applications: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });
  }

  // ============================================================
  // FIND PROGRAM OFFERS LINKED TO A JOB OFFER
  // ============================================================

  async findProgramOffersByJobOfferId(jobOfferId: number, companyId: number) {
    return prisma.programOffer.findMany({
      where: { jobOfferId, companyId },
      select: {
        id: true,
        title: true,
        jobOfferId: true,
        programId: true,
        program: { select: { id: true, title: true } },
      },
    });
  }

  // ============================================================
  // GET APPLICATIONS FOR A SPECIFIC OFFER (with company ownership check)
  // ============================================================

  async findApplicationsByOffer(offerId: number, companyId: number) {
    return prisma.jobApplication.findMany({
      where: {
        offerId,
        offer: { companyId },
      },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            city: true,
            country: true,
            resumeUrl: true,
            avatarUrl: true,
            isActiveStudent: true,
            user: {
              select: { email: true },
            },
            universityMembership: {
              select: {
                university: {
                  select: { universityName: true },
                },
              },
            },
          },
        },
        offer: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  // ============================================================
  // GET APPLICATIONS FOR A PROGRAM OFFER (with company ownership check)
  // ============================================================

  async findProgramApplicationsByOffer(programOfferId: number, companyId: number) {
    return prisma.programApplication.findMany({
      where: {
        offerId: programOfferId,
        offer: { companyId },
      },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            city: true,
            country: true,
            resumeUrl: true,
            avatarUrl: true,
            isActiveStudent: true,
            user: {
              select: { email: true },
            },
            universityMembership: {
              select: {
                university: {
                  select: { universityName: true },
                },
              },
            },
          },
        },
        offer: {
          select: {
            id: true,
            jobOfferId: true,
            title: true,
            program: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async updateProgramOfferContent(
    programOfferId: number,
    jobOfferId: number | null,
    data: {
      title?: string;
      description?: string;
      requirements?: string | null;
      location?: string | null;
      salary?: string | null;
      workMode?: string | null;
      contractType?: string | null;
      experienceLevel?: string | null;
      maxApplicants?: number | null;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const {
        maxApplicants,
        ...jobOfferData
      } = data;

      const programOffer = await tx.programOffer.update({
        where: { id: programOfferId },
        data: {
          ...data,
          status: 'PENDING',
          approvedAt: null,
          approvedBy: null,
        },
        include: {
          program: {
            select: { id: true, title: true },
          },
          company: {
            select: { id: true, companyName: true },
          },
          _count: {
            select: { applications: true },
          },
        },
      });

      if (jobOfferId) {
        await tx.jobOffer.update({
          where: { id: jobOfferId },
          data: {
            ...jobOfferData,
            status: 'DRAFT',
            publishedAt: null,
            closedAt: null,
          },
        });
      }

      return programOffer;
    });
  }

  async deleteProgramOfferCascade(programOfferId: number, jobOfferId: number | null) {
    await prisma.$transaction(async (tx) => {
      await tx.programOffer.delete({
        where: { id: programOfferId },
      });

      if (jobOfferId) {
        await tx.jobOffer.delete({
          where: { id: jobOfferId },
        });
      }
    });
  }

  // ============================================================
  // FIND APPLICATION BY ID WITH COMPANY OWNERSHIP CHECK
  // ============================================================

  async findJobApplicationByIdAndCompany(applicationId: number, companyId: number) {
    return prisma.jobApplication.findFirst({
      where: { id: applicationId, offer: { companyId } },
      include: {
        offer: { select: { id: true, title: true, companyId: true } },
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            city: true,
            country: true,
            resumeUrl: true,
            avatarUrl: true,
            isActiveStudent: true,
            user: { select: { email: true } },
            universityMembership: {
              select: {
                university: {
                  select: { universityName: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async findProgramApplicationByIdAndCompany(applicationId: number, companyId: number) {
    return prisma.programApplication.findFirst({
      where: { id: applicationId, offer: { companyId } },
      include: {
        offer: {
          select: {
            id: true,
            title: true,
            companyId: true,
            programId: true,
            program: { select: { id: true, title: true } },
          },
        },
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            city: true,
            country: true,
            resumeUrl: true,
            avatarUrl: true,
            isActiveStudent: true,
            user: { select: { email: true } },
            universityMembership: {
              select: {
                university: {
                  select: { universityName: true },
                },
              },
            },
          },
        },
      },
    });
  }

  // ============================================================
  // UPDATE APPLICATION STATUS
  // ============================================================

  async updateJobApplicationStatus(applicationId: number, status: ApplicationStatus) {
    return prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
      include: {
        offer: { select: { id: true, title: true } },
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  async updateProgramApplicationStatus(applicationId: number, status: ProgramApplicationStatus) {
    return prisma.programApplication.update({
      where: { id: applicationId },
      data: { status },
      include: {
        offer: {
          select: {
            id: true,
            title: true,
            programId: true,
            program: { select: { id: true, title: true } },
          },
        },
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  }
}
