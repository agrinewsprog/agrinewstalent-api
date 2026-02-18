import { prisma } from '../../config/database';

export interface CreateProgramData {
  universityId: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  requiresCourseId?: number;
  maxStudents?: number;
}

export interface ProgramFilters {
  universityId?: number;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ApplicationFilters {
  programId?: number;
  offerId?: number;
  studentId?: number;
  status?: string;
}

export class ProgramsRepository {
  // PROGRAM MANAGEMENT
  async createProgram(data: CreateProgramData) {
    return prisma.program.create({
      data: {
        universityId: data.universityId,
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        requiresCourseId: data.requiresCourseId,
        maxStudents: data.maxStudents,
      },
      include: {
        university: {
          select: {
            universityName: true,
          },
        },
      },
    });
  }

  async findProgramById(id: number) {
    return prisma.program.findUnique({
      where: { id },
      include: {
        university: {
          select: {
            id: true,
            userId: true,
            universityName: true,
          },
        },
        companies: {
          include: {
            company: {
              select: {
                id: true,
                companyName: true,
                industry: true,
                logoUrl: true,
              },
            },
          },
        },
        offers: {
          where: { status: 'APPROVED' },
          include: {
            company: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    });
  }

  async findProgramsByUniversity(
    filters: ProgramFilters,
    pagination?: PaginationOptions
  ) {
    const where: any = {};

    if (filters.universityId) {
      where.universityId = filters.universityId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit;

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        include: {
          university: {
            select: {
              universityName: true,
            },
          },
          _count: {
            select: {
              companies: true,
              offers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.program.count({ where }),
    ]);

    return { programs, total };
  }

  // COMPANY INTEREST MANAGEMENT
  async createCompanyInterest(programId: number, companyId: number) {
    return prisma.programCompany.create({
      data: {
        programId,
        companyId,
      },
      include: {
        company: {
          select: {
            companyName: true,
            industry: true,
          },
        },
        program: {
          select: {
            title: true,
          },
        },
      },
    });
  }

  async findCompanyInterest(programId: number, companyId: number) {
    return prisma.programCompany.findUnique({
      where: {
        programId_companyId: {
          programId,
          companyId,
        },
      },
    });
  }

  async updateCompanyStatus(
    programId: number,
    companyId: number,
    status: string,
    reviewedBy: number
  ) {
    return prisma.programCompany.update({
      where: {
        programId_companyId: {
          programId,
          companyId,
        },
      },
      data: {
        status: status as any,
        reviewedAt: new Date(),
        reviewedBy,
      },
    });
  }

  async getProgramCompanies(programId: number) {
    return prisma.programCompany.findMany({
      where: { programId },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            industry: true,
            logoUrl: true,
            website: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  // PROGRAM OFFERS MANAGEMENT
  async createProgramOffer(data: any) {
    return prisma.programOffer.create({
      data,
      include: {
        program: {
          select: {
            title: true,
            university: {
              select: {
                universityName: true,
              },
            },
          },
        },
        company: {
          select: {
            companyName: true,
          },
        },
      },
    });
  }

  async findProgramOfferById(id: number) {
    return prisma.programOffer.findUnique({
      where: { id },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            universityId: true,
            requiresCourseId: true,
            university: {
              select: {
                userId: true,
                universityName: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
            industry: true,
            logoUrl: true,
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

  async updateOfferStatus(offerId: number, status: string, approvedBy: number) {
    return prisma.programOffer.update({
      where: { id: offerId },
      data: {
        status: status as any,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        approvedBy: status === 'APPROVED' ? approvedBy : null,
      },
    });
  }

  async getProgramOffers(programId: number) {
    return prisma.programOffer.findMany({
      where: { programId },
      include: {
        company: {
          select: {
            companyName: true,
            logoUrl: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompanyProgramOffers(companyId: number, programId?: number) {
    const where: any = { companyId };
    if (programId) {
      where.programId = programId;
    }

    return prisma.programOffer.findMany({
      where,
      include: {
        program: {
          select: {
            title: true,
            university: {
              select: {
                universityName: true,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  // PROGRAM APPLICATIONS MANAGEMENT
  async createApplication(data: any) {
    return prisma.programApplication.create({
      data,
      include: {
        offer: {
          select: {
            title: true,
            program: {
              select: {
                title: true,
              },
            },
          },
        },
        student: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findApplicationByOfferAndStudent(offerId: number, studentId: number) {
    return prisma.programApplication.findUnique({
      where: {
        offerId_studentId: {
          offerId,
          studentId,
        },
      },
    });
  }

  async getStudentApplications(
    filters: ApplicationFilters,
    pagination?: PaginationOptions
  ) {
    const where: any = {};

    if (filters.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters.offerId) {
      where.offerId = filters.offerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit;

    const [applications, total] = await Promise.all([
      prisma.programApplication.findMany({
        where,
        include: {
          offer: {
            select: {
              id: true,
              title: true,
              location: true,
              workMode: true,
              status: true,
              program: {
                select: {
                  title: true,
                  university: {
                    select: {
                      universityName: true,
                    },
                  },
                },
              },
              company: {
                select: {
                  companyName: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
        skip,
        take,
      }),
      prisma.programApplication.count({ where }),
    ]);

    return { applications, total };
  }

  async getOfferApplications(offerId: number) {
    return prisma.programApplication.findMany({
      where: { offerId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            resumeUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            careerField: true,
            city: true,
            country: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async countApplicationsByOffer(offerId: number) {
    return prisma.programApplication.count({
      where: { offerId },
    });
  }
}
