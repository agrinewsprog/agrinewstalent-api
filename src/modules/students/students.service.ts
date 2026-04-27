import { prisma } from '../../config/database';
import fs from 'fs';
import path from 'path';

const PUBLIC_ROOT = path.join(__dirname, '..', '..', '..', 'public');

function deleteFile(relativePath: string | null | undefined) {
  if (!relativePath) return;
  // relativePath looks like /uploads/avatars/avatar-123.jpg
  const safeRelativePath = relativePath.replace(/^[/\\]+/, '');
  const abs = path.join(PUBLIC_ROOT, safeRelativePath);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
}

function parseJson(val: string | null): any[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter((item) => typeof item === 'string' && item.length > 0)))
      : [];
  } catch {
    return [];
  }
}

export class StudentsService {
  // ── University Membership ─────────────────────────────────────────

  private formatUniversity(profile: {
    id: number;
    universityName: string;
    logoUrl: string | null;
    location: string | null;
    description: string | null;
  }) {
    return {
      id: profile.id,
      name: profile.universityName,
      logoUrl: profile.logoUrl,
      location: profile.location,
      description: profile.description,
    };
  }

  async redeemInvite(userId: number, inviteCode: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Student profile not found');

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:redeemInvite] userId=%d studentId=%d inviteCode=%s', userId, profile.id, inviteCode);
    }

    // Check existing membership
    const existing = await prisma.universityMembership.findUnique({
      where: { studentId: profile.id },
    });
    if (existing) {
      throw new Error('Student already belongs to a university');
    }

    // Find invite
    const invite = await prisma.universityInvite.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: {
        university: {
          select: { id: true, universityName: true, logoUrl: true, location: true, description: true },
        },
      },
    });
    if (!invite) throw new Error('Invalid invite code');

    // Validate expiration
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new Error('Invite code has expired');
    }

    // Validate max uses
    if (invite.maxUses !== null && invite.currentUses >= invite.maxUses) {
      throw new Error('Invite code has reached its maximum uses');
    }

    // Create membership + increment uses in transaction
    const membership = await prisma.$transaction(async (tx) => {
      const m = await tx.universityMembership.create({
        data: {
          studentId: profile.id,
          universityId: invite.universityId,
          inviteId: invite.id,
        },
      });
      await tx.universityInvite.update({
        where: { id: invite.id },
        data: { currentUses: { increment: 1 } },
      });
      return m;
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:redeemInvite] linked studentId=%d to universityId=%d membershipId=%d', profile.id, invite.universityId, membership.id);
    }

    return this.formatUniversity(invite.university);
  }

  async getMyUniversity(userId: number) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Student profile not found');

    const membership = await prisma.universityMembership.findUnique({
      where: { studentId: profile.id },
      include: {
        university: {
          select: { id: true, universityName: true, logoUrl: true, location: true, description: true },
        },
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getMyUniversity] userId=%d studentId=%d linked=%s', userId, profile.id, !!membership);
    }

    if (!membership) return null;
    return this.formatUniversity(membership.university);
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async getStudentContext(userId: number) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: { universityMembership: true },
    });
    if (!profile) throw new Error('Student profile not found');
    if (!profile.universityMembership || profile.universityMembership.status !== 'ACTIVE') {
      throw new Error('Student is not linked to any university');
    }
    return {
      studentId: profile.id,
      universityId: profile.universityMembership.universityId,
    };
  }

  private async validateProgramBelongsToUniversity(programId: number, universityId: number) {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { university: { select: { id: true, universityName: true } } },
    });
    if (!program) throw new Error('Program not found');
    if (program.universityId !== universityId) {
      throw new Error('Program does not belong to your university');
    }
    if (!program.isActive) {
      throw new Error('Program is not active');
    }
    return program;
  }

  // ── Program Enrollment ────────────────────────────────────────────

  async enrollInProgram(userId: number, programId: number) {
    const ctx = await this.getStudentContext(userId);
    const program = await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:enrollInProgram] userId=%d studentId=%d programId=%d universityId=%d', userId, ctx.studentId, programId, ctx.universityId);
    }

    // Check maxStudents limit
    if (program.maxStudents !== null) {
      const enrolledCount = await prisma.programEnrollment.count({ where: { programId } });
      if (enrolledCount >= program.maxStudents) {
        throw new Error('Program has reached its maximum number of students');
      }
    }

    // Check for existing enrollment
    const existing = await prisma.programEnrollment.findUnique({
      where: { programId_studentId: { programId, studentId: ctx.studentId } },
    });
    if (existing) {
      throw new Error('Already enrolled in this program');
    }

    const enrollment = await prisma.programEnrollment.create({
      data: { programId, studentId: ctx.studentId },
      include: {
        program: { select: { id: true, title: true, description: true, isActive: true, startDate: true, endDate: true } },
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:enrollInProgram] created enrollmentId=%d programId=%d studentId=%d', enrollment.id, programId, ctx.studentId);
    }

    return {
      id: enrollment.id,
      programId: enrollment.programId,
      programTitle: enrollment.program.title,
      enrolledAt: enrollment.enrolledAt,
    };
  }

  // ── Programs (STUDENT view — APPROVED only) ───────────────────────

  async getMyPrograms(userId: number) {
    const ctx = await this.getStudentContext(userId);

    const programs = await prisma.program.findMany({
      where: { universityId: ctx.universityId, isActive: true },
      include: {
        university: { select: { id: true, universityName: true } },
        offers: {
          where: { status: 'APPROVED' },
          select: { id: true, companyId: true },
        },
        enrollments: {
          where: { studentId: ctx.studentId },
          select: { id: true, enrolledAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getMyPrograms] userId=%d studentId=%d universityId=%d totalPrograms=%d', userId, ctx.studentId, ctx.universityId, programs.length);
    }

    return {
      programs: programs.map((p) => {
        const uniqueCompanyIds = new Set(p.offers.map((o) => o.companyId));
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          rules: p.rules,
          startDate: p.startDate,
          endDate: p.endDate,
          status: 'ACTIVE' as const,
          universityId: p.university.id,
          universityName: p.university.universityName,
          maxStudents: p.maxStudents,
          approvedOffersCount: p.offers.length,
          approvedCompaniesCount: uniqueCompanyIds.size,
          isEnrolled: p.enrollments.length > 0,
          enrolledAt: p.enrollments[0]?.enrolledAt ?? null,
          createdAt: p.createdAt,
        };
      }),
    };
  }

  async getMyProgramDetail(userId: number, programId: number) {
    const ctx = await this.getStudentContext(userId);

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        university: { select: { id: true, universityName: true } },
        offers: {
          where: { status: 'APPROVED' },
          select: { id: true, companyId: true },
        },
        enrollments: {
          where: { studentId: ctx.studentId },
          select: { id: true, enrolledAt: true },
        },
      },
    });

    if (!program) throw new Error('Program not found');
    if (program.universityId !== ctx.universityId) throw new Error('Program does not belong to your university');
    if (!program.isActive) throw new Error('Program is not active');

    const uniqueCompanyIds = new Set(program.offers.map((o) => o.companyId));

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getMyProgramDetail] userId=%d studentId=%d programId=%d approvedOffers=%d approvedCompanies=%d',
        userId, ctx.studentId, programId, program.offers.length, uniqueCompanyIds.size,
      );
    }

    return {
      program: {
        id: program.id,
        title: program.title,
        description: program.description,
        rules: program.rules,
        startDate: program.startDate,
        endDate: program.endDate,
        status: program.isActive ? 'ACTIVE' : 'CLOSED',
        universityId: program.university.id,
        universityName: program.university.universityName,
        maxStudents: program.maxStudents,
        approvedOffersCount: program.offers.length,
        approvedCompaniesCount: uniqueCompanyIds.size,
        isEnrolled: program.enrollments.length > 0,
        enrolledAt: program.enrollments[0]?.enrolledAt ?? null,
        createdAt: program.createdAt,
      },
    };
  }

  async getMyProgramOffers(userId: number, programId: number) {
    const ctx = await this.getStudentContext(userId);
    await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    const offers = await prisma.programOffer.findMany({
      where: { programId, status: 'APPROVED' },
      include: {
        company: { select: { id: true, companyName: true, logoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch student's applications for these offers in a single query
    const offerIds = offers.map((o) => o.id);
    const applications = await prisma.programApplication.findMany({
      where: { studentId: ctx.studentId, offerId: { in: offerIds } },
      select: { offerId: true, status: true },
    });
    const appliedMap = new Map(applications.map((a) => [a.offerId, a.status]));

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getMyProgramOffers] userId=%d studentId=%d programId=%d approvedOffers=%d appliedCount=%d', userId, ctx.studentId, programId, offers.length, applications.length);
    }

    return {
      offers: offers.map((o) => ({
        id: o.id,
        programOfferId: o.id,
        jobOfferId: o.jobOfferId,
        title: o.title,
        description: o.description,
        location: o.location,
        contractType: o.contractType,
        workMode: o.workMode,
        salary: o.salary,
        experienceLevel: o.experienceLevel,
        companyId: o.company.id,
        companyName: o.company.companyName,
        companyLogoUrl: o.company.logoUrl,
        hasApplied: appliedMap.has(o.id),
        applicationStatus: appliedMap.get(o.id) ?? null,
        createdAt: o.createdAt,
      })),
    };
  }

  async getMyProgramCompanies(userId: number, programId: number) {
    const ctx = await this.getStudentContext(userId);
    await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    const approvedOffers = await prisma.programOffer.findMany({
      where: { programId, status: 'APPROVED' },
      select: {
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
          },
        },
      },
    });

    // Deduplicate by company
    const companyMap = new Map<number, {
      id: number;
      companyId: number;
      name: string;
      logoUrl: string | null;
      location: string | null;
      description: string | null;
      industry: string | null;
      approvedOffersCount: number;
    }>();

    for (const o of approvedOffers) {
      const existing = companyMap.get(o.companyId);
      if (existing) {
        existing.approvedOffersCount++;
      } else {
        const city = o.company.city ?? null;
        const country = o.company.country ?? null;
        const location = [city, country].filter(Boolean).join(', ') || null;
        companyMap.set(o.companyId, {
          id: o.companyId,
          companyId: o.companyId,
          name: o.company.companyName,
          logoUrl: o.company.logoUrl ?? null,
          location,
          description: o.company.description ?? null,
          industry: o.company.industry ?? null,
          approvedOffersCount: 1,
        });
      }
    }

    const companies = Array.from(companyMap.values());

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getMyProgramCompanies] userId=%d studentId=%d programId=%d approvedOffers=%d uniqueCompanies=%d',
        userId, ctx.studentId, programId, approvedOffers.length, companies.length,
      );
    }

    return { companies };
  }

  async getMyProgramCompanyDetail(userId: number, programId: number, companyId: number) {
    const ctx = await this.getStudentContext(userId);
    await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    // Count APPROVED offers for this company in this program
    const approvedOffersCount = await prisma.programOffer.count({
      where: { programId, companyId, status: 'APPROVED' },
    });

    if (approvedOffersCount === 0) {
      throw new Error('Company not found in this program');
    }

    // Fetch full company profile
    const companyData = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        companyName: true,
        logoUrl: true,
        description: true,
        city: true,
        country: true,
        industry: true,
        website: true,
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
    });

    if (!companyData) {
      throw new Error('Company not found in this program');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getMyProgramCompanyDetail] userId=%d studentId=%d programId=%d companyId=%d approvedOffers=%d',
        userId, ctx.studentId, programId, companyId, approvedOffersCount,
      );
    }

    const city = companyData.city ?? null;
    const country = companyData.country ?? null;
    const location = [city, country].filter(Boolean).join(', ') || null;

    const companyResponse = {
        id: companyData.id,
        companyId: companyData.id,
        name: companyData.companyName,
        logoUrl: companyData.logoUrl,
        location,
        city,
        country,
        description: companyData.description,
        descriptionLong: companyData.descriptionLong ?? null,
        industry: companyData.industry ?? null,
        website: companyData.website ?? null,
        linkedinUrl: companyData.linkedinUrl ?? null,
        size: companyData.size ?? companyData.companySize ?? null,
        companySize: companyData.companySize ?? null,
        foundedYear: companyData.foundedYear ?? null,
        contactPerson: companyData.contactPerson ?? null,
        contactEmail: companyData.contactEmail ?? null,
        contactPhone: companyData.contactPhone ?? null,
        workModes: parseJson(companyData.workModes),
        vacancyTypes: parseJson(companyData.vacancyTypes),
        workingLanguages: parseJson(companyData.workingLanguages),
        participatesInInternships: companyData.participatesInInternships ?? false,
        approvedOffersCount,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getMyProgramCompanyDetail] companyId=%d keys=%s',
        companyData.id, Object.keys(companyResponse).join(','),
      );
    }

    return { company: companyResponse };
  }

  async getMyProgramOfferDetail(userId: number, programId: number, programOfferId: number) {
    const ctx = await this.getStudentContext(userId);
    await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    const offerInclude = {
      company: {
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          industry: true,
          city: true,
          country: true,
        },
      },
      _count: { select: { applications: true } },
    } as const;

    // Try by ProgramOffer.id first, then fallback to jobOfferId
    let offer = await prisma.programOffer.findUnique({
      where: { id: programOfferId },
      include: offerInclude,
    });

    if (!offer || offer.programId !== programId || offer.status !== 'APPROVED') {
      // Fallback: maybe the front sent a jobOfferId
      const fallback = await prisma.programOffer.findFirst({
        where: { jobOfferId: programOfferId, programId, status: 'APPROVED' },
        include: offerInclude,
      });
      if (fallback) offer = fallback;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getMyProgramOfferDetail] userId=%d studentId=%d programId=%d paramId=%d resolved=%s',
        userId, ctx.studentId, programId, programOfferId, offer ? `programOfferId=${offer.id}` : 'null');
    }

    if (!offer) throw new Error('Offer not found');
    if (offer.programId !== programId) throw new Error('Offer does not belong to this program');
    if (offer.status !== 'APPROVED') throw new Error('Offer not found');

    // Check if student already applied (use resolved offer.id, not the param)
    const existingApp = await prisma.programApplication.findUnique({
      where: { offerId_studentId: { offerId: offer.id, studentId: ctx.studentId } },
    });

    return {
      offer: {
        id: offer.id,
        programOfferId: offer.id,
        jobOfferId: offer.jobOfferId,
        title: offer.title,
        description: offer.description,
        requirements: offer.requirements,
        location: offer.location,
        salary: offer.salary,
        contractType: offer.contractType,
        workMode: offer.workMode,
        experienceLevel: offer.experienceLevel,
        maxApplicants: offer.maxApplicants,
        applicationsCount: offer._count.applications,
        companyId: offer.company.id,
        companyName: offer.company.companyName,
        companyLogoUrl: offer.company.logoUrl,
        companyIndustry: offer.company.industry,
        hasApplied: !!existingApp,
        appliedAt: existingApp?.appliedAt ?? null,
        createdAt: offer.createdAt,
      },
    };
  }

  async applyToOffer(userId: number, programId: number, programOfferId: number, dto: { coverLetter?: string }) {
    const ctx = await this.getStudentContext(userId);
    await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    const applyInclude = { program: { select: { universityId: true } } } as const;

    // Try by ProgramOffer.id first, then fallback to jobOfferId
    let offer = await prisma.programOffer.findUnique({
      where: { id: programOfferId },
      include: applyInclude,
    });
    if (!offer || offer.programId !== programId || offer.status !== 'APPROVED') {
      const fallback = await prisma.programOffer.findFirst({
        where: { jobOfferId: programOfferId, programId, status: 'APPROVED' },
        include: applyInclude,
      });
      if (fallback) offer = fallback;
    }

    if (!offer) throw new Error('Offer not found');
    if (offer.programId !== programId) throw new Error('Offer does not belong to this program');
    if (offer.status !== 'APPROVED') throw new Error('Cannot apply to non-approved offer');

    // Use resolved offer.id for all subsequent queries
    const resolvedOfferId = offer.id;

    // Duplicate check
    const existingApp = await prisma.programApplication.findUnique({
      where: { offerId_studentId: { offerId: resolvedOfferId, studentId: ctx.studentId } },
    });
    if (existingApp) throw new Error('Already applied to this offer');

    // Max applicants check
    if (offer.maxApplicants !== null) {
      const currentCount = await prisma.programApplication.count({ where: { offerId: resolvedOfferId } });
      if (currentCount >= offer.maxApplicants) {
        throw new Error('This offer has reached the maximum number of applicants');
      }
    }

    // Get student resume URL for application
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: ctx.studentId },
      select: { resumeUrl: true },
    });

    const application = await prisma.programApplication.create({
      data: {
        offerId: resolvedOfferId,
        studentId: ctx.studentId,
        coverLetter: dto.coverLetter ?? null,
        resumeUrl: studentProfile?.resumeUrl ?? null,
      },
      include: {
        offer: { select: { id: true, title: true, program: { select: { title: true } } } },
        student: { select: { firstName: true, lastName: true } },
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:applyToOffer] userId=%d studentId=%d programId=%d paramId=%d resolvedOfferId=%d applicationId=%d',
        userId, ctx.studentId, programId, programOfferId, resolvedOfferId, application.id,
      );
    }

    return {
      id: application.id,
      offerId: application.offerId,
      offerTitle: application.offer.title,
      programTitle: application.offer.program.title,
      status: application.status,
      appliedAt: application.appliedAt,
    };
  }

  async applyToOfferSimple(userId: number, offerId: number, dto: { coverLetter?: string }) {
    const ctx = await this.getStudentContext(userId);

    let offer = await prisma.programOffer.findUnique({
      where: { id: offerId },
      include: {
        program: {
          select: { id: true, universityId: true },
        },
      },
    });

    if (!offer || offer.status !== 'APPROVED' || offer.program.universityId !== ctx.universityId) {
      offer = await prisma.programOffer.findFirst({
        where: {
          jobOfferId: offerId,
          status: 'APPROVED',
          program: { universityId: ctx.universityId },
        },
        include: {
          program: {
            select: { id: true, universityId: true },
          },
        },
      });
    }

    if (!offer) throw new Error('Offer not found');
    if (offer.program.universityId !== ctx.universityId) {
      throw new Error('Offer does not belong to your university');
    }

    return this.applyToCanonicalProgramOffer(userId, offer.program.id, offer.id, dto);
  }

  /** Reemplaza toda la educación del estudiante */
  async replaceEducation(
    userId: number,
    education: {
      degree: string;
      institution: string;
      startDate: string;
      endDate?: string;
      current: boolean;
    }[]
  ) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Perfil no encontrado');

    await prisma.studentEducation.deleteMany({ where: { studentId: profile.id } });

    if (education.length > 0) {
      await prisma.studentEducation.createMany({
        data: education.map(e => ({
          studentId: profile.id,
          degree: e.degree,
          institution: e.institution,
          startDate: e.startDate,
          endDate: e.endDate ?? null,
          current: e.current,
        })),
      });
    }

    return prisma.studentEducation.findMany({ where: { studentId: profile.id } });
  }

  /** Reemplaza toda la experiencia del estudiante */
  async replaceExperience(
    userId: number,
    experience: {
      position: string;
      company: string;
      startDate: string;
      endDate?: string;
      current: boolean;
    }[]
  ) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Perfil no encontrado');

    await prisma.studentExperience.deleteMany({ where: { studentId: profile.id } });

    if (experience.length > 0) {
      await prisma.studentExperience.createMany({
        data: experience.map(e => ({
          studentId: profile.id,
          position: e.position,
          company: e.company,
          startDate: e.startDate,
          endDate: e.endDate ?? null,
          current: e.current,
        })),
      });
    }

    return prisma.studentExperience.findMany({ where: { studentId: profile.id } });
  }

  /** Reemplaza todos los idiomas del estudiante */
  async replaceLanguages(
    userId: number,
    languages: { language: string; level: string }[]
  ) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Perfil no encontrado');

    await prisma.studentLanguage.deleteMany({ where: { studentId: profile.id } });

    if (languages.length > 0) {
      await prisma.studentLanguage.createMany({
        data: languages.map(l => ({
          studentId: profile.id,
          language: l.language,
          level: l.level,
        })),
      });
    }

    return prisma.studentLanguage.findMany({ where: { studentId: profile.id } });
  }

  /** Obtiene el perfil completo del estudiante con educación, experiencia e idiomas */
  async getFullProfile(userId: number) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        education: { orderBy: { startDate: 'asc' } },
        experience: { orderBy: { startDate: 'asc' } },
        languages: { orderBy: { language: 'asc' } },
        universityMembership: {
          include: {
            university: {
              select: {
                id: true,
                universityName: true,
                logoUrl: true,
                location: true,
              },
            },
          },
        },
      },
    });
    if (!profile) return null;

    return {
      ...profile,
      university: profile.universityMembership?.university
        ? {
            universityId: profile.universityMembership.university.id,
            name: profile.universityMembership.university.universityName,
            logoUrl: profile.universityMembership.university.logoUrl ?? null,
            location: profile.universityMembership.university.location ?? null,
            status: profile.universityMembership.status,
          }
        : null,
    };
  }

  /** Guarda la foto de perfil y elimina la anterior */
  async updateAvatar(userId: number, filePath: string): Promise<string> {
    const relativePath = '/' + filePath.replace(/\\/g, '/').split('public/').pop()!;
    const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { avatarUrl: true } });
    deleteFile(profile?.avatarUrl);
    await prisma.studentProfile.update({ where: { userId }, data: { avatarUrl: relativePath } });
    return relativePath;
  }

  /** Guarda el CV y actualiza resumeUrl, elimina el anterior */
  async updateResume(userId: number, filePath: string, fileName: string): Promise<{ fileUrl: string; fileName: string }> {
    const relativePath = '/' + filePath.replace(/\\/g, '/').split('public/').pop()!;
    const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { resumeUrl: true } });
    deleteFile(profile?.resumeUrl);
    await prisma.studentProfile.update({ where: { userId }, data: { resumeUrl: relativePath } });
    return { fileUrl: relativePath, fileName };
  }

  /** Elimina el CV */
  async deleteResume(userId: number): Promise<void> {
    const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { resumeUrl: true } });
    deleteFile(profile?.resumeUrl);
    await prisma.studentProfile.update({ where: { userId }, data: { resumeUrl: null } });
  }

  // ── Dashboard ─────────────────────────────────────────────────────

  async getDashboard(userId: number) {
    const ctx = await this.getStudentContext(userId);
    const isDev = process.env.NODE_ENV !== 'production';

    // Fetch latest 10 JobApplications
    const jobApps = await prisma.jobApplication.findMany({
      where: { studentId: ctx.studentId },
      include: {
        offer: {
          select: {
            id: true,
            title: true,
            companyId: true,
            company: { select: { id: true, companyName: true, logoUrl: true } },
            programOffer: { select: { id: true, programId: true, program: { select: { title: true } } } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: 10,
    });

    // Fetch latest 10 ProgramApplications
    const programApps = await prisma.programApplication.findMany({
      where: { studentId: ctx.studentId },
      include: {
        offer: {
          select: {
            id: true,
            title: true,
            jobOfferId: true,
            companyId: true,
            programId: true,
            company: { select: { id: true, companyName: true, logoUrl: true } },
            program: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: 10,
    });

    // Normalize both types into unified format
    const normalizedJobApps = jobApps.map((a) => ({
      applicationId: a.id,
      source: 'job' as const,
      status: a.status,
      createdAt: a.appliedAt,
      updatedAt: a.updatedAt,
      offerId: a.offerId,
      jobOfferId: a.offerId,
      offerTitle: a.offer.title,
      companyName: a.offer.company.companyName,
      companyLogoUrl: a.offer.company.logoUrl,
      companyId: a.offer.company.id,
      programId: a.offer.programOffer?.programId ?? null,
      programOfferId: a.offer.programOffer?.id ?? null,
      programTitle: a.offer.programOffer?.program?.title ?? null,
    }));

    const normalizedProgramApps = programApps.map((a) => ({
      applicationId: a.id,
      source: 'program' as const,
      status: a.status,
      createdAt: a.appliedAt,
      updatedAt: a.appliedAt,
      offerId: a.offer.id,
      jobOfferId: a.offer.jobOfferId,
      offerTitle: a.offer.title,
      companyName: a.offer.company.companyName,
      companyLogoUrl: a.offer.company.logoUrl,
      companyId: a.offer.company.id,
      programId: a.offer.programId,
      programOfferId: a.offer.id,
      programTitle: a.offer.program.title,
    }));

    // Deduplicate: if same programOffer exists in both tables, keep ProgramApplication
    // (it has the authoritative status set by the company via the program flow)
    const programOfferIds = new Set(
      normalizedProgramApps.map((a) => a.programOfferId).filter(Boolean),
    );
    const filteredJobApps = normalizedJobApps.filter(
      (a) => !a.programOfferId || !programOfferIds.has(a.programOfferId),
    );

    const merged = [...filteredJobApps, ...normalizedProgramApps]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Summary stats
    const [totalJobApplications, totalProgramApplications, enrolledPrograms] = await Promise.all([
      prisma.jobApplication.count({ where: { studentId: ctx.studentId } }),
      prisma.programApplication.count({ where: { studentId: ctx.studentId } }),
      prisma.programEnrollment.count({ where: { studentId: ctx.studentId } }),
    ]);

    if (isDev) {
      console.log(
        '[DEV:studentDashboard] userId=%d studentId=%d jobApps=%d programApps=%d deduped=%d merged=%d totalJob=%d totalProgram=%d',
        userId, ctx.studentId, jobApps.length, programApps.length,
        filteredJobApps.length, merged.length, totalJobApplications, totalProgramApplications,
      );
      for (const app of merged) {
        console.log(
          '[DEV:studentDashboard:app] applicationId=%d source=%s status=%s isProgram=%s offerId=%d offerTitle="%s"',
          app.applicationId, app.source, app.status, String(!!app.programId), app.offerId, app.offerTitle,
        );
      }
    }

    return {
      summary: {
        totalJobApplications,
        totalProgramApplications,
        totalApplications: totalJobApplications + totalProgramApplications,
        enrolledPrograms,
      },
      recentApplications: merged,
    };
  }

  async getCanonicalProgramOffers(userId: number, programId: number) {
    const ctx = await this.getStudentContext(userId);
    const program = await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    const offers = await prisma.programOffer.findMany({
      where: { programId, status: 'APPROVED' },
      include: {
        company: { select: { id: true, companyName: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const applications = await prisma.programApplication.findMany({
      where: {
        studentId: ctx.studentId,
        offerId: { in: offers.map((offer) => offer.id) },
      },
      select: { id: true, offerId: true, status: true, appliedAt: true },
    });

    const applicationMap = new Map(applications.map((application) => [application.offerId, application]));

    return {
      program: {
        programId: program.id,
        title: program.title,
      },
      offers: offers.map((offer) => {
        const application = applicationMap.get(offer.id);
        const applicationsCount = offer._count.applications;
        const maxApplicants = offer.maxApplicants ?? null;
        const remainingSlots = maxApplicants === null ? null : Math.max(maxApplicants - applicationsCount, 0);
        const hasReachedMaxApplicants = maxApplicants !== null && applicationsCount >= maxApplicants;

        return {
          programOfferId: offer.id,
          jobOfferId: offer.jobOfferId ?? null,
          title: offer.title,
          description: offer.description,
          location: offer.location ?? null,
          contractType: offer.contractType ?? null,
          workMode: offer.workMode ?? null,
          salary: offer.salary ?? null,
          experienceLevel: offer.experienceLevel ?? null,
          applicationsCount,
          maxApplicants,
          remainingSlots,
          hasReachedMaxApplicants,
          createdAt: offer.createdAt,
          company: {
            companyId: offer.company.id,
            name: offer.company.companyName,
            logoUrl: offer.company.logoUrl ?? null,
          },
          application: application
            ? {
                applicationId: application.id,
                status: application.status,
                appliedAt: application.appliedAt,
              }
            : null,
          alreadyApplied: Boolean(application),
          canApply: !application && !hasReachedMaxApplicants,
        };
      }),
      meta: {
        totalOffers: offers.length,
        hasOffers: offers.length > 0,
        hasAppliedOffers: applications.length > 0,
        emptyState: offers.length === 0
          ? {
              kind: 'NO_PROGRAM_OFFERS',
              message: 'This program does not have published offers yet.',
            }
          : null,
      },
    };
  }

  async getCanonicalProgramOfferDetail(userId: number, programId: number, programOfferId: number) {
    const ctx = await this.getStudentContext(userId);
    const program = await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    const offer = await prisma.programOffer.findFirst({
      where: {
        id: programOfferId,
        programId,
        status: 'APPROVED',
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            industry: true,
            city: true,
            country: true,
          },
        },
        _count: { select: { applications: true } },
      },
    });

    if (!offer) throw new Error('Offer not found');

    const application = await prisma.programApplication.findUnique({
      where: {
        offerId_studentId: {
          offerId: offer.id,
          studentId: ctx.studentId,
        },
      },
      select: {
        id: true,
        status: true,
        appliedAt: true,
      },
    });

    return {
      offer: {
        programOfferId: offer.id,
        jobOfferId: offer.jobOfferId ?? null,
        title: offer.title,
        description: offer.description,
        requirements: offer.requirements ?? null,
        location: offer.location ?? null,
        salary: offer.salary ?? null,
        contractType: offer.contractType ?? null,
        workMode: offer.workMode ?? null,
        experienceLevel: offer.experienceLevel ?? null,
        maxApplicants: offer.maxApplicants ?? null,
        applicationsCount: offer._count.applications,
        createdAt: offer.createdAt,
        program: {
          programId: program.id,
          title: program.title,
        },
        company: {
          companyId: offer.company.id,
          name: offer.company.companyName,
          logoUrl: offer.company.logoUrl ?? null,
          industry: offer.company.industry ?? null,
          location: [offer.company.city, offer.company.country].filter(Boolean).join(', ') || null,
        },
        application: application
          ? {
              applicationId: application.id,
              status: application.status,
              appliedAt: application.appliedAt,
            }
          : null,
        alreadyApplied: Boolean(application),
        canApply: !application && (offer.maxApplicants === null || offer._count.applications < offer.maxApplicants),
        remainingSlots: offer.maxApplicants === null ? null : Math.max(offer.maxApplicants - offer._count.applications, 0),
        hasReachedMaxApplicants: offer.maxApplicants !== null && offer._count.applications >= offer.maxApplicants,
      },
    };
  }

  async applyToCanonicalProgramOffer(userId: number, programId: number, programOfferId: number, dto: { coverLetter?: string }) {
    const ctx = await this.getStudentContext(userId);
    const program = await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    const offer = await prisma.programOffer.findFirst({
      where: {
        id: programOfferId,
        programId,
        status: 'APPROVED',
      },
    });

    if (!offer) throw new Error('Offer not found');

    const existingApplication = await prisma.programApplication.findUnique({
      where: {
        offerId_studentId: {
          offerId: offer.id,
          studentId: ctx.studentId,
        },
      },
    });
    if (existingApplication) throw new Error('Already applied to this offer');

    if (offer.maxApplicants !== null) {
      const currentCount = await prisma.programApplication.count({ where: { offerId: offer.id } });
      if (currentCount >= offer.maxApplicants) {
        throw new Error('This offer has reached the maximum number of applicants');
      }
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: ctx.studentId },
      select: { resumeUrl: true },
    });

    const application = await prisma.programApplication.create({
      data: {
        offerId: offer.id,
        studentId: ctx.studentId,
        coverLetter: dto.coverLetter ?? null,
        resumeUrl: studentProfile?.resumeUrl ?? null,
      },
      include: {
        offer: {
          select: {
            id: true,
            jobOfferId: true,
            title: true,
          },
        },
      },
    });

    return {
      application: {
        applicationId: application.id,
        source: 'program' as const,
        status: application.status,
        appliedAt: application.appliedAt,
        studentId: ctx.studentId,
        offer: {
          programOfferId: application.offer.id,
          jobOfferId: application.offer.jobOfferId ?? null,
          title: application.offer.title,
        },
        program: {
          programId: program.id,
          title: program.title,
        },
      },
    };
  }

  async getCanonicalStudentDashboard(userId: number) {
    const ctx = await this.getStudentContext(userId);

    const [jobApplications, programApplications, enrolledPrograms, totalJobApplications, totalProgramApplications, universityProfile, availableProgramsCount] = await Promise.all([
      prisma.jobApplication.findMany({
        where: {
          studentId: ctx.studentId,
          offer: {
            programOffer: { is: null },
          },
        },
        include: {
          offer: {
            include: {
              company: { select: { id: true, companyName: true, logoUrl: true } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
        take: 10,
      }),
      prisma.programApplication.findMany({
        where: { studentId: ctx.studentId },
        include: {
          offer: {
            include: {
              company: { select: { id: true, companyName: true, logoUrl: true } },
              program: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
        take: 10,
      }),
      prisma.programEnrollment.count({ where: { studentId: ctx.studentId } }),
      prisma.jobApplication.count({
        where: {
          studentId: ctx.studentId,
          offer: {
            programOffer: { is: null },
          },
        },
      }),
      prisma.programApplication.count({ where: { studentId: ctx.studentId } }),
      prisma.universityProfile.findUnique({
        where: { id: ctx.universityId },
        select: {
          id: true,
          universityName: true,
          logoUrl: true,
          location: true,
        },
      }),
      prisma.program.count({
        where: {
          universityId: ctx.universityId,
          isActive: true,
        },
      }),
    ]);

    const recentApplications = [
      ...jobApplications.map((application) => ({
        applicationId: application.id,
        source: 'job' as const,
        status: application.status,
        appliedAt: application.appliedAt,
        updatedAt: application.updatedAt,
        offer: {
          jobOfferId: application.offer.id,
          programOfferId: null,
          title: application.offer.title,
        },
        program: null,
        company: {
          companyId: application.offer.company.id,
          name: application.offer.company.companyName,
          logoUrl: application.offer.company.logoUrl ?? null,
        },
      })),
      ...programApplications.map((application) => ({
        applicationId: application.id,
        source: 'program' as const,
        status: application.status,
        appliedAt: application.appliedAt,
        updatedAt: application.reviewedAt ?? application.appliedAt,
        offer: {
          jobOfferId: application.offer.jobOfferId ?? null,
          programOfferId: application.offer.id,
          title: application.offer.title,
        },
        program: {
          programId: application.offer.program.id,
          title: application.offer.program.title,
        },
        company: {
          companyId: application.offer.company.id,
          name: application.offer.company.companyName,
          logoUrl: application.offer.company.logoUrl ?? null,
        },
      })),
    ].sort((left, right) => {
      const dateDiff = new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return right.applicationId - left.applicationId;
    }).slice(0, 10);

    return {
      studentId: ctx.studentId,
      university: universityProfile
        ? {
            universityId: universityProfile.id,
            name: universityProfile.universityName,
            logoUrl: universityProfile.logoUrl ?? null,
            location: universityProfile.location ?? null,
          }
        : null,
      summary: {
        totalJobApplications,
        totalProgramApplications,
        totalApplications: totalJobApplications + totalProgramApplications,
        enrolledPrograms,
        availableProgramsCount,
      },
      recentApplications,
      actions: {
        completeProfile: totalJobApplications + totalProgramApplications === 0,
        browsePrograms: availableProgramsCount > 0,
      },
      meta: {
        hasApplications: totalJobApplications + totalProgramApplications > 0,
        hasProgramApplications: totalProgramApplications > 0,
        hasJobApplications: totalJobApplications > 0,
        hasUniversity: Boolean(universityProfile),
        hasAvailablePrograms: availableProgramsCount > 0,
        emptyState: totalJobApplications + totalProgramApplications === 0
          ? {
              kind: 'NO_APPLICATIONS',
              message: 'This student has not applied to any offer yet.',
            }
          : null,
      },
    };
  }

  async getCanonicalProgramCompanyDetail(userId: number, programId: number, companyId: number) {
    const ctx = await this.getStudentContext(userId);
    const program = await this.validateProgramBelongsToUniversity(programId, ctx.universityId);

    const approvedOffers = await prisma.programOffer.findMany({
      where: {
        programId,
        companyId,
        status: 'APPROVED',
      },
      select: {
        id: true,
        jobOfferId: true,
        title: true,
        description: true,
        location: true,
        contractType: true,
        workMode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (approvedOffers.length === 0) {
      throw new Error('Company not found in this program');
    }

    const companyData = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        companyName: true,
        logoUrl: true,
        description: true,
        city: true,
        country: true,
        industry: true,
        website: true,
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
        user: {
          select: {
            email: true,
            status: true,
          },
        },
      },
    });

    if (!companyData) {
      throw new Error('Company not found in this program');
    }

    return {
      company: {
        companyId: companyData.id,
        name: companyData.companyName,
        logoUrl: companyData.logoUrl ?? null,
        location: [companyData.city, companyData.country].filter(Boolean).join(', ') || null,
        city: companyData.city ?? null,
        country: companyData.country ?? null,
        description: companyData.description ?? null,
        descriptionLong: companyData.descriptionLong ?? null,
        industry: companyData.industry ?? null,
        website: companyData.website ?? null,
        linkedinUrl: companyData.linkedinUrl ?? null,
        size: companyData.size ?? companyData.companySize ?? null,
        companySize: companyData.companySize ?? null,
        foundedYear: companyData.foundedYear ?? null,
        contactPerson: companyData.contactPerson ?? null,
        contactEmail: companyData.contactEmail ?? null,
        contactPhone: companyData.contactPhone ?? null,
        workModes: parseJson(companyData.workModes),
        vacancyTypes: parseJson(companyData.vacancyTypes),
        workingLanguages: parseJson(companyData.workingLanguages),
        participatesInInternships: companyData.participatesInInternships ?? false,
        verified: companyData.user?.status === 'ACTIVE',
        email: companyData.user?.email ?? null,
        createdAt: companyData.createdAt,
      },
      context: {
        viewerRole: 'STUDENT' as const,
        universityId: ctx.universityId,
        programId: program.id,
        programTitle: program.title,
      },
      offers: approvedOffers.map((offer) => ({
        programOfferId: offer.id,
        jobOfferId: offer.jobOfferId ?? null,
        title: offer.title,
        description: offer.description,
        location: offer.location ?? null,
        contractType: offer.contractType ?? null,
        workMode: offer.workMode ?? null,
        createdAt: offer.createdAt,
      })),
      activity: approvedOffers.map((offer) => ({
        id: offer.id,
        type: 'OFFER_APPROVED',
        programId: program.id,
        programTitle: program.title,
        jobOfferId: offer.jobOfferId ?? null,
        jobOfferTitle: offer.title,
        createdAt: offer.createdAt,
      })),
      meta: {
        isLinkedToUniversity: true,
        hasOffers: approvedOffers.length > 0,
        hasActivity: approvedOffers.length > 0,
      },
    };
  }
}
