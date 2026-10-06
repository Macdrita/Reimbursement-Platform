import { Response } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middlewares/auth";
import { ClaimStatus } from "@prisma/client";

export const createClaim = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const { title, description, amount } = req.body;

    if (!title || !amount) {
      res.status(400).json({ message: "Title and amount are required." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "Receipt file is required." });
      return;
    }

    const receiptUrl = `/uploads/${req.file.filename}`;

    const claim = await prisma.claim.create({
      data: {
        title,
        description: description || "",
        amount: parseFloat(amount),
        receiptUrl,
        employeeId: req.user.id,
        status: ClaimStatus.PENDING,
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({
      message: "Claim submitted successfully",
      claim,
    });
  } catch (error) {
    console.error("Create Claim Error:", error);
    res.status(500).json({ message: "Internal server error while submitting claim." });
  }
};

export const getMyClaims = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const claims = await prisma.claim.findMany({
      where: { employeeId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({ claims });
  } catch (error) {
    console.error("Get My Claims Error:", error);
    res.status(500).json({ message: "Internal server error fetching claims." });
  }
};

export const getSubordinateClaims = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    let whereCondition: any = {};

    if (req.user.role === "HOD") {
      whereCondition = {
        OR: [
          // Claims from direct subordinates of this HOD (e.g., Managers or direct Employees)
          { employee: { managerId: req.user.id } },
          // Claims redirected specifically to this HOD or redirected generally to HODs
          { isRedirected: true, redirectedToId: req.user.id },
          { isRedirected: true, redirectedToId: null },
          // Claims from employees whose manager reports to this HOD
          { employee: { manager: { managerId: req.user.id } } },
        ],
      };
    } else if (req.user.role === "MANAGER") {
      whereCondition = {
        employee: {
          managerId: req.user.id,
        },
      };
    } else if (["SUPERADMIN", "FINANCE"].includes(req.user.role)) {
      whereCondition = {};
    } else {
      res.status(403).json({ message: "Forbidden. Invalid role for reviewing claims." });
      return;
    }

    const claims = await prisma.claim.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: { id: true, name: true, email: true, role: true, managerId: true },
        },
        reviewer: {
          select: { id: true, name: true, email: true },
        },
        redirectedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({ claims });
  } catch (error) {
    console.error("Get Subordinate Claims Error:", error);
    res.status(500).json({ message: "Internal server error fetching subordinate claims." });
  }
};

export const redirectClaim = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const claimId = req.params.id as string;
    const { redirectedToId, reason } = req.body;

    if (!claimId) {
      res.status(400).json({ message: "Claim ID is required." });
      return;
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        employee: {
          select: { id: true, managerId: true },
        },
      },
    });

    if (!claim) {
      res.status(404).json({ message: "Claim not found." });
      return;
    }

    // Verify manager relationship or admin permissions
    const isDirectManager = claim.employee.managerId === req.user.id;
    const isAdmin = ["SUPERADMIN", "FINANCE"].includes(req.user.role);

    if (!isDirectManager && !isAdmin) {
      res.status(403).json({ message: "Forbidden. You can only redirect claims of your direct subordinates." });
      return;
    }

    let targetHodId = redirectedToId || null;

    // If target HOD is not provided, try to find the current user's manager if they are an HOD
    if (!targetHodId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { managerId: true, manager: { select: { id: true, role: true } } },
      });

      if (currentUser?.manager && currentUser.manager.role === "HOD") {
        targetHodId = currentUser.manager.id;
      }
    }

    const updatedClaim = await prisma.claim.update({
      where: { id: claimId },
      data: {
        isRedirected: true,
        redirectedToId: targetHodId,
        redirectReason: reason || "Redirected by Manager to HOD",
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
        reviewer: {
          select: { id: true, name: true, email: true },
        },
        redirectedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({
      message: "Claim successfully redirected to HOD",
      claim: updatedClaim,
    });
  } catch (error) {
    console.error("Redirect Claim Error:", error);
    res.status(500).json({ message: "Internal server error redirecting claim." });
  }
};

export const reviewClaim = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const claimId = req.params.id as string;
    const { status, reviewComment } = req.body;

    if (!claimId) {
      res.status(400).json({ message: "Claim ID is required." });
      return;
    }

    if (!status || ![ClaimStatus.APPROVED, ClaimStatus.REJECTED].includes(status)) {
      res.status(400).json({ message: "Status must be either APPROVED or REJECTED." });
      return;
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        employee: {
          select: { id: true, managerId: true, manager: { select: { id: true, managerId: true } } },
        },
      },
    });

    if (!claim) {
      res.status(404).json({ message: "Claim not found." });
      return;
    }

    // Verify reviewer permissions:
    // 1. Direct manager of employee
    // 2. Claim is redirected specifically to this reviewer
    // 3. User is an HOD and claim is redirected (or employee reports to a manager who reports to this HOD)
    // 4. User is SUPERADMIN or FINANCE
    const isDirectManager = claim.employee.managerId === req.user.id;
    const isRedirectedToUser = claim.isRedirected && claim.redirectedToId === req.user.id;
    const isHodForRedirected = req.user.role === "HOD" && (claim.isRedirected || claim.employee.manager?.managerId === req.user.id);
    const isAdmin = ["SUPERADMIN", "FINANCE"].includes(req.user.role);

    if (!isDirectManager && !isRedirectedToUser && !isHodForRedirected && !isAdmin) {
      res.status(403).json({ message: "Forbidden. You are not authorized to review this claim." });
      return;
    }

    const updatedClaim = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: status as ClaimStatus,
        reviewerId: req.user.id,
        reviewComment: reviewComment || null,
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
        reviewer: {
          select: { id: true, name: true, email: true },
        },
        redirectedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({
      message: `Claim successfully ${status.toLowerCase()}`,
      claim: updatedClaim,
    });
  } catch (error) {
    console.error("Review Claim Error:", error);
    res.status(500).json({ message: "Internal server error reviewing claim." });
  }
};
