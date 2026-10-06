import { Request, Response } from "express";
import { prisma } from "../prisma";
import { Role } from "@prisma/client";

export const getManagers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const managers = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.MANAGER, Role.HOD, Role.SUPERADMIN],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    res.status(200).json({ managers });
  } catch (error) {
    console.error("Get Managers Error:", error);
    res.status(500).json({ message: "Internal server error fetching managers." });
  }
};

export const getHODs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const hods = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.HOD, Role.SUPERADMIN],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    res.status(200).json({ hods });
  } catch (error) {
    console.error("Get HODs Error:", error);
    res.status(500).json({ message: "Internal server error fetching HODs." });
  }
};
