import { Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AuthRequest } from "./auth";

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized. Please authenticate first." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: `Forbidden. Access requires one of the following roles: ${allowedRoles.join(", ")}`
      });
      return;
    }

    next();
  };
};
