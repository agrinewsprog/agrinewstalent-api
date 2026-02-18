import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role as Role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ 
        error: 'Access denied',
        message: `This resource requires one of the following roles: ${allowedRoles.join(', ')}` 
      });
      return;
    }

    next();
  };
};
