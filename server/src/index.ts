import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/authRoutes";
import claimRoutes from "./routes/claimRoutes";
import userRoutes from "./routes/userRoutes";
import financeRoutes from "./modules/finance/finance.routes";
import { handleRazorpayWebhook } from "./modules/finance/finance.controller";
import adminRoutes from "./modules/admin/admin.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.post(
  "/api/finance/webhooks/razorpay",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded receipts
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/users", userRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/admin", adminRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Reimbursement Platform API is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
