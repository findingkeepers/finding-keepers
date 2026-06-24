"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardHeader } from "./DashboardHeader";
import { VerificationStepper } from "./VerificationStepper";

type VerificationSectionProps = {
  userName: string;
  submitted: boolean;
  submitting: boolean;
  hkidNumber: string;
  onHkidNumberChange: (value: string) => void;
  onHkidFileChange: (file: File | null) => void;
  onPaymentFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onMenuClick: () => void;
};

export function VerificationSection({
  userName,
  submitted,
  submitting,
  hkidNumber,
  onHkidNumberChange,
  onHkidFileChange,
  onPaymentFileChange,
  onSubmit,
  onMenuClick,
}: VerificationSectionProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <DashboardHeader
        userName={userName}
        isVerified={false}
        subtitle="Complete verification to access all features."
        onMenuClick={onMenuClick}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h2 className="mb-2 font-sans text-xl font-medium tracking-wide text-fk-plum">
          Account Verification
        </h2>
        <p className="mb-6 text-muted-foreground">
          To ensure trust and safety, all members are manually verified by our
          admin team.
        </p>
        <VerificationStepper />
      </motion.div>

      {!submitted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-fk-plum">
                Complete Your Verification
              </CardTitle>
              <CardDescription>
                Upload your documents below. Our team will review them within
                24–48 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="hkid">HKID Number</Label>
                  <Input
                    id="hkid"
                    value={hkidNumber}
                    onChange={(e) => onHkidNumberChange(e.target.value)}
                    placeholder="A123456(7)"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hkid-file">Upload HKID Photo/Scan</Label>
                  <Input
                    id="hkid-file"
                    type="file"
                    onChange={(e) =>
                      onHkidFileChange(e.target.files?.[0] || null)
                    }
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-file">Upload Payment Proof</Label>
                  <Input
                    id="payment-file"
                    type="file"
                    onChange={(e) =>
                      onPaymentFileChange(e.target.files?.[0] || null)
                    }
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="rounded-xl"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-fk-plum text-fk-cream hover:bg-fk-plum/90"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit for Verification"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="py-10 text-center">
              <h3 className="font-sans text-xl font-medium text-emerald-800">
                Verification Submitted
              </h3>
              <p className="mt-2 text-emerald-700">
                Our admin team will review your documents soon. You&apos;ll
                receive access once approved.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}