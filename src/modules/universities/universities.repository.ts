import { prisma } from '../../config/database';

export interface CreateInviteData {
  universityId: number;
  inviteCode: string;
  maxUses?: number;
  expiresAt?: Date;
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

export class UniversitiesRepository {
  // INVITE MANAGEMENT
  async createInvite(data: CreateInviteData) {
    return prisma.universityInvite.create({
      data: {
        universityId: data.universityId,
        inviteCode: data.inviteCode,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
        createdBy: data.createdBy,
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

  async findInviteByCode(inviteCode: string) {
    return prisma.universityInvite.findUnique({
      where: { inviteCode },
      include: {
        university: {
          select: {
            id: true,
            universityName: true,
          },
        },
      },
    });
  }

  async incrementInviteUses(inviteId: number) {
    return prisma.universityInvite.update({
      where: { id: inviteId },
      data: {
        currentUses: {
          increment: 1,
        },
      },
    });
  }

  async getUniversityInvites(universityId: number) {
    return prisma.universityInvite.findMany({
      where: { universityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // MEMBERSHIP MANAGEMENT
  async createMembership(studentId: number, universityId: number, inviteId?: number) {
    return prisma.universityMembership.create({
      data: {
        studentId,
        universityId,
        inviteId,
      },
      include: {
        university: {
          select: {
            universityName: true,
          },
        },
        student: {
          select: {
            firstName: true,
            lastName: true,
            careerField: true,
          },
        },
      },
    });
  }

  async findMembershipByStudentId(studentId: number) {
    return prisma.universityMembership.findUnique({
      where: { studentId },
      include: {
        university: {
          select: {
            id: true,
            universityName: true,
          },
        },
      },
    });
  }

  async findStudentsByUniversity(
    filters: StudentsFilters,
    pagination?: PaginationOptions
  ) {
    const where: any = {
      universityId: filters.universityId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    // Search in student name or career field
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
              linkedinUrl: true,
              githubUrl: true,
              city: true,
              country: true,
              bio: true,
              skills: true,
              careerField: true,
              dateOfBirth: true,
            },
          },
          invite: {
            select: {
              inviteCode: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take,
      }),
      prisma.universityMembership.count({ where }),
    ]);

    return { memberships, total };
  }

  async countStudentsByUniversity(universityId: number) {
    return prisma.universityMembership.count({
      where: {
        universityId,
        status: 'ACTIVE',
      },
    });
  }
}
