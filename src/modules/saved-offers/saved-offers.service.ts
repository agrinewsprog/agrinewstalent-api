import { SavedOffer } from '@prisma/client';
import { prisma } from '../../config/database';

export class SavedOffersService {

  private async getStudentIdFromUserId(userId: number): Promise<number> {
    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new Error('Student profile not found');
    }
    return student.id;
  }

  async saveOffer(userId: number, offerId: number): Promise<SavedOffer> {
    const studentId = await this.getStudentIdFromUserId(userId);

    // Verify offer exists
    const offer = await prisma.jobOffer.findUnique({ where: { id: offerId } });
    if (!offer) {
      throw new Error('Offer not found');
    }

    // Check if already saved
    const existing = await prisma.savedOffer.findFirst({
      where: { studentId, offerId },
    });
    if (existing) {
      throw new Error('Offer is already saved');
    }

    return prisma.savedOffer.create({
      data: { studentId, offerId },
    });
  }

  async unsaveOffer(userId: number, offerId: number): Promise<void> {
    const studentId = await this.getStudentIdFromUserId(userId);

    await prisma.savedOffer.deleteMany({
      where: { studentId, offerId },
    });
  }

  async getSavedOffers(userId: number): Promise<SavedOffer[]> {
    const studentId = await this.getStudentIdFromUserId(userId);

    return prisma.savedOffer.findMany({
      where: { studentId },
      include: { offer: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
