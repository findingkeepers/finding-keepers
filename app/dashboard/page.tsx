"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useDashboardMenu } from "@/components/dashboard/DashboardLayoutProvider";
import { VerificationSection } from "@/components/dashboard/VerificationSection";
import { VerifiedDashboard } from "@/components/dashboard/VerifiedDashboard";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [hkidNumber, setHkidNumber] = useState("");
  const [hkidFile, setHkidFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [hasCompletedCV, setHasCompletedCV] = useState(false);
  const [userName, setUserName] = useState("");

  const { onMenuClick } = useDashboardMenu();

  useEffect(() => {
    const checkVerification = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, verification_status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.full_name) setUserName(profile.full_name);
      if (profile?.verification_status === "verified") setIsVerified(true);

      setLoading(false);
    };

    checkVerification();
  }, []);

  useEffect(() => {
    const checkCVCompletion = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cvData } = await supabase
        .from("cvs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setHasCompletedCV(!!cvData);
    };

    if (isVerified) checkCVCompletion();
  }, [isVerified]);

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hkidNumber || !hkidFile || !paymentFile) {
      toast.error("Please fill all fields and upload both files");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
          gender: user.user_metadata?.gender || "male",
          verification_status: "unverified",
        },
        { onConflict: "id" }
      );

      const hkidPath = `${user.id}/hkid_${Date.now()}`;
      const { error: hkidError } = await supabase.storage
        .from("verifications")
        .upload(hkidPath, hkidFile);
      if (hkidError) throw hkidError;

      const paymentPath = `${user.id}/payment_${Date.now()}`;
      const { error: paymentError } = await supabase.storage
        .from("verifications")
        .upload(paymentPath, paymentFile);
      if (paymentError) throw paymentError;

      const { error: insertError } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          hkid_number: hkidNumber,
          hkid_image_path: hkidPath,
          payment_proof_path: paymentPath,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast.success("Verification submitted successfully!");
      setSubmitted(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to submit verification";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCV = async () => {
    if (!confirm("Are you sure you want to delete your CV?")) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      localStorage.removeItem("cv_form_data");
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("match_request_")) localStorage.removeItem(key);
      });

      const { data: existingCV } = await supabase
        .from("cvs")
        .select("photo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingCV?.photo_url) {
        const urlParts = existingCV.photo_url.split("/profile-photos/");
        if (urlParts.length > 1) {
          await supabase.storage
            .from("profile-photos")
            .remove([`profile-photos/${urlParts[1]}`]);
        }
      }

      await supabase.from("cvs").delete().eq("user_id", user.id);
      setHasCompletedCV(false);
      toast.success("CV deleted successfully");
    } catch {
      toast.error("Failed to delete CV");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-fk-gold border-t-transparent" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <VerificationSection
        userName={userName}
        submitted={submitted}
        submitting={submitting}
        hkidNumber={hkidNumber}
        onHkidNumberChange={setHkidNumber}
        onHkidFileChange={setHkidFile}
        onPaymentFileChange={setPaymentFile}
        onSubmit={handleVerificationSubmit}
        onMenuClick={onMenuClick}
      />
    );
  }

  return (
    <VerifiedDashboard
      userName={userName}
      hasCompletedCV={hasCompletedCV}
      onDeleteCV={handleDeleteCV}
      onMenuClick={onMenuClick}
    />
  );
}