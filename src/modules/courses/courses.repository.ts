import { prisma } from '../../config/database';

export class CoursesRepository {
  // ============================================================
  // GET ALL COURSES
  // ============================================================
  
  async findAll(skip: number, take: number, search?: string) {
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { platform: { contains: search } },
      ];
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]);

    return { courses, total };
  }

  // ============================================================
  // GET COURSE BY ID
  // ============================================================
  
  async findById(courseId: number) {
    return prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: { completions: true },
        },
      },
    });
  }

  // ============================================================
  // CHECK IF STUDENT COMPLETED COURSE
  // ============================================================
  
  async hasStudentCompleted(courseId: number, studentId: number) {
    const completion = await prisma.courseCompletion.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
    });

    return !!completion;
  }

  // ============================================================
  // CREATE COURSE COMPLETION
  // ============================================================
  
  async createCompletion(courseId: number, studentId: number, certificateUrl?: string) {
    return prisma.courseCompletion.create({
      data: {
        courseId,
        studentId,
        certificateUrl,
      },
      include: {
        course: true,
        student: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // ============================================================
  // GET STUDENT COMPLETIONS
  // ============================================================
  
  async getStudentCompletions(studentId: number) {
    return prisma.courseCompletion.findMany({
      where: { studentId },
      include: {
        course: true,
      },
      orderBy: { completedAt: 'desc' },
    });
  }
}
