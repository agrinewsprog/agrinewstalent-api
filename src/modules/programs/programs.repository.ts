import { prisma } from '../../config/database';

export interface CreateProgramData {
  universityId: number;
  title: string;
  description?: string | null;
  rules?: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive?: boolean;
  requiresCourseId?: number | null;
  maxStudents?: number | null;
}

export interface UpdateProgramData {
  title?: string;
  description?: string | null;
  rules?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive?: boolean;
  requiresCourseId?: number | null;
  maxStudents?: number | null;
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

// ────────────────────────────────────────────────────────────────────
// helpers
// ────────────────────────────────────────────────────────────────────
function formatProgram(p: any) {
  return {
    id: p.id,
    universityId: p.universityId,
    title: p.title,
    description: p.description ?? null,
    rules: p.rules ?? null,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.isActive ? 'ACTIVE' : 'CLOSED',
    requiresCourseId: p.requiresCourseId ?? null,
    maxStudents: p.maxStudents ?? null,
    university: p.university ?? null,
    companiesCount: p._count?.companies ?? 0,
    approvedCompaniesCount: Array.isArray(p._approvedCompanies) ? p._approvedCompanies.length : 0,
    offersCount: p._count?.offers ?? 0,
    applicationsCount: Array.isArray(p._allOffers)
      ? (p._allOffers as any[]).reduce((sum: number, o: any) => sum + (o._count?.applications ?? 0), 0)
      : 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export class ProgramsRepository {
  // ── PROGRAM CRUD ─────────────────────────────────────────────────
  async createProgram(data: CreateProgramData) {
    const created = await prisma.program.create({
      data: {
        universityId: data.universityId,
        title: data.title,
        description: data.description,
        rules: data.rules,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive ?? true,
        requiresCourseId: data.requiresCourseId,
        maxStudents: data.maxStudents,
      },
      include: {
        university: { select: { universityName: true } },
        _count: { select: { companies: true, offers: true } },
      },
    });
    return formatProgram({ ...created, _approvedCompanies: [], _allOffers: [] });
  }

  async updateProgram(id: number, data: UpdateProgramData) {
    const updated = await prisma.program.update({
      where: { id },
      data,
      include: {
        university: { select: { id: true, userId: true, universityName: true } },
      },
    });
    return formatProgram({ ...updated, _count: undefined, _approvedCompanies: [], _allOffers: [] });
  }

  async deleteProgram(id: number) {
    await prisma.program.delete({ where: { id } });
  }

  async findRawProgramById(id: number) {
    return prisma.program.findUnique({
      where: { id },
      select: { id: true, universityId: true },
    });
  }

  async findProgramById(id: number) {
    const p = await prisma.program.findUnique({
      where: { id },
      include: {
        university: {
          select: { id: true, userId: true, universityName: true },
        },
        companies: {
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
        },
        offers: {
          include: {
            company: { select: { id: true, companyName: true, logoUrl: true } },
            _count: { select: { applications: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { companies: true, offers: true } },
      },
    });
    if (!p) return null;

    const approvedCompanies = (p.companies as any[]).filter((c) => c.status === 'APPROVED');
    const applicationsCount = (p.offers as any[]).reduce(
      (sum, o) => sum + (o._count?.applications ?? 0),
      0,
    );

    return {
      id: p.id,
      universityId: p.universityId,
      title: p.title,
      description: p.description ?? null,
      rules: (p as any).rules ?? null,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.isActive ? 'ACTIVE' : 'CLOSED',
      requiresCourseId: p.requiresCourseId ?? null,
      maxStudents: p.maxStudents ?? null,
      university: p.university,
      companiesCount: p._count.companies,
      approvedCompaniesCount: approvedCompanies.length,
      offersCount: p._count.offers,
      applicationsCount,
      companies: (p.companies as any[]).map((c) => ({
        id: c.id,
        status: c.status,
        requestedAt: c.requestedAt,
        reviewedAt: c.reviewedAt ?? null,
        company: c.company,
      })),
      offers: (p.offers as any[]).map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        location: o.location ?? null,
        salary: o.salary ?? null,
        workMode: o.workMode ?? null,
        contractType: o.contractType ?? null,
        experienceLevel: o.experienceLevel ?? null,
        status: o.status,
        maxApplicants: o.maxApplicants ?? null,
        applicationsCount: o._count?.applications ?? 0,
        company: o.company,
        createdAt: o.createdAt,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async findProgramsByUniversity(
    filters: ProgramFilters,
    pagination?: PaginationOptions,
  ) {
    const where: any = {};
    if (filters.universityId !== undefined) where.universityId = filters.universityId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit;

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        include: {
          university: { select: { universityName: true } },
          // Approved companies (for count)
          companies: {
            where: { status: 'APPROVED' },
            select: { id: true },
          },
          // All offers with application counts
          offers: {
            select: {
              id: true,
              _count: { select: { applications: true } },
            },
          },
          _count: { select: { companies: true, offers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.program.count({ where }),
    ]);

    return {
      programs: programs.map((p) =>
        formatProgram({
          ...p,
          _approvedCompanies: p.companies,
          _allOffers: p.offers,
        }),
      ),
      total,
    };
  }

  // ── ACTIVE PROGRAMS (for Company / Student views) ────────────────
  async findActivePrograms(pagination?: PaginationOptions) {
    const where = { isActive: true };
    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit;

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        include: {
          university: { select: { id: true, universityName: true } },
          companies: {
            where: { status: 'APPROVED' },
            select: { id: true },
          },
          offers: {
            select: {
              id: true,
              _count: { select: { applications: true } },
            },
          },
          _count: { select: { companies: true, offers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.program.count({ where }),
    ]);

    return {
      programs: programs.map((p) =>
        formatProgram({
          ...p,
          _approvedCompanies: p.companies,
          _allOffers: p.offers,
        }),
      ),
      total,
    };
  }

  async findActiveProgramsByUniversity(
    universityId: number,
    pagination?: PaginationOptions,
  ) {
    const where = { universityId, isActive: true };
    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit;

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        include: {
          university: { select: { id: true, universityName: true } },
          companies: {
            where: { status: 'APPROVED' },
            select: { id: true },
          },
          offers: {
            select: {
              id: true,
              _count: { select: { applications: true } },
            },
          },
          _count: { select: { companies: true, offers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.program.count({ where }),
    ]);

    return {
      programs: programs.map((p) =>
        formatProgram({
          ...p,
          _approvedCompanies: p.companies,
          _allOffers: p.offers,
        }),
      ),
      total,
    };
  }

  // ── COMPANY INTEREST ─────────────────────────────────────────────
  async createCompanyInterest(programId: number, companyId: number) {
    return prisma.programCompany.create({
      data: { programId, companyId },
      include: {
        company: { select: { companyName: true, industry: true } },
        program: { select: { title: true } },
      },
    });
  }

  async findCompanyInterest(programId: number, companyId: number) {
    return prisma.programCompany.findUnique({
      where: { programId_companyId: { programId, companyId } },
    });
  }

  async updateCompanyStatus(
    programId: number,
    companyId: number,
    status: string,
    reviewedBy: number,
  ) {
    return prisma.programCompany.update({
      where: { programId_companyId: { programId, companyId } },
      data: {
        status: status as any,
        reviewedAt: new Date(),
        reviewedBy,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            industry: true,
            logoUrl: true,
            website: true,
            description: true,
            city: true,
            country: true,
          },
        },
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
            description: true,
            city: true,
            country: true,
            size: true,
            companySize: true,
            foundedYear: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async getApprovedCompaniesForProgram(programId: number) {
    return prisma.programOffer.findMany({
      where: { programId, status: 'APPROVED' },
      select: {
        id: true,
        companyId: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            description: true,
            city: true,
            country: true,
            industry: true,
            website: true,
            user: {
              select: { status: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProgramCompanyDetail(programId: number, companyId: number) {
    return prisma.programCompany.findUnique({
      where: { programId_companyId: { programId, companyId } },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            industry: true,
            logoUrl: true,
            website: true,
            description: true,
            city: true,
            country: true,
            size: true,
            companySize: true,
            foundedYear: true,
            linkedinUrl: true,
            descriptionLong: true,
            contactPerson: true,
            contactEmail: true,
            contactPhone: true,
            workModes: true,
            vacancyTypes: true,
            workingLanguages: true,
            participatesInInternships: true,
          },
        },
      },
    });
  }

  async getCompanyOffersForUniversity(companyId: number, universityId: number) {
    return prisma.programOffer.findMany({
      where: {
        companyId,
        program: { universityId },
      },
      select: {
        id: true,
        programId: true,
        companyId: true,
        title: true,
        description: true,
        location: true,
        contractType: true,
        workMode: true,
        status: true,
        jobOfferId: true,
        createdAt: true,
        approvedAt: true,
        program: {
          select: {
            id: true,
            title: true,
          },
        },
        jobOffer: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── PROGRAM OFFERS ───────────────────────────────────────────────
  async createProgramOfferWithJobOffer(offerData: {
    programId: number;
    companyId: number;
    title: string;
    description: string;
    requirements?: string | null;
    location?: string | null;
    salary?: string | null;
    workMode?: string | null;
    contractType?: string | null;
    experienceLevel?: string | null;
    maxApplicants?: number | null;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1) Create JobOffer
      const jobOffer = await tx.jobOffer.create({
        data: {
          companyId: offerData.companyId,
          title: offerData.title,
          description: offerData.description,
          requirements: offerData.requirements ?? null,
          location: offerData.location ?? null,
          salary: offerData.salary ?? null,
          workMode: offerData.workMode ?? null,
          contractType: offerData.contractType ?? null,
          experienceLevel: offerData.experienceLevel ?? null,
          status: 'DRAFT',
        },
      });

      // 2) Create ProgramOffer linked to JobOffer with PENDING status
      const programOffer = await tx.programOffer.create({
        data: {
          programId: offerData.programId,
          companyId: offerData.companyId,
          jobOfferId: jobOffer.id,
          title: offerData.title,
          description: offerData.description,
          requirements: offerData.requirements ?? null,
          location: offerData.location ?? null,
          salary: offerData.salary ?? null,
          workMode: offerData.workMode ?? null,
          contractType: offerData.contractType ?? null,
          experienceLevel: offerData.experienceLevel ?? null,
          maxApplicants: offerData.maxApplicants ?? null,
          status: 'PENDING',
        },
        include: {
          program: {
            select: {
              title: true,
              university: { select: { universityName: true } },
            },
          },
          company: { select: { companyName: true } },
        },
      });

      return { jobOffer, programOffer };
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
            university: { select: { userId: true, universityName: true } },
          },
        },
        company: {
          select: { id: true, companyName: true, industry: true, logoUrl: true },
        },
        jobOffer: true,
        _count: { select: { applications: true } },
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
      include: {
        program: { select: { id: true, title: true } },
        company: { select: { id: true, companyName: true } },
      },
    });
  }

  async getProgramOffers(programId: number) {
    return prisma.programOffer.findMany({
      where: { programId },
      include: {
        company: { select: { id: true, companyName: true, industry: true, logoUrl: true } },
        jobOffer: { select: { id: true, status: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompanyProgramOffers(companyId: number, programId?: number) {
    const where: any = { companyId };
    if (programId !== undefined) where.programId = programId;

    return prisma.programOffer.findMany({
      where,
      include: {
        program: {
          select: {
            title: true,
            university: { select: { universityName: true } },
          },
        },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── PROGRAM APPLICATIONS ─────────────────────────────────────────
  async createApplication(data: any) {
    return prisma.programApplication.create({
      data,
      include: {
        offer: {
          select: {
            title: true,
            program: { select: { title: true } },
          },
        },
        student: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findApplicationByOfferAndStudent(offerId: number, studentId: number) {
    return prisma.programApplication.findUnique({
      where: { offerId_studentId: { offerId, studentId } },
    });
  }

  async getStudentApplications(
    filters: ApplicationFilters,
    pagination?: PaginationOptions,
  ) {
    const where: any = {};
    if (filters.studentId !== undefined) where.studentId = filters.studentId;
    if (filters.offerId !== undefined) where.offerId = filters.offerId;
    if (filters.status) where.status = filters.status;

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
                  university: { select: { universityName: true } },
                },
              },
              company: { select: { companyName: true, logoUrl: true } },
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

  /** Applications for all offers of a given program (university view) */
  async getProgramApplicationsForUniversity(
    programId: number,
    filters: ApplicationFilters,
    pagination?: PaginationOptions,
  ) {
    const where: any = {
      offer: { programId },
    };
    if (filters.status) where.status = filters.status;
    if (filters.offerId !== undefined) where.offerId = filters.offerId;

    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit;

    const [applications, total] = await Promise.all([
      prisma.programApplication.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
              careerField: true,
              resumeUrl: true,
              linkedinUrl: true,
              city: true,
              country: true,
              avatarUrl: true,
              user: { select: { email: true } },
            },
          },
          offer: {
            select: {
              id: true,
              jobOfferId: true,
              title: true,
              companyId: true,
              company: { select: { id: true, companyName: true, logoUrl: true } },
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
    return prisma.programApplication.count({ where: { offerId } });
  }
}
