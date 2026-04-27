import { prisma } from '../../config/database';
import { env } from '../../config/env';

export interface CreateInviteData {
  universityId: number;
  inviteCode: string;
  maxUses?: number;
  expiresAt?: Date | null;
  createdBy: number;
}

export interface StudentsFilters {
  universityId: number;
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface UpdateProfileData {
  universityName?: string;
  logoUrl?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  website?: string | null;
  careers?: string | null;       // JSON string
  convenioTypes?: string | null; // JSON string
}

// ────────────────────────────────────────────────────────────────────
// helpers
// ────────────────────────────────────────────────────────────────────
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatProfile(profile: any, email: string) {
  return {
    id: profile.id,
    name: profile.universityName,
    email,
    logoUrl: profile.logoUrl ?? null,
    location: profile.location ?? null,
    city: profile.city ?? null,
    country: profile.country ?? null,
    description: profile.description ?? null,
    website: profile.website ?? null,
    careers: parseJsonArray(profile.careers),
    convenioTypes: parseJsonArray(profile.convenioTypes),
    verified: profile.verified ?? false,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function formatInvite(inv: any) {
  const now = new Date();
  // Defensivo: currentUses puede ser null/undefined en registros legacy
  const usedCount = typeof inv.currentUses === 'number' ? inv.currentUses : 0;
  const maxUses: number | null = inv.maxUses ?? null;
  const expired = inv.expiresAt instanceof Date ? inv.expiresAt < now :
    (inv.expiresAt ? new Date(inv.expiresAt) < now : false);
  const maxedOut = maxUses !== null ? usedCount >= maxUses : false;
  const isActive = !expired && !maxedOut;
  const frontendUrl = env.frontendUrl ?? 'http://localhost:5173';

  return {
    id: inv.id,
    code: inv.inviteCode ?? '',
    inviteUrl: `${frontendUrl}/registro?inviteCode=${inv.inviteCode ?? ''}`,
    universityId: inv.universityId,
    universityName: inv.university?.universityName ?? null,
    maxUses,
    usedCount,
    expiresAt: inv.expiresAt ?? null,
    isActive,
    isExpired: expired,
    status: isActive ? 'ACTIVE' : expired ? 'EXPIRED' : 'MAXED',
    createdAt: inv.createdAt,
  };
}

export class UniversitiesRepository {
  // ── PROFILE ────────────────────────────────────────────────────────
  async getProfileByUserId(userId: number) {
    const profile = await prisma.universityProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true } },
      },
    });
    if (!profile) return null;
    return formatProfile(profile, profile.user.email);
  }

  async updateProfileByUserId(userId: number, data: UpdateProfileData) {
    const profile = await prisma.universityProfile.update({
      where: { userId },
      data,
      include: {
        user: { select: { email: true } },
      },
    });
    return formatProfile(profile, profile.user.email);
  }

  // ── PENDING OFFERS ──────────────────────────────────────────────────
  async getPendingProgramOffers(universityId: number) {
    return prisma.programOffer.findMany({
      where: {
        status: 'PENDING',
        program: { universityId },
      },
      include: {
        program: { select: { id: true, title: true } },
        company: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── DASHBOARD ──────────────────────────────────────────────────────
  async getDashboardMetrics(universityId: number) {
    const [
      totalStudents,
      activeStudents,
      totalPrograms,
      activePrograms,
      totalInvites,
      inviteCandidates,
      totalApplicationsInPrograms,
      companiesInPrograms,
      pendingCompaniesInPrograms,
      totalProgramOffers,
      pendingProgramOffers,
      approvedProgramOffers,
      rejectedProgramOffers,
    ] = await Promise.all([
      // Total memberships
      prisma.universityMembership.count({ where: { universityId } }),

      // Active memberships
      prisma.universityMembership.count({
        where: { universityId, status: 'ACTIVE' },
      }),

      // Total programs
      prisma.program.count({ where: { universityId } }),

      // Active programs
      prisma.program.count({ where: { universityId, isActive: true } }),

      prisma.universityInvite.count({ where: { universityId } }),
      prisma.universityInvite.findMany({
        where: {
          universityId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          id: true,
          maxUses: true,
          currentUses: true,
        },
      }),

      // Total program applications via program offers
      prisma.programApplication.count({
        where: {
          offer: { program: { universityId } },
        },
      }),

      // Distinct companies across all programs of this university
      prisma.programCompany.groupBy({
        by: ['companyId'],
        where: { program: { universityId } },
      }),

      // Pending company requests
      prisma.programCompany.count({
        where: {
          program: { universityId },
          status: 'PENDING',
        },
      }),

      // Total ProgramOffers
      prisma.programOffer.count({
        where: { program: { universityId } },
      }),

      // Pending ProgramOffers
      prisma.programOffer.count({
        where: { program: { universityId }, status: 'PENDING' },
      }),

      // Approved ProgramOffers
      prisma.programOffer.count({
        where: { program: { universityId }, status: 'APPROVED' },
      }),

      // Rejected ProgramOffers
      prisma.programOffer.count({
        where: { program: { universityId }, status: 'REJECTED' },
      }),
    ]);

    const activeInvites = inviteCandidates.filter((invite) => (
      invite.maxUses === null || invite.currentUses < invite.maxUses
    )).length;

    return {
      totalStudents,
      activeStudents,
      totalPrograms,
      activePrograms,
      totalInvites,
      activeInvites,
      totalApplicationsInPrograms,
      totalCompaniesInPrograms: companiesInPrograms.length,
      pendingCompaniesInPrograms,
      totalProgramOffers,
      pendingProgramOffers,
      approvedProgramOffers,
      rejectedProgramOffers,
    };
  }

  // ── INVITE MANAGEMENT ──────────────────────────────────────────────
  async createInvite(data: CreateInviteData) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:repository:createInvite] data=%j', {
        universityId: data.universityId,
        inviteCode: data.inviteCode,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
        createdBy: data.createdBy,
      });
    }
    const inv = await prisma.universityInvite.create({
      data: {
        universityId: data.universityId,
        inviteCode: data.inviteCode,
        maxUses: data.maxUses ?? null,
        expiresAt: data.expiresAt ?? null,
        createdBy: data.createdBy,
      },
      include: {
        university: { select: { universityName: true } },
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:repository:createInvite] DB row created: id=%d code=%s universityId=%d', inv.id, inv.inviteCode, inv.universityId);
    }

    return formatInvite(inv);
  }

  async findInviteByCode(inviteCode: string) {
    // always compare uppercase
    return prisma.universityInvite.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: {
        university: { select: { id: true, universityName: true } },
      },
    });
  }

  async findInviteById(inviteId: number) {
    const inv = await prisma.universityInvite.findUnique({
      where: { id: inviteId },
      include: { university: { select: { universityName: true } } },
    });
    if (!inv) return null;
    return formatInvite(inv);
  }

  async incrementInviteUses(inviteId: number) {
    return prisma.universityInvite.update({
      where: { id: inviteId },
      data: { currentUses: { increment: 1 } },
    });
  }

  async getUniversityInvites(universityId: number) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:repository:getUniversityInvites] query universityId=%d', universityId);
    }
    const invites = await prisma.universityInvite.findMany({
      where: { universityId },
      include: { university: { select: { universityName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:repository:getUniversityInvites] rows=%d', invites.length);
    }
    return invites.map(formatInvite);
  }

  async deleteInvite(inviteId: number) {
    return prisma.universityInvite.delete({ where: { id: inviteId } });
  }

  async findRawInviteById(inviteId: number) {
    return prisma.universityInvite.findUnique({ where: { id: inviteId } });
  }

  // ── MEMBERSHIP MANAGEMENT ─────────────────────────────────────────
  async createMembership(
    studentId: number,
    universityId: number,
    inviteId?: number,
  ) {
    return prisma.universityMembership.create({
      data: { studentId, universityId, inviteId },
      include: {
        university: { select: { universityName: true } },
        student: {
          select: { firstName: true, lastName: true, careerField: true },
        },
      },
    });
  }

  async findMembershipByStudentId(studentId: number) {
    return prisma.universityMembership.findUnique({
      where: { studentId },
      include: {
        university: { select: { id: true, universityName: true } },
      },
    });
  }

  async findStudentsByUniversity(
    filters: StudentsFilters,
    pagination?: PaginationOptions,
  ) {
    const where: any = { universityId: filters.universityId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.student = {
        OR: [
          { firstName: { contains: filters.search } },
          { lastName: { contains: filters.search } },
          { careerField: { contains: filters.search } },
        ],
      };
    }

    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit;

    const [memberships, total] = await Promise.all([
      prisma.universityMembership.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              resumeUrl: true,
              avatarUrl: true,
              linkedinUrl: true,
              githubUrl: true,
              city: true,
              country: true,
              bio: true,
              skills: true,
              careerField: true,
              dateOfBirth: true,
              isActiveStudent: true,
              createdAt: true,
              user: { select: { email: true } },
            },
          },
          university: { select: { id: true, universityName: true } },
          invite: { select: { inviteCode: true } },
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take,
      }),
      prisma.universityMembership.count({ where }),
    ]);

    return { memberships, total };
  }

  async findStudentMembershipByUserIdAndUniversity(
    userId: number,
    universityId: number,
  ) {
    return prisma.universityMembership.findFirst({
      where: {
        universityId,
        student: { userId },
      },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            resumeUrl: true,
            avatarUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            city: true,
            country: true,
            bio: true,
            skills: true,
            careerField: true,
            dateOfBirth: true,
            isActiveStudent: true,
            createdAt: true,
            user: { select: { email: true } },
            education: { orderBy: { startDate: 'desc' } },
            experience: { orderBy: { startDate: 'desc' } },
            languages: { orderBy: { language: 'asc' } },
          },
        },
        university: { select: { id: true, universityName: true } },
        invite: { select: { inviteCode: true } },
      },
    });
  }

  async findStudentMembershipByProfileIdAndUniversity(
    studentProfileId: number,
    universityId: number,
  ) {
    return prisma.universityMembership.findFirst({
      where: {
        universityId,
        studentId: studentProfileId,
      },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            resumeUrl: true,
            avatarUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            city: true,
            country: true,
            bio: true,
            skills: true,
            careerField: true,
            dateOfBirth: true,
            isActiveStudent: true,
            createdAt: true,
            user: { select: { email: true } },
            education: { orderBy: { startDate: 'desc' } },
            experience: { orderBy: { startDate: 'desc' } },
            languages: { orderBy: { language: 'asc' } },
          },
        },
        university: { select: { id: true, universityName: true } },
        invite: { select: { inviteCode: true } },
      },
    });
  }

  async findStudentApplicationsForUniversity(
    studentProfileId: number,
    universityId: number,
  ) {
    return prisma.programApplication.findMany({
      where: {
        studentId: studentProfileId,
        offer: {
          program: { universityId },
        },
      },
      include: {
        offer: {
          select: {
            id: true,
            title: true,
            jobOfferId: true,
            programId: true,
            status: true,
            location: true,
            contractType: true,
            workMode: true,
            program: { select: { id: true, title: true } },
            company: { select: { id: true, companyName: true, logoUrl: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async countStudentsByUniversity(universityId: number) {
    return prisma.universityMembership.count({
      where: { universityId, status: 'ACTIVE' },
    });
  }

  // ── COMPANY PROFILE FOR UNIVERSITY ─────────────────────────────────
  async getCompanyProfileForUniversity(companyId: number, universityId: number) {
    const companySelect = {
      id: true,
      userId: true,
      companyName: true,
      logoUrl: true,
      description: true,
      website: true,
      industry: true,
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
      createdAt: true,
      user: { select: { email: true, status: true } },
    } as const;

    let company = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: companySelect,
    });

    if (!company) return null;

    // Use the real CompanyProfile.id for all further queries
    const realCompanyId = company.id;

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:repo:getCompanyProfileForUniversity] input companyId=%d resolved realCompanyId=%d universityId=%d',
        companyId, realCompanyId, universityId,
      );
    }

    // 2) Get ALL ProgramOffer records for this company in programs of this university
    const programOffers = await prisma.programOffer.findMany({
      where: {
        companyId: realCompanyId,
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
            isActive: true,
            startDate: true,
            endDate: true,
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

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:repo:getCompanyProfileForUniversity] programOffers found=%d for realCompanyId=%d universityId=%d',
        programOffers.length, realCompanyId, universityId,
      );
      for (const po of programOffers) {
        console.log(
          '[DEV:repo]   ProgramOffer id=%d companyId=%d programId=%d status=%s title=%s jobOfferId=%s',
          po.id, po.companyId, po.programId, po.status, po.title, po.jobOfferId,
        );
      }
    }

    return { company, programOffers };
  }
}

