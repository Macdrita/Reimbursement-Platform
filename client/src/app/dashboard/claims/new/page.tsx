"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { claimsAPI } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Loader2, CheckCircle2, FileImage, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { getRoleHomePath } from "@/lib/navigation";

export default function NewClaimPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const canSubmitClaim = Boolean(user && !["FINANCE_ADMIN", "SUPERADMIN"].includes(user.role));

  useEffect(() => {
    if (!authLoading && user && !canSubmitClaim) {
      router.replace(getRoleHomePath(user.role));
    }
  }, [authLoading, canSubmitClaim, router, user]);

  if (authLoading || !user || !canSubmitClaim) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!file) {
      setError("Please upload a receipt file");
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("amount", amount);
      formData.append("description", description);
      formData.append("receipt", file);

      await claimsAPI.create(formData);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/claims"), 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          "Failed to submit claim. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-500/15 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Claim Submitted!
            </h2>
            <p className="text-white/40 text-sm">
              Your reimbursement request has been sent for review
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Submit New Claim
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Upload your receipt and fill in the details
          </p>
        </div>

        <Card className="bg-[#12121e]/60 backdrop-blur-sm border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Claim Details
            </CardTitle>
            <CardDescription className="text-white/40">
              All fields marked are required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title" className="text-white/70 text-sm">
                  Expense Title *
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., Taxi fare to office"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-white/70 text-sm">
                  Amount (₹) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-white/70 text-sm"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Add any additional details about this expense..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-violet-500/50 focus:ring-violet-500/20 resize-none"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">
                  Receipt / Invoice *
                </Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    file
                      ? "border-violet-500/30 bg-violet-500/5"
                      : "border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileImage className="h-8 w-8 text-violet-400" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-white/40">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="ml-2 p-1 rounded-md hover:bg-white/10 transition-colors"
                      >
                        <X className="h-4 w-4 text-white/40" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-white/20 mx-auto mb-3" />
                      <p className="text-sm text-white/40 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-white/20">
                        JPG, PNG, WEBP, or PDF (Max 5MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/claims")}
                  className="flex-1 h-11 bg-transparent border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-violet-500/20 border-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Claim"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
