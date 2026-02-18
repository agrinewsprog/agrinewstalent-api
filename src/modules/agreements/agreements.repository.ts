import { prisma } from '../../config/database';
import { CreateAgreementDto } from './agreements.dto';

export class AgreementsRepository {
  // ============================================================
  // CREATE AGREEMENT
  // ============================================================

  async create(data: CreateAgreementDto) {
    return prisma.agreement.create({
      data: {
        universityId: data.universityId,
        companyId: data.companyId,
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        university: {
          select: {
            id: true,
            universityName: true,
            city: true,
            country: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
            industry: true,
            city: true,
            country: true,
          },
        },
      },
    });
  }

  // ============================================================
  // FIND ALL AGREEMENTS
  // ============================================================

  async findAll(
    skip: number,
    take: number,
    status?: string,
    universityId?: number,
    companyId?: number
  ) {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (universityId) {
      where.universityId = universityId;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    const [agreements, total] = await Promise.all([
      prisma.agreement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          university: {
            select: {
              id: true,
              universityName: true,
              city: true,
              country: true,
            },
          },
          company: {
            select: {
              id: true,
              companyName: true,
              industry: true,
              city: true,
              country: true,
            },
          },
        },
      }),
      prisma.agreement.count({ where }),
    ]);

    return { agreements, total };
  }

  // ============================================================
  // FIND BY ID
  // ============================================================

  async findById(id: number) {
    return prisma.agreement.findUnique({
      where: { id },
      include: {
        university: {
          select: {
            id: true,
            userId: true,
            universityName: true,
            city: true,
            country: true,
          },
        },
        company: {
          select: {
            id: true,
            userId: true,
            companyName: true,
            industry: true,
            city: true,
            country: true,
          },
        },
      },
    });
  }

  // ============================================================
  // UPDATE STATUS
  // ============================================================

  async updateStatus(id: number, status: string) {
    return prisma.agreement.update({
      where: { id },
      data: { status: status as any },
      include: {
        university: {
          select: {
            id: true,
            universityName: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }

  // ============================================================
  // DELETE AGREEMENT
  // ============================================================

  async delete(id: number) {
    return prisma.agreement.delete({
      where: { id },
    });
  }

  // ============================================================
  // CHECK IF AGREEMENT EXISTS
  // ============================================================

  async existsByUniversityAndCompany(universityId: number, companyId: number) {
    const agreement = await prisma.agreement.findFirst({
      where: {
        universityId,
        companyId,
        status: {
          in: ['PENDING', 'ACTIVE'],
        },
      },
    });

    return !!agreement;
  }
}
