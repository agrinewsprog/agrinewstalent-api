import { UniversitiesRepository, StudentsFilters } from './universities.repository';
import { CreateInviteDto, RedeemInviteDto, GetStudentsDto } from './universities.dto';
import { prisma } from '../../config/database';
import { randomBytes } from 'crypto';

export class UniversitiesService {
  private universitiesRepository: UniversitiesRepository;

  constructor() {
    this.universitiesRepository = new UniversitiesRepository();
  }

  // Generate a unique invite code
  private generateInviteCode(): string {
    return randomBytes(8).toString('hex').toUpperCase();
  }

  async createInvite(universityId: number, userId: number, dto: CreateInviteDto) {
    // Generate unique invite code
    let inviteCode = this.generateInviteCode();
    
    // Ensure code is unique
    let existingInvite = await this.universitiesRepository.findInviteByCode(inviteCode);
    while (existingInvite) {
      inviteCode = this.generateInviteCode();
      existingInvite = await this.universitiesRepository.findInviteByCode(inviteCode);
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;

    const invite = await this.universitiesRepository.createInvite({
      universityId,
      inviteCode,
      maxUses: dto.maxUses,
      expiresAt,
      createdBy: userId,
    });

    return invite;
  }

  async redeemInvite(studentId: number, dto: RedeemInviteDto) {
    // Check if student already has a university membership
    const existingMembership = await this.universitiesRepository.findMembershipByStudentId(studentId);
    if (existingMembership) {
      throw new Error('Student already belongs to a university');
    }

    // Find invite
    const invite = await this.universitiesRepository.findInviteByCode(dto.inviteCode);
    if (!invite) {
      throw new Error('Invalid invite code');
    }

    // Check if invite has expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new Error('Invite code has expired');
    }

    // Check if invite has reached max uses
    if (invite.maxUses && invite.currentUses >= invite.maxUses) {
      throw new Error('Invite code has reached maximum uses');
    }

    // Create membership
    const membership = await this.universitiesRepository.createMembership(
      studentId,
      invite.universityId,
      invite.id
    );

    // Increment invite uses
    await this.universitiesRepository.incrementInviteUses(invite.id);

    return membership;
  }

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

    const { memberships, total } = await this.universitiesRepository.findStudentsByUniversity(
      filters,
      pagination
    );

    return {
      students: memberships.map((m: any) => ({
        membershipId: m.id,
        status: m.status,
        joinedAt: m.joinedAt,
        inviteCode: m.invite?.inviteCode,
        ...m.student,
      })),
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async getUniversityInvites(universityId: number) {
    return this.universitiesRepository.getUniversityInvites(universityId);
  }

  async getUniversityStats(universityId: number) {
    const totalStudents = await this.universitiesRepository.countStudentsByUniversity(universityId);
    const invites = await this.universitiesRepository.getUniversityInvites(universityId);

    return {
      totalStudents,
      totalInvites: invites.length,
      activeInvites: invites.filter(
        (inv: any) => (!inv.expiresAt || inv.expiresAt > new Date()) &&
                 (!inv.maxUses || inv.currentUses < inv.maxUses)
      ).length,
    };
  }

  // Helper method to get universityId from userId
  async getUniversityIdFromUserId(userId: number): Promise<number> {
    const universityProfile = await prisma.universityProfile.findUnique({
      where: { userId },
    });

    if (!universityProfile) {
      throw new Error('University profile not found');
    }

    return universityProfile.id;
  }

  // Helper method to get studentId from userId
  async getStudentIdFromUserId(userId: number): Promise<number> {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!studentProfile) {
      throw new Error('Student profile not found');
    }

    return studentProfile.id;
  }
}
