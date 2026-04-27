import { UniversitiesRepository, StudentsFilters } from './universities.repository';
import {
  CreateInviteDto,
  RedeemInviteDto,
  GetStudentsDto,
  UpdateUniversityProfileDto,
} from './universities.dto';
import { prisma } from '../../config/database';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

const PUBLIC_ROOT = path.join(__dirname, '..', '..', '..', 'public');

function deleteFile(relativePath: string | null | undefined) {
  if (!relativePath) return;
  const safeRelativePath = relativePath.replace(/^[/\\]+/, '');
  const abs = path.join(PUBLIC_ROOT, safeRelativePath);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
}

// Charset: uppercase alphanumeric excluding confusable chars (0, O, I, 1, L)
const INVITE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 10;

function generateReadableCode(): string {
  const bytes = randomBytes(INVITE_CODE_LENGTH * 2); // extra bytes for rejection sampling safety
  let result = '';
  for (let i = 0; i < bytes.length && result.length < INVITE_CODE_LENGTH; i++) {
    const idx = bytes[i] % INVITE_CHARSET.length;
    // Reject bytes that would create modulo bias (>= floor(256/len)*len)
    const threshold = Math.floor(256 / INVITE_CHARSET.length) * INVITE_CHARSET.length;
    if (bytes[i] < threshold) {
      result += INVITE_CHARSET[idx];
    }
  }
  // Fallback: pad with simple random if somehow short (extremely rare)
  while (result.length < INVITE_CODE_LENGTH) {
    result += INVITE_CHARSET[Math.floor(Math.random() * INVITE_CHARSET.length)];
  }
  return result;
}

export class UniversitiesService {
  private universitiesRepository: UniversitiesRepository;

  constructor() {
    this.universitiesRepository = new UniversitiesRepository();
  }

  // ── Internal helpers ──────────────────────────────────────────────
  async getUniversityIdFromUserId(userId: number): Promise<number> {
    const universityProfile = await prisma.universityProfile.findUnique({
      where: { userId },
    });
    if (!universityProfile) {
      throw new Error('University profile not found');
    }
    return universityProfile.id;
  }

  async getStudentIdFromUserId(userId: number): Promise<number> {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!studentProfile) {
      throw new Error('Student profile not found');
    }
    return studentProfile.id;
  }

  // ── Profile ───────────────────────────────────────────────────────
  async getProfile(userId: number) {
    const profile = await this.universitiesRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new Error('University profile not found');
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getProfile] userId=%d returned=%j', userId, {
        id: profile.id,
        name: profile.name,
        logoUrl: profile.logoUrl,
        location: profile.location,
        description: profile.description?.slice(0, 60),
        careers: profile.careers,
        convenioTypes: profile.convenioTypes,
      });
    }
    return profile;
  }

  async updateProfile(userId: number, dto: UpdateUniversityProfileDto) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:updateProfile] userId=%d rawBody=%j', userId, dto);
    }
    const updateData: Record<string, any> = {};

    // Acepta tanto 'name' (frontend) como 'universityName' (campo Prisma legacy)
    const nameValue = dto.universityName ?? dto.name;
    if (nameValue !== undefined) updateData.universityName = nameValue;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.careers !== undefined) {
      updateData.careers = JSON.stringify(Array.isArray(dto.careers) ? dto.careers : []);
    }
    if (dto.convenioTypes !== undefined) {
      updateData.convenioTypes = JSON.stringify(
        Array.isArray(dto.convenioTypes) ? dto.convenioTypes : [],
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:updateProfile] prismaData=%j', updateData);
    }

    // Si no llega nada que cambiar, devolver el perfil actual sin error
    if (Object.keys(updateData).length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[DEV:updateProfile] WARN: no fields to update — returning current profile');
      }
      return this.universitiesRepository.getProfileByUserId(userId);
    }

    const saved = await this.universitiesRepository.updateProfileByUserId(userId, updateData);

    if (process.env.NODE_ENV !== 'production') {
      // Read-after-write: verify GET will return exactly what we just saved
      const verification = await this.universitiesRepository.getProfileByUserId(userId);
      console.log('[DEV:updateProfile] ── PERSIST COMPARISON ──');
      console.log('[DEV:updateProfile] received   =%j', dto);
      console.log('[DEV:updateProfile] toPrisma   =%j', updateData);
      console.log('[DEV:updateProfile] saveReturn =%j', {
        id: saved?.id, name: saved?.name, logoUrl: saved?.logoUrl,
        location: saved?.location, careers: saved?.careers,
        convenioTypes: saved?.convenioTypes,
      });
      console.log('[DEV:updateProfile] GET(verify)=%j', {
        id: verification?.id, name: verification?.name, logoUrl: verification?.logoUrl,
        location: verification?.location, careers: verification?.careers,
        convenioTypes: verification?.convenioTypes,
      });
      // Flag any mismatch between PATCH response and what GET will return
      const keys = ['name', 'logoUrl', 'location', 'description', 'careers', 'convenioTypes'] as const;
      for (const k of keys) {
        const s = JSON.stringify((saved as any)?.[k]);
        const g = JSON.stringify((verification as any)?.[k]);
        if (s !== g) {
          console.warn('[DEV:updateProfile] ⚠ MISMATCH "%s": PATCH=%s  GET=%s', k, s, g);
        }
      }
    }

    return saved;
  }

  // ── Logo upload ────────────────────────────────────────────────────
  async uploadLogo(userId: number, file: Express.Multer.File): Promise<string> {
    // Verify profile exists
    const profile = await this.universitiesRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new Error('University profile not found');
    }

    // Delete old logo file from disk if it exists
    if (profile.logoUrl) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV:uploadLogo] deleting old logo: %s', profile.logoUrl);
      }
      deleteFile(profile.logoUrl);
    }

    // Build public URL: /uploads/universities/logos/<filename>
    const logoUrl = `/uploads/universities/logos/${file.filename}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:uploadLogo] userId=%d file=%s size=%d mime=%s → logoUrl=%s',
        userId, file.originalname, file.size, file.mimetype, logoUrl);
    }

    // Persist in DB
    await this.universitiesRepository.updateProfileByUserId(userId, { logoUrl });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:uploadLogo] persisted OK userId=%d logoUrl=%s', userId, logoUrl);
    }

    return logoUrl;
  }

  // ── Pending offers ─────────────────────────────────────────────────
  async getPendingOffers(userId: number) {
    const universityId = await this.getUniversityIdFromUserId(userId);

    const rows = await this.universitiesRepository.getPendingProgramOffers(universityId);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getPendingOffers] universityId=%d count=%d', universityId, rows.length);
    }

    const offers = rows.map((o: any) => ({
      programOfferId: o.id,
      programId: o.programId,
      programTitle: o.program?.title ?? null,
      jobOfferId: o.jobOfferId ?? null,
      title: o.title,
      description: o.description,
      companyId: o.companyId,
      companyName: o.company?.companyName ?? null,
      companyLogoUrl: o.company?.logoUrl ?? null,
      location: o.location ?? null,
      contractType: o.contractType ?? null,
      workMode: o.workMode ?? null,
      status: o.status,
      createdAt: o.createdAt,
    }));

    return {
      offers,
      meta: {
        totalOffers: offers.length,
        hasPendingOffers: offers.length > 0,
        emptyState: offers.length === 0
          ? {
              kind: 'NO_PENDING_OFFERS',
              message: 'There are no pending program offers to review right now.',
            }
          : null,
      },
    };
  }

  // ── Dashboard ─────────────────────────────────────────────────────
  async getDashboard(userId: number) {
    const universityId = await this.getUniversityIdFromUserId(userId);
    const metrics = await this.universitiesRepository.getDashboardMetrics(universityId);
    const hasPrograms = metrics.totalPrograms > 0;
    const hasStudents = metrics.totalStudents > 0;
    const hasPendingOffers = metrics.pendingProgramOffers > 0;

    return {
      universityId,
      summary: metrics,
      actions: {
        reviewPendingOffers: hasPendingOffers,
        inviteStudents: !hasStudents,
        createProgram: !hasPrograms,
      },
      meta: {
        hasPrograms,
        hasStudents,
        hasPendingOffers,
        hasApplications: metrics.totalApplicationsInPrograms > 0,
        emptyState: !hasPrograms && !hasStudents
          ? {
              kind: 'NO_PROGRAMS_OR_STUDENTS',
              message: 'This university has not created programs or linked students yet.',
            }
          : null,
      },
    };
  }

  // ── Invites ───────────────────────────────────────────────────────
  async createInvite(universityId: number, userId: number, dto: CreateInviteDto) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:createInvite] universityId=%d userId=%d dto=%j', universityId, userId, dto);
    }
    // Generate unique readable code (retry on collision)
    let inviteCode = generateReadableCode();
    let existing = await this.universitiesRepository.findInviteByCode(inviteCode);
    let attempts = 0;
    while (existing && attempts < 10) {
      inviteCode = generateReadableCode();
      existing = await this.universitiesRepository.findInviteByCode(inviteCode);
      attempts++;
    }
    if (existing) {
      throw new Error('Could not generate unique invite code, please retry');
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const created = await this.universitiesRepository.createInvite({
      universityId,
      inviteCode,
      maxUses: dto.maxUses,
      expiresAt,
      createdBy: userId,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:createInvite] persisted OK id=%d code=%s universityId=%d', created?.id, created?.code, universityId);
    }

    return created;
  }

  async getUniversityInvites(universityId: number) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getUniversityInvites] universityId=%d', universityId);
    }
    const invites = await this.universitiesRepository.getUniversityInvites(universityId);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getUniversityInvites] found=%d', invites.length);
    }
    return invites;
  }

  async deleteInvite(universityId: number, inviteId: number) {
    const invite = await this.universitiesRepository.findRawInviteById(inviteId);
    if (!invite) {
      throw new Error('Invite not found');
    }
    if (invite.universityId !== universityId) {
      throw new Error('Invite not found');
    }
    await this.universitiesRepository.deleteInvite(inviteId);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:deleteInvite] deleted inviteId=%d universityId=%d', inviteId, universityId);
    }
    return inviteId;
  }

  async redeemInvite(studentId: number, dto: RedeemInviteDto) {
    // Check if student already has a membership
    const existingMembership =
      await this.universitiesRepository.findMembershipByStudentId(studentId);
    if (existingMembership) {
      throw new Error('Student already belongs to a university');
    }

    // Find invite (code already uppercased by Zod transform)
    const invite = await this.universitiesRepository.findInviteByCode(dto.inviteCode);
    if (!invite) {
      throw new Error('Invalid invite code');
    }

    // Validate expiration
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new Error('Invite code has expired');
    }

    // Validate max uses
    if (invite.maxUses !== null && invite.currentUses >= invite.maxUses) {
      throw new Error('Invite code has reached its maximum uses');
    }

    // Create membership
    const membership = await this.universitiesRepository.createMembership(
      studentId,
      invite.universityId,
      invite.id,
    );

    // Increment usage counter
    await this.universitiesRepository.incrementInviteUses(invite.id);

    // Return enriched response
    const updatedInvite = await this.universitiesRepository.findInviteById(invite.id);

    return {
      membership: {
        id: membership.id,
        status: membership.status,
        joinedAt: membership.joinedAt,
        university: membership.university,
        student: membership.student,
      },
      invite: updatedInvite,
    };
  }

  // ── Stats (legacy, kept for backwards compat) ─────────────────────
  async getUniversityStats(universityId: number) {
    const [totalStudents, invites] = await Promise.all([
      this.universitiesRepository.countStudentsByUniversity(universityId),
      this.universitiesRepository.getUniversityInvites(universityId),
    ]);

    return {
      totalStudents,
      totalInvites: invites.length,
      activeInvites: invites.filter((inv: any) => inv.isActive).length,
    };
  }

  // ── Students ──────────────────────────────────────────────────────
  async getUniversityStudents(universityId: number, dto: GetStudentsDto) {
    const filters: StudentsFilters = {
      universityId,
      status: dto.status,
      search: dto.search,
    };

    const pagination = {
      page: dto.page || 1,
      limit: Math.min(dto.limit || 20, 100),
    };

    const { memberships, total } =
      await this.universitiesRepository.findStudentsByUniversity(
        filters,
        pagination,
      );

    const students = memberships.map((m: any) => {
      const s = m.student;
      const location = [s.city, s.country].filter(Boolean).join(', ') || null;
      return {
        studentId: s.id,
        userId: s.userId,
        fullName: `${s.firstName} ${s.lastName}`.trim(),
        email: s.user?.email ?? null,
        location,
        isActiveStudent: s.isActiveStudent ?? false,
        universityId: m.university?.id ?? universityId,
        universityName: m.university?.universityName ?? null,
        resumeUrl: s.resumeUrl ?? null,
        avatarUrl: s.avatarUrl ?? null,
        createdAt: s.createdAt,
        careerField: s.careerField ?? null,
        linkedinUrl: s.linkedinUrl ?? null,
        githubUrl: s.githubUrl ?? null,
        phoneNumber: s.phoneNumber ?? null,
        membership: {
          membershipId: m.id,
          status: m.status,
          joinedAt: m.joinedAt,
          inviteCode: m.invite?.inviteCode ?? null,
        },
      };
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getUniversityStudents] universityId=%d total=%d ids=%j',
        universityId,
        total,
        students.map((s: any) => s.studentId),
      );
    }

    return {
      students,
      filters: {
        status: dto.status ?? null,
        search: dto.search ?? null,
      },
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
      meta: {
        hasStudents: students.length > 0,
        emptyState: students.length === 0
          ? {
              kind: dto.search || dto.status ? 'NO_FILTERED_STUDENTS' : 'NO_STUDENTS',
              message: dto.search || dto.status
                ? 'No students match the selected filters.'
                : 'This university does not have linked students yet.',
            }
          : null,
      },
    };
  }

  // ── Student detail ────────────────────────────────────────────────
  async getStudentDetail(universityId: number, studentId: number) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getStudentDetail] universityId=%d studentId=%d', universityId, studentId);
    }

    const membership = await this.universitiesRepository.findStudentMembershipByProfileIdAndUniversity(
      studentId,
      universityId,
    );

    if (!membership) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV:getStudentDetail] NOT FOUND universityId=%d studentId=%d', universityId, studentId);
      }
      throw new Error('Student not found');
    }

    const s = membership.student as any;
    const location = [s.city, s.country].filter(Boolean).join(', ') || null;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:getStudentDetail] FOUND userId=%d profileId=%d name=%s %s', s.userId, s.id, s.firstName, s.lastName);
    }

    // Fetch applications for programs of this university
    const rawApps = await this.universitiesRepository.findStudentApplicationsForUniversity(
      s.id,
      universityId,
    );

    const applications = rawApps.map((a: any) => ({
      applicationId: a.id,
      source: 'program' as const,
      status: a.status,
      appliedAt: a.appliedAt,
      updatedAt: a.reviewedAt ?? a.appliedAt,
      coverLetter: a.coverLetter ?? null,
      offer: {
        programOfferId: a.offer?.id ?? null,
        jobOfferId: a.offer?.jobOfferId ?? null,
        title: a.offer?.title ?? null,
        status: a.offer?.status ?? null,
        location: a.offer?.location ?? null,
        contractType: a.offer?.contractType ?? null,
        workMode: a.offer?.workMode ?? null,
      },
      program: {
        programId: a.offer?.program?.id ?? null,
        title: a.offer?.program?.title ?? null,
      },
      company: {
        companyId: a.offer?.company?.id ?? null,
        name: a.offer?.company?.companyName ?? null,
        logoUrl: a.offer?.company?.logoUrl ?? null,
      },
    }));

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getStudentDetail] universityId=%d studentProfileId=%d applications=%d ids=%j',
        universityId, s.id, applications.length,
        applications.map((a: any) => a.applicationId),
      );
    }

    return {
      student: {
        studentId: s.id,
        userId: s.userId,
        fullName: `${s.firstName} ${s.lastName}`.trim(),
        email: s.user?.email ?? null,
        location,
        isActiveStudent: s.isActiveStudent ?? false,
        universityId: membership.university?.id ?? universityId,
        universityName: membership.university?.universityName ?? null,
        resumeUrl: s.resumeUrl ?? null,
        avatarUrl: s.avatarUrl ?? null,
        bio: s.bio ?? null,
        phoneNumber: s.phoneNumber ?? null,
        createdAt: s.createdAt,
        careerField: s.careerField ?? null,
        skills: s.skills ?? null,
        linkedinUrl: s.linkedinUrl ?? null,
        githubUrl: s.githubUrl ?? null,
        dateOfBirth: s.dateOfBirth ?? null,
        membership: {
          membershipId: membership.id,
          status: membership.status,
          joinedAt: membership.joinedAt,
          inviteCode: (membership.invite as any)?.inviteCode ?? null,
        },
        education: s.education ?? [],
        experience: s.experience ?? [],
        languages: s.languages ?? [],
      },
      applications,
    };
  }

  // ── Company profile for university ────────────────────────────────

  private parseJson(val: string | null | undefined): any[] {
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

  async getCompanyProfile(universityId: number, companyId: number) {
    const data = await this.universitiesRepository.getCompanyProfileForUniversity(
      companyId,
      universityId,
    );

    if (!data) {
      throw new Error('Company not found');
    }

    const { company, programOffers } = data;

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getCompanyProfile] universityId=%d companyId(param)=%d resolvedCompanyId=%d programOffers=%d',
        universityId, companyId, company.id, programOffers.length,
      );
    }

    // If the company has zero relationship with this university → 404
    if (programOffers.length === 0) {
      throw new Error('Company has no relationship with this university');
    }

    // ── Build company response ─────────────────────────────────────
    const location = [company.city, company.country].filter(Boolean).join(', ') || null;
    const verified = company.user?.status === 'ACTIVE';

    const companyResponse = {
      companyId: company.id,
      name: company.companyName,
      logoUrl: company.logoUrl ?? null,
      location,
      description: company.description ?? null,
      verified,
      email: company.user?.email ?? null,
      website: company.website ?? null,
      industry: company.industry ?? null,
      size: company.companySize ?? company.size ?? null,
      companySize: company.companySize ?? null,
      foundedYear: company.foundedYear ?? null,
      linkedinUrl: (company as any).linkedinUrl ?? null,
      descriptionLong: (company as any).descriptionLong ?? null,
      contactPerson: (company as any).contactPerson ?? null,
      contactEmail: (company as any).contactEmail ?? null,
      contactPhone: (company as any).contactPhone ?? null,
      workModes: this.parseJson((company as any).workModes),
      vacancyTypes: this.parseJson((company as any).vacancyTypes),
      workingLanguages: this.parseJson((company as any).workingLanguages),
      participatesInInternships: (company as any).participatesInInternships ?? false,
      createdAt: company.createdAt,
    };

    // ── Build offers list ───────────────────────────────────────────
    const offers = programOffers.map((po) => ({
      programOfferId: po.id,
      jobOfferId: po.jobOfferId ?? null,
      programId: po.programId,
      programTitle: po.program.title,
      title: po.jobOffer?.title ?? po.title,
      description: po.description ?? null,
      location: po.location ?? null,
      contractType: po.contractType ?? null,
      workMode: po.workMode ?? null,
      status: po.status,
      createdAt: po.createdAt,
    }));

    // ── Build activity timeline ─────────────────────────────────────
    const activity: Array<{
      id: number;
      type: string;
      programId: number;
      programTitle: string;
      jobOfferId: number | null;
      jobOfferTitle: string;
      createdAt: Date;
    }> = [];

    for (const po of programOffers) {
      const offerTitle = po.jobOffer?.title ?? po.title;

      // Every ProgramOffer was created at createdAt
      activity.push({
        id: po.id,
        type: 'OFFER_CREATED',
        programId: po.programId,
        programTitle: po.program.title,
        jobOfferId: po.jobOfferId ?? null,
        jobOfferTitle: offerTitle,
        createdAt: po.createdAt,
      });

      // If approved → add OFFER_APPROVED entry
      if (po.status === 'APPROVED' && po.approvedAt) {
        activity.push({
          id: po.id,
          type: 'OFFER_APPROVED',
          programId: po.programId,
          programTitle: po.program.title,
          jobOfferId: po.jobOfferId ?? null,
          jobOfferTitle: offerTitle,
          createdAt: po.approvedAt,
        });
      }

      // If rejected → add OFFER_REJECTED entry
      if (po.status === 'REJECTED') {
        activity.push({
          id: po.id,
          type: 'OFFER_REJECTED',
          programId: po.programId,
          programTitle: po.program.title,
          jobOfferId: po.jobOfferId ?? null,
          jobOfferTitle: offerTitle,
          createdAt: po.approvedAt ?? po.createdAt,
        });
      }
    }

    // Sort activity by date descending
    activity.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getCompanyProfile] universityId=%d companyId=%d → offers=%d activity=%d keys=%s',
        universityId, company.id, offers.length, activity.length,
        Object.keys(companyResponse).join(','),
      );
      for (const o of offers) {
        console.log(
          '[DEV:getCompanyProfile]   offer programOfferId=%d status=%s title=%s programTitle=%s',
          o.programOfferId, o.status, o.title, o.programTitle,
        );
      }
    }

    return {
      company: companyResponse,
      context: {
        viewerRole: 'UNIVERSITY' as const,
        universityId,
        programId: null,
        programTitle: null,
      },
      offers,
      activity,
      meta: {
        isLinkedToUniversity: true,
        hasOffers: offers.length > 0,
        hasActivity: activity.length > 0,
      },
    };
  }
}
