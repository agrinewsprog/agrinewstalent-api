import { CompaniesRepository, CandidatesFilters, PaginationOptions } from './companies.repository';
import { ListCandidatesDto, UpdateCompanyProfileDto } from './companies.dto';
import { ApplicationStatus, ProgramApplicationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import fs from 'fs';
import path from 'path';

const PUBLIC_ROOT = path.join(__dirname, '..', '..', '..', 'public');

function deleteFile(relativePath: string | null | undefined) {
  if (!relativePath) return;
  const safeRelativePath = relativePath.replace(/^[/\\]+/, '');
  const abs = path.join(PUBLIC_ROOT, safeRelativePath);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
}

export class CompaniesService {
  private companiesRepository: CompaniesRepository;

  constructor() {
    this.companiesRepository = new CompaniesRepository();
  }

  // ============================================================
  // NOTIFICATION HELPER
  // ============================================================

  private getNotificationConfig(status: string, offerTitle: string) {
    const configs: Record<string, { type: string; title: string; message: string }> = {
      PENDING: {
        type: 'APPLICATION_PENDING',
        title: 'Candidatura pendiente',
        message: `Tu candidatura para "${offerTitle}" está pendiente de revisión`,
      },
      INTERVIEW: {
        type: 'APPLICATION_INTERVIEW',
        title: 'Seleccionado para entrevista',
        message: `Has sido seleccionado para entrevista en "${offerTitle}"`,
      },
      HIRED: {
        type: 'APPLICATION_HIRED',
        title: 'Contratado',
        message: `Enhorabuena, has sido contratado para "${offerTitle}"`,
      },
      REJECTED: {
        type: 'APPLICATION_REJECTED',
        title: 'Candidatura rechazada',
        message: `Tu candidatura para "${offerTitle}" ha sido rechazada`,
      },
    };
    return configs[status] ?? null;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private parseJson(val: string | null): any[] {
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

  private formatProfile(p: any) {
    return {
      id: p.id,
      userId: p.userId,
      companyName: p.companyName,
      industry: p.industry,
      size: p.size,
      companySize: p.companySize,
      website: p.website,
      description: p.description,
      descriptionLong: p.descriptionLong,
      logoUrl: p.logoUrl,
      city: p.city,
      country: p.country,
      foundedYear: p.foundedYear,
      linkedinUrl: p.linkedinUrl,
      contactPerson: p.contactPerson,
      contactEmail: p.contactEmail,
      contactPhone: p.contactPhone,
      workModes: this.parseJson(p.workModes),
      vacancyTypes: this.parseJson(p.vacancyTypes),
      workingLanguages: this.parseJson(p.workingLanguages),
      participatesInInternships: p.participatesInInternships,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  // ============================================================
  // GET MY PROFILE
  // ============================================================

  async getMyProfile(userId: number) {
    const profile = await this.companiesRepository.getProfile(userId);
    if (!profile) throw new Error('Company profile not found');
    return { profile: this.formatProfile(profile) };
  }

  // ============================================================
  // UPDATE MY PROFILE
  // ============================================================

  async updateMyProfile(userId: number, dto: UpdateCompanyProfileDto) {
    const existing = await this.companiesRepository.getProfile(userId);
    if (!existing) throw new Error('Company profile not found');

    const data: any = {};

    const stringFields = [
      'companyName', 'industry', 'size', 'website', 'description',
      'logoUrl', 'city', 'country', 'companySize', 'linkedinUrl',
      'descriptionLong', 'contactPerson', 'contactEmail', 'contactPhone',
    ] as const;

    for (const key of stringFields) {
      if ((dto as any)[key] !== undefined) data[key] = (dto as any)[key];
    }

    if (dto.foundedYear !== undefined) data.foundedYear = dto.foundedYear;

    const jsonArrayFields = ['workModes', 'vacancyTypes', 'workingLanguages'] as const;
    for (const key of jsonArrayFields) {
      if ((dto as any)[key] !== undefined) {
        const val = (dto as any)[key];
        data[key] = Array.isArray(val) && val.length > 0 ? JSON.stringify(val) : null;
      }
    }

    if (dto.participatesInInternships !== undefined) {
      data.participatesInInternships = dto.participatesInInternships ?? false;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV:updateMyProfile] userId=%d fields=%s data=%s', userId, Object.keys(data).join(','), JSON.stringify(data));
    }

    const updated = await this.companiesRepository.updateProfile(userId, data);
    return { profile: this.formatProfile(updated) };
  }

  async uploadLogo(userId: number, filePath: string): Promise<string> {
    const profile = await this.companiesRepository.getProfile(userId);
    if (!profile) throw new Error('Company profile not found');

    const relativePath = '/' + filePath.replace(/\\/g, '/').split('public/').pop()!;
    deleteFile(profile.logoUrl);
    await this.companiesRepository.updateProfile(userId, { logoUrl: relativePath });
    return relativePath;
  }

  // ============================================================
  // LIST MY CANDIDATES
  // ============================================================

  async listMyCandidates(companyId: number, dto: ListCandidatesDto) {
    const filters: CandidatesFilters = {};
    
    if (dto.status) {
      filters.status = dto.status;
    }

    if (dto.offerId) {
      filters.offerId = dto.offerId;
    }

    if (dto.search) {
      filters.search = dto.search;
    }

    const pagination: PaginationOptions = {
      page: dto.page || 1,
      limit: dto.limit || 10,
    };

    const result = await this.companiesRepository.findCompanyCandidates(
      companyId,
      filters,
      pagination
    );

    return {
      candidates: result.applications,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / pagination.limit),
      },
    };
  }

  // ============================================================
  // GET CANDIDATE BY ID
  // ============================================================

  async getCandidateById(applicationId: number, companyId: number) {
    const candidate = await this.companiesRepository.findCandidateById(
      applicationId,
      companyId
    );

    if (!candidate) {
      throw new Error('Candidate not found or you do not have access to this application');
    }

    return candidate;
  }

  // ============================================================
  // GET CANDIDATE STATISTICS
  // ============================================================

  async getMyCandidateStats(companyId: number) {
    return this.companiesRepository.getCandidateStats(companyId);
  }

  // ============================================================
  // GET DASHBOARD (job + program applications combined)
  // ============================================================

  async getDashboard(companyId: number) {
    // 1) Check if company has any published program offers
    const hasPublishedProgramOffers = await this.companiesRepository.hasPublishedProgramOffers(companyId);

    // 2) Parallel queries — skip program-specific queries if not needed
    const [
      jobStats,
      activeNormalOffers,
      allStatusCounts,
      directProgramCounts,
      latestProgramApps,
      latestJobProgramApps,
      activeProgramOffers,
    ] = await Promise.all([
      this.companiesRepository.getCandidateStats(companyId),
      this.companiesRepository.getActiveOffersWithCounts(companyId),
      this.companiesRepository.getAllApplicationStatusCounts(companyId),
      // Program queries: only run if company has program offers
      hasPublishedProgramOffers
        ? this.companiesRepository.getDirectProgramApplicationCounts(companyId)
        : Promise.resolve({ total: 0, byStatus: {} as Record<string, number>, pending: [] as any[], all: [] as any[] }),
      hasPublishedProgramOffers
        ? this.companiesRepository.getLatestProgramApplications(companyId, 10)
        : Promise.resolve([]),
      hasPublishedProgramOffers
        ? this.companiesRepository.getLatestJobApplicationsForPrograms(companyId, 10)
        : Promise.resolve([]),
      hasPublishedProgramOffers
        ? this.companiesRepository.getActiveProgramOffersWithCounts(companyId)
        : Promise.resolve([]),
    ]);

    // ── Active NORMAL offers (no program link) ──
    const offers = activeNormalOffers.map((o: any) => ({
      offerId: o.id,
      title: o.title,
      status: o.status,
      createdAt: o.createdAt,
      publishedAt: o.publishedAt,
      applicationsCount: o._count?.applications ?? 0,
    }));

    // ── Active PROGRAM offers (separate block) ──
    const programOffers = activeProgramOffers.map((o: any) => {
      const jobAppCount = o._count?.applications ?? 0;
      const programAppCount = o.programOffer?._count?.applications ?? 0;

      return {
        offerId: o.id,
        title: o.title,
        status: o.status,
        createdAt: o.createdAt,
        publishedAt: o.publishedAt,
        applicationsCount: jobAppCount + programAppCount,
        programOfferId: o.programOffer?.id ?? null,
        programId: o.programOffer?.program?.id ?? o.programOffer?.programId ?? null,
        programTitle: o.programOffer?.program?.title ?? null,
      };
    });

    // ── Program application totals (direct count — single source of truth) ──
    const totalProgramApplications = directProgramCounts.total;
    const mergedByStatus = directProgramCounts.byStatus;
    const pendingProgramApplications = mergedByStatus['PENDING'] ?? 0;

    // ── Latest program applications (merged from both tables) ──
    let latestProgramApplications: any[] = [];

    if (hasPublishedProgramOffers) {
      const formattedProgramApps = latestProgramApps.map((app: any) => ({
        applicationId: app.id,
        _source: 'ProgramApplication' as const,
        _studentId: app.student?.id ?? null,
        candidateId: app.student?.userId ?? null,
        candidateName: [app.student?.firstName, app.student?.lastName].filter(Boolean).join(' ') || null,
        email: app.student?.user?.email ?? null,
        offerId: app.offer?.jobOfferId ?? null,
        programOfferId: app.offer?.id ?? null,
        offerTitle: app.offer?.title ?? null,
        programId: app.offer?.program?.id ?? null,
        programTitle: app.offer?.program?.title ?? null,
        status: app.status,
        createdAt: app.appliedAt,
      }));

      const formattedJobProgramApps = latestJobProgramApps.map((app: any) => ({
        applicationId: app.id,
        _source: 'JobApplication' as const,
        _studentId: app.student?.id ?? null,
        candidateId: app.student?.userId ?? null,
        candidateName: [app.student?.firstName, app.student?.lastName].filter(Boolean).join(' ') || null,
        email: app.student?.user?.email ?? null,
        offerId: app.offer?.id ?? null,
        programOfferId: app.offer?.programOffer?.id ?? null,
        offerTitle: app.offer?.programOffer?.title ?? app.offer?.title ?? null,
        programId: app.offer?.programOffer?.program?.id ?? null,
        programTitle: app.offer?.programOffer?.program?.title ?? null,
        status: app.status,
        createdAt: app.appliedAt,
      }));

      // Deduplicate: same student + same program → keep first (ProgramApplication preferred)
      const seen = new Set<string>();
      const allLatest = [...formattedProgramApps, ...formattedJobProgramApps]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .filter((app) => {
          const key = `${app._studentId}-${app.programId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 10);

      latestProgramApplications = allLatest.map(({ _source, _studentId, ...rest }) => ({
        ...rest,
        source: _source === 'ProgramApplication' ? 'program' : 'job',
      }));
    }

    // ── Unified status metrics (all applications: normal + program) ──
    const pendingApplications = (allStatusCounts['PENDING'] ?? 0);
    const interviewApplications = (allStatusCounts['INTERVIEW'] ?? 0);
    const hiredApplications = (allStatusCounts['HIRED'] ?? 0);
    const rejectedApplications = (allStatusCounts['REJECTED'] ?? 0);

    // ── Dev logs ──
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getDashboard] companyId=%d hasPublishedProgramOffers=%s totalApplications=%d',
        companyId, hasPublishedProgramOffers, jobStats.total + totalProgramApplications,
      );
      console.log(
        '[DEV:getDashboard:statusMetrics] pendingApplications=%d interviewApplications=%d hiredApplications=%d rejectedApplications=%d',
        pendingApplications, interviewApplications, hiredApplications, rejectedApplications,
      );
      console.log(
        '[DEV:getDashboard:programCounts] companyId=%d totalProgramApplications=%d pendingProgramApplications=%d programByStatus=%s',
        companyId, totalProgramApplications, pendingProgramApplications, JSON.stringify(mergedByStatus),
      );
      if (hasPublishedProgramOffers) {
        const pendingIds = directProgramCounts.pending.map((a) => `${a.id}(${a.source})`);
        console.log(
          '[DEV:getDashboard:pendingProgramApps] count=%d ids=[%s]',
          directProgramCounts.pending.length, pendingIds.join(', '),
        );
        for (const a of directProgramCounts.all) {
          console.log(
            '[DEV:getDashboard:programApp] id=%d source=%s status=%s',
            a.id, a.source, a.status,
          );
        }
      }
      console.log(
        '[DEV:getDashboard] normalOffers=%d programOffers=%d',
        offers.length, programOffers.length,
      );
    }

    return {
      // Flag for frontend to show/hide program sections
      hasPublishedProgramOffers,

      // Active NORMAL offers (not linked to programs)
      activeOffers: offers,

      // Active PROGRAM offers (separate)
      activeProgramOffers: programOffers,

      // ── Unified status metrics (normal + program combined) ──
      pendingApplications,
      interviewApplications,
      hiredApplications,
      rejectedApplications,

      // Job application stats (normal offers only)
      totalJobApplications: jobStats.total,
      jobApplicationsByStatus: jobStats.byStatus,

      // Program application stats
      totalProgramApplications,
      programApplicationsByStatus: mergedByStatus,
      pendingProgramApplications,
      rejectedProgramApplications: (mergedByStatus['REJECTED'] ?? 0),

      // Combined
      totalApplications: jobStats.total + totalProgramApplications,

      // Latest program applications
      latestProgramApplications,
    };
  }

  // ============================================================
  // GET APPLICATIONS FOR A SPECIFIC JOB OFFER (normal offers only)
  // No ProgramOffer fallback — program offers use their own route.
  // ============================================================

  async getOfferApplications(companyId: number, offerId: number) {
    // 1) Check the JobOffer exists
    const jobOffer = await this.companiesRepository.findOfferByIdAndCompany(offerId, companyId);

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getOfferApplications] companyId=%d offerId=%d offerExists=%s belongsToCompany=%s',
        companyId, offerId, jobOffer ? 'true' : 'false', jobOffer ? 'true' : 'false',
      );
    }

    if (!jobOffer) {
      // Check if it exists at all (for a better log)
      if (process.env.NODE_ENV !== 'production') {
        const anyOffer = await this.companiesRepository.findOfferById(offerId);
        if (anyOffer) {
          console.log(
            '[DEV:getOfferApplications] offerId=%d EXISTS but belongs to companyId=%d, not %d',
            offerId, anyOffer.companyId, companyId,
          );
        } else {
          console.log(
            '[DEV:getOfferApplications] offerId=%d DOES NOT EXIST in JobOffer table',
            offerId,
          );
        }
      }
      throw new Error('Offer not found');
    }

    // 2) Get direct JobApplications only (no program mixing)
    const applications = await this.companiesRepository.findApplicationsByOffer(offerId, companyId);

    if (process.env.NODE_ENV !== 'production') {
      const appIds = applications.map((a: any) => a.id);
      console.log(
        '[DEV:getOfferApplications] companyId=%d offerId=%d offerTitle="%s" totalApplications=%d applicationIds=%s',
        companyId, offerId, jobOffer.title, applications.length, JSON.stringify(appIds),
      );
    }

    return {
      applications: applications.map((app: any) => this.formatJobApplication(app, offerId)),
    };
  }

  // ============================================================
  // GET APPLICATIONS FOR A PROGRAM OFFER (explicit route)
  // ============================================================

  async getProgramOfferApplications(companyId: number, programId: number, programOfferId: number) {
    const programOffer = await this.companiesRepository.findProgramOfferByIdAndCompany(programOfferId, companyId);

    if (!programOffer) {
      throw new Error('Program offer not found');
    }

    if (programOffer.programId !== programId) {
      throw new Error('Offer does not belong to this program');
    }

    const jobOfferId = programOffer.jobOfferId;

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getProgramOfferApplications] companyId=%d programId=%d programOfferId=%d jobOfferId=%s',
        companyId, programId, programOfferId, jobOfferId ?? 'null',
      );
    }

    const allApplications: any[] = [];

    // 1) ProgramApplications for this ProgramOffer
    const programRows = await this.companiesRepository.findProgramApplicationsByOffer(programOffer.id, companyId);
    for (const app of programRows) {
      allApplications.push(this.formatProgramApplication(app));
    }

    // 2) JobApplications via the linked jobOfferId (if exists)
    let jobCount = 0;
    if (jobOfferId) {
      const jobRows = await this.companiesRepository.findApplicationsByOffer(jobOfferId, companyId);
      jobCount = jobRows.length;
      for (const app of jobRows) {
        allApplications.push({
          ...this.formatJobApplication(app, jobOfferId),
          program: {
            programId: programOffer.program?.id ?? programId,
            title: programOffer.program?.title ?? null,
          },
        });
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DEV:getProgramOfferApplications] companyId=%d programOfferId=%d programApps=%d jobApps=%d totalApplications=%d',
        companyId, programOffer.id, programRows.length, jobCount, allApplications.length,
      );
    }

    return { applications: allApplications };
  }

  // ============================================================
  // UPDATE APPLICATION STATUS
  // ============================================================

  async updateApplicationStatus(
    companyId: number,
    applicationId: number,
    status: string,
    type?: 'job' | 'program',
  ) {
    // Validate status strictly
    const VALID_STATUSES = ['PENDING', 'INTERVIEW', 'HIRED', 'REJECTED'];
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const isDev = process.env.NODE_ENV !== 'production';

    // ── When type is NOT specified, check both tables to resolve automatically ──
    if (!type) {
      const [jobApp, programApp] = await Promise.all([
        this.companiesRepository.findJobApplicationByIdAndCompany(applicationId, companyId),
        this.companiesRepository.findProgramApplicationByIdAndCompany(applicationId, companyId),
      ]);

      if (jobApp && programApp) {
        // ID exists in BOTH tables — update both to keep them in sync
        if (isDev) {
          console.log(
            '[DEV:updateApplicationStatus:COLLISION] companyId=%d applicationId=%d jobStatus=%s programStatus=%s requestedStatus=%s — will update both',
            companyId, applicationId, jobApp.status, programApp.status, status,
          );
        }

        const jobPrev = jobApp.status;
        const progPrev = programApp.status;

        // Idempotent: if both already have the requested status, return early
        if (jobPrev === status && progPrev === status) {
          if (isDev) {
            console.log(
              '[DEV:updateApplicationStatus:IDEMPOTENT_BOTH] applicationId=%d both tables already at %s',
              applicationId, status,
            );
          }
          return {
            id: programApp.id,
            applicationId: programApp.id,
            source: 'program' as const,
            status: programApp.status,
            previousStatus: programApp.status,
            offerId: programApp.offer.id,
            offerTitle: programApp.offer.title,
            candidate: null,
            program: programApp.offer.program
              ? { programId: programApp.offer.program.id, title: programApp.offer.program.title }
              : null,
            updatedAt: new Date(),
            _idempotent: true,
          };
        }

        // Update both tables in parallel
        const updates: Promise<any>[] = [];
        if (jobPrev !== status) {
          updates.push(
            this.companiesRepository.updateJobApplicationStatus(applicationId, status as ApplicationStatus),
          );
        }
        if (progPrev !== status) {
          updates.push(
            this.companiesRepository.updateProgramApplicationStatus(applicationId, status as ProgramApplicationStatus),
          );
        }

        const results = await Promise.all(updates);
        const updatedProgram = progPrev !== status ? results[results.length - 1] : null;

        if (isDev) {
          console.log(
            '[DEV:updateApplicationStatus:COLLISION_UPDATED] companyId=%d applicationId=%d jobPrev=%s progPrev=%s finalSavedStatus=%s',
            companyId, applicationId, jobPrev, progPrev, status,
          );
        }

        // Send notification (use program context as primary)
        const notifTitle = updatedProgram?.offer?.title ?? programApp.offer.title;
        const notifUserId = updatedProgram?.student?.userId ?? null;
        const notifConfig = this.getNotificationConfig(status, notifTitle);
        if (notifConfig && notifUserId) {
          try {
            await prisma.notification.create({
              data: {
                userId: notifUserId,
                title: notifConfig.title,
                message: notifConfig.message,
                type: notifConfig.type as any,
                relatedId: applicationId,
                metadata: JSON.stringify({
                  applicationId,
                  offerId: programApp.offer.id,
                  programId: programApp.offer.programId ?? null,
                  status,
                  previousStatus: progPrev,
                  offerTitle: notifTitle,
                }),
              },
            });
          } catch (notifError) {
            if (isDev) {
              console.log('[DEV:updateApplicationStatus] notification creation failed:', notifError);
            }
          }
        }

        // Return program application info as the response (primary for dashboard)
        const candidate = updatedProgram?.student
          ? {
              studentId: updatedProgram.student.id,
              userId: updatedProgram.student.userId,
              fullName: [updatedProgram.student.firstName, updatedProgram.student.lastName].filter(Boolean).join(' ') || null,
              email: updatedProgram.student.user?.email ?? null,
            }
          : null;

        return {
          id: programApp.id,
          applicationId: programApp.id,
          source: 'program' as const,
          status: status as ProgramApplicationStatus,
          previousStatus: progPrev,
          offerId: programApp.offer.id,
          offerTitle: programApp.offer.title,
          candidate,
          program: programApp.offer.program
            ? { programId: programApp.offer.program.id, title: programApp.offer.program.title }
            : null,
          updatedAt: new Date(),
        };
      } else if (jobApp) {
        type = 'job';
      } else if (programApp) {
        type = 'program';
      } else {
        throw new Error('Application not found');
      }

      if (isDev) {
        console.log(
          '[DEV:updateApplicationStatus:autoType] applicationId=%d resolvedType=%s',
          applicationId, type,
        );
      }
    }

    // ── Update JobApplication ──
    if (type === 'job') {
      const jobApp = await this.companiesRepository.findJobApplicationByIdAndCompany(applicationId, companyId);
      if (!jobApp) throw new Error('Application not found');

      const previousStatus = jobApp.status;
      const isProgram = false;

      if (isDev) {
        console.log(
          '[DEV:updateApplicationStatus] companyId=%d applicationId=%d source=job currentStatus=%s requestedStatus=%s isProgram=%s',
          companyId, applicationId, previousStatus, status, isProgram,
        );
      }

      // Idempotent: status already matches
      if (previousStatus === status) {
        if (isDev) {
          console.log(
            '[DEV:updateApplicationStatus:IDEMPOTENT] applicationId=%d source=job status=%s — no update needed',
            applicationId, status,
          );
        }
        return {
          id: jobApp.id,
          applicationId: jobApp.id,
          source: 'job' as const,
          status: previousStatus,
          previousStatus,
          offerId: jobApp.offer.id,
          offerTitle: jobApp.offer.title,
          candidate: null,
          program: null,
          updatedAt: new Date(),
          _idempotent: true,
        };
      }

      const updated = await this.companiesRepository.updateJobApplicationStatus(
        applicationId,
        status as ApplicationStatus,
      );

      if (isDev) {
        console.log(
          '[DEV:updateApplicationStatus:SAVED] companyId=%d applicationId=%d source=job finalSavedStatus=%s previousStatus=%s isProgram=%s',
          companyId, applicationId, updated.status, previousStatus, isProgram,
        );
      }

      // Create notification for candidate
      const notifConfig = this.getNotificationConfig(status, updated.offer.title);
      if (notifConfig) {
        try {
          await prisma.notification.create({
            data: {
              userId: updated.student.userId,
              title: notifConfig.title,
              message: notifConfig.message,
              type: notifConfig.type as any,
              relatedId: applicationId,
              metadata: JSON.stringify({
                source: 'job',
                applicationId,
                offerId: updated.offer.id,
                jobOfferId: updated.offer.id,
                programOfferId: null,
                programId: null,
                companyId,
                status,
                previousStatus,
                offerTitle: updated.offer.title,
              }),
            },
          });
        } catch (notifError) {
          if (isDev) {
            console.log('[DEV:updateApplicationStatus] notification creation failed:', notifError);
          }
        }
      }

      return {
        id: updated.id,
        applicationId: updated.id,
        source: 'job' as const,
        status: updated.status,
        previousStatus,
        offerId: updated.offer.id,
        offerTitle: updated.offer.title,
        candidate: {
          studentId: updated.student.id,
          userId: updated.student.userId,
          fullName: [updated.student.firstName, updated.student.lastName].filter(Boolean).join(' ') || null,
          email: updated.student.user?.email ?? null,
        },
        program: null,
        updatedAt: new Date(),
      };
    }

    // ── Update ProgramApplication ──
    if (type === 'program') {
      const programApp = await this.companiesRepository.findProgramApplicationByIdAndCompany(applicationId, companyId);
      if (!programApp) throw new Error('Application not found');

      const previousStatus = programApp.status;
      const isProgram = true;

      if (isDev) {
        console.log(
          '[DEV:updateApplicationStatus] companyId=%d applicationId=%d source=program currentStatus=%s requestedStatus=%s isProgram=%s programId=%s',
          companyId, applicationId, previousStatus, status, isProgram, programApp.offer.programId ?? 'null',
        );
      }

      // Idempotent: status already matches
      if (previousStatus === status) {
        if (isDev) {
          console.log(
            '[DEV:updateApplicationStatus:IDEMPOTENT] applicationId=%d source=program status=%s — no update needed',
            applicationId, status,
          );
        }
        return {
          id: programApp.id,
          applicationId: programApp.id,
          source: 'program' as const,
          status: previousStatus,
          previousStatus,
          offerId: programApp.offer.id,
          offerTitle: programApp.offer.title,
          candidate: null,
          program: programApp.offer.program
            ? { programId: programApp.offer.program.id, title: programApp.offer.program.title }
            : null,
          updatedAt: new Date(),
          _idempotent: true,
        };
      }

      const updated = await this.companiesRepository.updateProgramApplicationStatus(
        applicationId,
        status as ProgramApplicationStatus,
      );

      if (isDev) {
        console.log(
          '[DEV:updateApplicationStatus:SAVED] companyId=%d applicationId=%d source=program finalSavedStatus=%s previousStatus=%s isProgram=%s programId=%s',
          companyId, applicationId, updated.status, previousStatus, isProgram, updated.offer.programId ?? 'null',
        );
      }

      const programId = updated.offer.programId ?? null;

      // Create notification for candidate
      const notifConfig = this.getNotificationConfig(status, updated.offer.title);
      if (notifConfig) {
        try {
          await prisma.notification.create({
            data: {
              userId: updated.student.userId,
              title: notifConfig.title,
              message: notifConfig.message,
              type: notifConfig.type as any,
              relatedId: applicationId,
              metadata: JSON.stringify({
                source: 'program',
                applicationId,
                offerId: updated.offer.id,
                jobOfferId: null,
                programOfferId: updated.offer.id,
                programId,
                companyId,
                status,
                previousStatus,
                offerTitle: updated.offer.title,
                programTitle: updated.offer.program?.title ?? null,
              }),
            },
          });
        } catch (notifError) {
          if (isDev) {
            console.log('[DEV:updateApplicationStatus] notification creation failed:', notifError);
          }
        }
      }

      return {
        id: updated.id,
        applicationId: updated.id,
        source: 'program' as const,
        status: updated.status,
        previousStatus,
        offerId: updated.offer.id,
        offerTitle: updated.offer.title,
        candidate: {
          studentId: updated.student.id,
          userId: updated.student.userId,
          fullName: [updated.student.firstName, updated.student.lastName].filter(Boolean).join(' ') || null,
          email: updated.student.user?.email ?? null,
        },
        program: updated.offer.program
          ? { programId: updated.offer.program.id, title: updated.offer.program.title }
          : null,
        updatedAt: new Date(),
      };
    }

    throw new Error('Application not found');
  }

  // ============================================================
  // CANONICAL CONTRACT HELPERS
  // ============================================================

  async getCanonicalDashboard(companyId: number) {
    const [
      jobStats,
      activeNormalOffers,
      activeProgramOffers,
      programByStatusRows,
      totalProgramApplications,
      recentJobApplications,
      recentProgramApplications,
    ] = await Promise.all([
      this.companiesRepository.getCandidateStats(companyId),
      this.companiesRepository.getActiveOffersWithCounts(companyId),
      prisma.programOffer.findMany({
        where: {
          companyId,
          status: 'APPROVED',
        },
        select: {
          id: true,
          jobOfferId: true,
          title: true,
          status: true,
          createdAt: true,
          approvedAt: true,
          program: {
            select: { id: true, title: true },
          },
          _count: {
            select: { applications: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.programApplication.groupBy({
        by: ['status'],
        where: { offer: { companyId } },
        _count: true,
      }),
      prisma.programApplication.count({
        where: { offer: { companyId } },
      }),
      prisma.jobApplication.findMany({
        where: {
          offer: {
            companyId,
            programOffer: { is: null },
          },
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
          offer: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
        take: 10,
      }),
      prisma.programApplication.findMany({
        where: { offer: { companyId } },
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
          offer: {
            select: {
              id: true,
              jobOfferId: true,
              title: true,
              status: true,
              program: {
                select: { id: true, title: true },
              },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
        take: 10,
      }),
    ]);

    const programApplicationsByStatus = programByStatusRows.reduce((acc, row) => {
      acc[row.status] = row._count;
      return acc;
    }, {} as Record<string, number>);

    const activeJobOffers = activeNormalOffers.map((offer: any) => ({
      jobOfferId: offer.id,
      title: offer.title,
      status: offer.status,
      createdAt: offer.createdAt,
      publishedAt: offer.publishedAt,
      applicationsCount: offer._count?.applications ?? 0,
    }));

    const programOffers = activeProgramOffers.map((offer) => ({
      programOfferId: offer.id,
      jobOfferId: offer.jobOfferId ?? null,
      programId: offer.program.id,
      title: offer.title,
      status: offer.status,
      createdAt: offer.createdAt,
      approvedAt: offer.approvedAt,
      applicationsCount: offer._count.applications,
      program: {
        programId: offer.program.id,
        title: offer.program.title,
      },
    }));

    const recentApplications = [
      ...recentJobApplications.map((application) => this.formatJobApplication(application, application.offer.id)),
      ...recentProgramApplications.map((application) => this.formatProgramApplication(application)),
    ]
      .sort((left, right) => {
        const dateDiff = new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime();
        if (dateDiff !== 0) return dateDiff;
        return right.applicationId - left.applicationId;
      })
      .slice(0, 10);

    const pendingApplications = (jobStats.byStatus['PENDING'] ?? 0) + (programApplicationsByStatus['PENDING'] ?? 0);
    const interviewApplications = (jobStats.byStatus['INTERVIEW'] ?? 0) + (programApplicationsByStatus['INTERVIEW'] ?? 0);
    const hiredApplications = (jobStats.byStatus['HIRED'] ?? 0) + (programApplicationsByStatus['HIRED'] ?? 0);
    const rejectedApplications = (jobStats.byStatus['REJECTED'] ?? 0) + (programApplicationsByStatus['REJECTED'] ?? 0);
    const totalApplications = jobStats.total + totalProgramApplications;
    const hasPublishedProgramOffers = programOffers.length > 0;
    const hasActiveJobOffers = activeJobOffers.length > 0;
    const hasActiveProgramOffers = programOffers.length > 0;
    const hasApplications = totalApplications > 0;

    return {
      companyId,
      summary: {
        activeJobOffersCount: activeJobOffers.length,
        activeProgramOffersCount: programOffers.length,
        pendingApplications,
        interviewApplications,
        hiredApplications,
        rejectedApplications,
        totalJobApplications: jobStats.total,
        totalProgramApplications,
        totalApplications,
      },
      activeJobOffers,
      activeProgramOffers: programOffers,
      recentApplications,
      actions: {
        reviewPendingApplications: pendingApplications > 0,
        publishFirstOffer: !hasActiveJobOffers && !hasActiveProgramOffers,
        publishFirstProgramOffer: !hasPublishedProgramOffers,
      },
      meta: {
        hasPublishedProgramOffers,
        hasApplications,
        hasActiveJobOffers,
        hasActiveProgramOffers,
        emptyState: !hasActiveJobOffers && !hasActiveProgramOffers
          ? {
              kind: 'NO_ACTIVE_OFFERS',
              message: 'This company does not have active offers yet.',
            }
          : null,
      },
    };
  }

  async getCanonicalOfferApplications(companyId: number, jobOfferId: number) {
    const jobOffer = await this.companiesRepository.findOfferByIdAndCompany(jobOfferId, companyId);
    if (!jobOffer) {
      throw new Error('Offer not found');
    }

    const applications = await this.companiesRepository.findApplicationsByOffer(jobOfferId, companyId);

    return {
      jobOffer: {
        jobOfferId: jobOffer.id,
        title: jobOffer.title,
        status: jobOffer.status,
        hasApplications: applications.length > 0,
      },
      applications: applications.map((application: any) => this.formatJobApplication(application, jobOfferId)),
      meta: {
        totalApplications: applications.length,
        hasApplications: applications.length > 0,
        emptyState: applications.length === 0
          ? {
              kind: 'NO_APPLICATIONS',
              message: 'This offer has not received applications yet.',
            }
          : null,
      },
    };
  }

  async getCanonicalOfferDetail(companyId: number, jobOfferId: number) {
    const jobOffer = await this.companiesRepository.findOfferByIdAndCompany(jobOfferId, companyId);
    if (!jobOffer) {
      throw new Error('Offer not found');
    }

    return {
      jobOfferId: jobOffer.id,
      companyId,
      title: jobOffer.title,
      description: jobOffer.description,
      requirements: jobOffer.requirements ?? null,
      location: jobOffer.location ?? null,
      salary: jobOffer.salary ?? null,
      workMode: jobOffer.workMode ?? null,
      contractType: jobOffer.contractType ?? null,
      experienceLevel: jobOffer.experienceLevel ?? null,
      status: jobOffer.status,
      publishedAt: jobOffer.publishedAt ?? null,
      closedAt: jobOffer.closedAt ?? null,
      expiresAt: jobOffer.expiresAt ?? null,
      createdAt: jobOffer.createdAt,
      updatedAt: jobOffer.updatedAt,
      applicationsCount: jobOffer._count?.applications ?? 0,
      isProgramLinked: false,
      hasApplications: (jobOffer._count?.applications ?? 0) > 0,
      canEdit: jobOffer.status !== 'CLOSED',
      canPublish: jobOffer.status === 'DRAFT',
      canClose: jobOffer.status === 'PUBLISHED',
      isExpired: Boolean(jobOffer.expiresAt && new Date(jobOffer.expiresAt).getTime() < Date.now()),
    };
  }

  async getCanonicalProgramOfferApplications(companyId: number, programId: number, programOfferId: number) {
    const programOffer = await this.companiesRepository.findProgramOfferByIdAndCompany(programOfferId, companyId);
    if (!programOffer) {
      throw new Error('Program offer not found');
    }
    if (programOffer.programId !== programId) {
      throw new Error('Offer does not belong to this program');
    }

    const applications = await this.companiesRepository.findProgramApplicationsByOffer(programOfferId, companyId);

    return {
      programOffer: {
        programOfferId: programOffer.id,
        jobOfferId: programOffer.jobOfferId ?? null,
        programId: programOffer.programId,
        title: programOffer.title,
        status: programOffer.status,
        hasApplications: applications.length > 0,
      },
      applications: applications.map((application: any) => this.formatProgramApplication(application)),
      meta: {
        totalApplications: applications.length,
        hasApplications: applications.length > 0,
        emptyState: applications.length === 0
          ? {
              kind: 'NO_APPLICATIONS',
              message: 'This program offer has not received applications yet.',
            }
          : null,
      },
    };
  }

  async updateCanonicalProgramOffer(
    companyId: number,
    programId: number,
    programOfferId: number,
    dto: {
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
    const offer = await this.companiesRepository.findProgramOfferForManagement(programOfferId, companyId);
    if (!offer) {
      throw new Error('Program offer not found');
    }
    if (offer.programId !== programId) {
      throw new Error('Offer does not belong to this program');
    }

    const updated = await this.companiesRepository.updateProgramOfferContent(
      programOfferId,
      offer.jobOfferId ?? null,
      dto,
    );

    return {
      programOffer: {
        programOfferId: updated.id,
        programId: updated.programId,
        jobOfferId: offer.jobOfferId ?? null,
        companyId: updated.companyId,
        title: updated.title,
        description: updated.description,
        requirements: updated.requirements ?? null,
        location: updated.location ?? null,
        salary: updated.salary ?? null,
        workMode: updated.workMode ?? null,
        contractType: updated.contractType ?? null,
        experienceLevel: updated.experienceLevel ?? null,
        maxApplicants: updated.maxApplicants ?? null,
        status: updated.status,
        approvedAt: updated.approvedAt ?? null,
        applicationsCount: updated._count?.applications ?? 0,
        program: {
          programId: updated.program.id,
          title: updated.program.title,
        },
        company: {
          companyId: updated.company.id,
          name: updated.company.companyName,
        },
      },
      message: 'Program offer updated successfully',
      meta: {
        resubmittedForReview: true,
      },
    };
  }

  async deleteCanonicalProgramOffer(
    companyId: number,
    programId: number,
    programOfferId: number,
  ) {
    const offer = await this.companiesRepository.findProgramOfferForManagement(programOfferId, companyId);
    if (!offer) {
      throw new Error('Program offer not found');
    }
    if (offer.programId !== programId) {
      throw new Error('Offer does not belong to this program');
    }

    const programApplicationsCount = offer._count?.applications ?? 0;
    const jobApplicationsCount = offer.jobOffer?._count?.applications ?? 0;
    if (programApplicationsCount > 0 || jobApplicationsCount > 0) {
      throw new Error('Program offer cannot be deleted because it already has applications');
    }

    await this.companiesRepository.deleteProgramOfferCascade(
      offer.id,
      offer.jobOfferId ?? null,
    );

    return {
      message: 'Program offer deleted successfully',
      deleted: true,
      programOfferId: offer.id,
      programId: offer.programId,
      jobOfferId: offer.jobOfferId ?? null,
    };
  }

  async updateCanonicalApplicationStatus(
    companyId: number,
    applicationId: number,
    status: string,
    type?: 'job' | 'program',
  ) {
    if (!type) {
      const [jobApplication, programApplication] = await Promise.all([
        this.companiesRepository.findJobApplicationByIdAndCompany(applicationId, companyId),
        this.companiesRepository.findProgramApplicationByIdAndCompany(applicationId, companyId),
      ]);

      if (jobApplication && programApplication) {
        throw new Error('Ambiguous application ID. Provide type "job" or "program"');
      }
    }

    const application = await this.updateApplicationStatus(companyId, applicationId, status, type);
    const canonicalOffer =
      application.source === 'job'
        ? {
            jobOfferId: (application as any).offer?.jobOfferId ?? (application as any).offerId ?? null,
            title: (application as any).offer?.title ?? (application as any).offerTitle ?? null,
          }
        : {
            programOfferId: (application as any).offer?.programOfferId ?? (application as any).offerId ?? null,
            jobOfferId: (application as any).offer?.jobOfferId ?? null,
            title: (application as any).offer?.title ?? (application as any).offerTitle ?? null,
          };

    return {
      application: {
        applicationId: application.applicationId,
        source: application.source,
        status: application.status,
        previousStatus: application.previousStatus,
        updatedAt: application.updatedAt,
        candidate: application.candidate,
        offer: canonicalOffer,
        program: application.program ?? null,
      },
      idempotent: Boolean((application as any)._idempotent),
      message: (application as any)._idempotent
        ? 'Application status already set'
        : 'Application status updated successfully',
    };
  }

  // ============================================================
  // FORMAT HELPERS
  // ============================================================

  private formatCandidate(student: any) {
    const location = [student?.city, student?.country].filter(Boolean).join(', ') || null;
    const universityName = student?.universityMembership?.university?.universityName ?? null;

    return {
      userId: student?.userId ?? null,
      studentId: student?.id ?? null,
      fullName: [student?.firstName, student?.lastName].filter(Boolean).join(' ') || null,
      email: student?.user?.email ?? null,
      location,
      isStudent: student?.isActiveStudent ?? false,
      universityName,
      resumeUrl: student?.resumeUrl ?? null,
      avatarUrl: student?.avatarUrl ?? null,
    };
  }

  private formatJobApplication(app: any, offerId: number) {
    return {
      applicationId: app.id,
      source: 'job' as const,
      status: app.status,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt ?? app.appliedAt,
      candidate: this.formatCandidate(app.student),
      offer: {
        jobOfferId: app.offer?.id ?? offerId,
        programOfferId: app.offer?.programOffer?.id ?? null,
        title: app.offer?.title ?? null,
        status: app.offer?.status ?? null,
      },
      program: null,
    };
  }

  private formatProgramApplication(app: any) {
    return {
      applicationId: app.id,
      source: 'program' as const,
      status: app.status,
      appliedAt: app.appliedAt,
      updatedAt: app.reviewedAt ?? app.appliedAt,
      candidate: this.formatCandidate(app.student),
      offer: {
        programOfferId: app.offer?.id ?? app.offerId,
        jobOfferId: app.offer?.jobOfferId ?? null,
        title: app.offer?.title ?? null,
        status: app.offer?.status ?? null,
      },
      program: app.offer?.program
        ? {
            programId: app.offer.program.id,
            title: app.offer.program.title,
          }
        : null,
    };
  }
}
