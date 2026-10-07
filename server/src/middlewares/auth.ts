import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RegistrationStatus, Role } from "@prisma/client";
import { prisma } from "../prisma";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Access denied. No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access denied. Token missing." });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || "default_jwt_secret";
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "string" || typeof decoded.id !== "string") {
      res.status(401).json({ message: "Invalid or expired token." });
      return;
    }

    void prisma.user
      .findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true, registrationStatus: true },
      })
      .then((user) => {
        if (!user) {
          res.status(401).json({ message: "Account no longer exists." });
          return;
        }

        if (user.registrationStatus !== RegistrationStatus.APPROVED) {
          res.status(403).json({ message: "This account is not active." });
          return;
        }

        req.user = { id: user.id, email: user.email, role: user.role as Role };
        next();
      })
      .catch((error: unknown) => {
        console.error("Authentication lookup failed:", error);
        res.status(500).json({ message: "Unable to verify account status." });
      });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};
