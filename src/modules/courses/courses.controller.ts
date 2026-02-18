import { Request, Response } from 'express';
import { CoursesService } from './courses.service';
import { listCoursesSchema, completeCourseSchema } from './courses.dto';
import { prisma } from '../../config/database';

export class CoursesController {
  private coursesService: CoursesService;

  constructor() {
    this.coursesService = new CoursesService();
  }

  // ============================================================
  // LIST COURSES
  // ============================================================

  listCourses = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = listCoursesSchema.parse(req.query);
      const result = await this.coursesService.listCourses(dto);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // COMPLETE COURSE
  // ============================================================

  completeCourse = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const courseId = parseInt(req.params.id as string);
      
      // Get student profile from userId
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!studentProfile) {
        res.status(403).json({ error: 'Only students can complete courses' });
        return;
      }

      const dto = completeCourseSchema.parse(req.body);

      const result = await this.coursesService.completeCourse(courseId, studentProfile.id, dto);

      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'Course not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================
  // GET MY COMPLETED COURSES
  // ============================================================

  getMyCompletedCourses = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Get student profile from userId
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: req.user.userId },
      });

      if (!studentProfile) {
        res.status(403).json({ error: 'Only students can view completed courses' });
        return;
      }

      const result = await this.coursesService.getMyCompletedCourses(studentProfile.id);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
