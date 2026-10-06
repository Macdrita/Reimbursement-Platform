import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { AuthRequest } from "../middlewares/auth";
import { Role } from "@prisma/client";

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, managerId } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ message: "Name, email, and password are required." });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: "User with this email already exists." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole: Role = role && Object.values(Role).includes(role) ? role : Role.EMPLOYEE;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        managerId: managerId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        managerId: true,
        createdAt: true,
      },
    });

    const secret = process.env.JWT_SECRET || "default_jwt_secret";
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Internal server error during registration." });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const secret = process.env.JWT_SECRET || "default_jwt_secret";
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "7d" }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error during login." });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        managerId: true,
        manager: {
          select: { id: true, name: true, email: true },
        },
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ message: "Internal server error fetching user profile." });
  }
};
