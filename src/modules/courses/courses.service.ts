import { CoursesRepository } from './courses.repository';
import { ListCoursesDto, CompleteCourseDto } from './courses.dto';

export class CoursesService {
  private coursesRepository: CoursesRepository;

  constructor() {
    this.coursesRepository = new CoursesRepository();
  }

  // ============================================================
  // LIST COURSES
  // ============================================================

  async listCourses(dto: ListCoursesDto) {
    const { page = 1, limit = 20, search } = dto;
    const skip = (page - 1) * limit;

    const { courses, total } = await this.coursesRepository.findAll(skip, limit, search);

    return {
      courses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // COMPLETE COURSE
  // ============================================================

  async completeCourse(courseId: number, studentId: number, dto: CompleteCourseDto) {
    // Verify course exists
    const course = await this.coursesRepository.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Check if student already completed this course
    const hasCompleted = await this.coursesRepository.hasStudentCompleted(courseId, studentId);
    if (hasCompleted) {
      throw new Error('Course already completed');
    }

    // Create completion
    const completion = await this.coursesRepository.createCompletion(
      courseId,
      studentId,
      dto.certificateUrl
    );

    return {
      message: 'Course marked as completed successfully',
      completion,
    };
  }

  // ============================================================
  // GET MY COMPLETED COURSES
  // ============================================================

  async getMyCompletedCourses(studentId: number) {
    const completions = await this.coursesRepository.getStudentCompletions(studentId);

    return {
      completions,
      total: completions.length,
    };
  }
}
