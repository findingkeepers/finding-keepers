"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useDashboardMenu } from "@/components/dashboard/DashboardLayoutProvider";
import {
  VerificationSection,
  type VerificationUiStatus,
} from "@/components/dashboard/VerificationSection";
import { VerifiedDashboard } from "@/components/dashboard/VerifiedDashboard";
import { sendVerificationPendingEmail } from "@/app/actions/auth";
import { notifyAdminsVerificationSubmitted } from "@/app/actions/verification";
import {
  emptyNonPrVerificationForm,
  validateNonPrVerification,
  type NonPrVerificationForm,
} from "@/lib/non-pr-verification";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationUiStatus>("idle");
  const [submitting, setSubmitting] = useState(false);

  const [hkidNumber, setHkidNumber] = useState("");
  const [hkidFile, setHkidFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [visaFile, setVisaFile] = useState<File | null>(null);
  const [nonPrForm, setNonPrForm] = useState<NonPrVerificationForm>(
    emptyNonPrVerificationForm
  );
  const [isPermanentResident, setIsPermanentResident] = useState(true);
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
        .select("full_name, verification_status, is_permanent_resident")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.full_name) setUserName(profile.full_name);

      const metadataPr = user.user_metadata?.is_permanent_resident;
      const isPr =
        profile?.is_permanent_resident ??
        (typeof metadataPr === "boolean" ? metadataPr : true);
      setIsPermanentResident(isPr);
      if (profile?.verification_status === "verified") {
        setIsVerified(true);
        setLoading(false);
        return;
      }

      const { data: latestRequest } = await supabase
        .from("verification_requests")
        .select("status")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRequest?.status === "pending") {
        setVerificationStatus("pending");
      } else if (latestRequest?.status === "invalidated") {
        setVerificationStatus("rejected");
      } else {
        setVerificationStatus("idle");
      }

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

    if (verificationStatus === "pending") {
      toast.error("You already have a verification request under review");
      return;
    }

    if (!hkidNumber || !hkidFile || !paymentFile) {
      toast.error("Please fill all fields and upload both files");
      return;
    }

    if (!isPermanentResident) {
      const nonPrError = validateNonPrVerification(nonPrForm, visaFile);
      if (nonPrError) {
        toast.error(nonPrError);
        return;
      }
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data: pendingRequest } = await supabase
        .from("verification_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingRequest) {
        toast.error("You already have a verification request under review");
        setVerificationStatus("pending");
        setSubmitting(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.verification_status === "verified") {
        toast.error("Your account is already verified");
        setIsVerified(true);
        setSubmitting(false);
        return;
      }

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

      let visaPath: string | null = null;
      if (!isPermanentResident && visaFile) {
        visaPath = `${user.id}/visa_${Date.now()}`;
        const { error: visaError } = await supabase.storage
          .from("verifications")
          .upload(visaPath, visaFile);
        if (visaError) throw visaError;
      }

      const verificationPayload: Record<string, string | null> = {
        user_id: user.id,
        hkid_number: hkidNumber,
        hkid_image_path: hkidPath,
        payment_proof_path: paymentPath,
        status: "pending",
        years_in_hk: null,
        years_in_hk_other: null,
        visa_type: null,
        visa_type_other: null,
        visa_document_path: null,
        referral_name: null,
        referral_phone: null,
        referral_email: null,
        referral_hkid: null,
      };

      if (!isPermanentResident) {
        Object.assign(verificationPayload, {
          years_in_hk: nonPrForm.yearsInHk,
          years_in_hk_other:
            nonPrForm.yearsInHk === "Other"
              ? nonPrForm.yearsInHkOther.trim()
              : null,
          visa_type: nonPrForm.visaType,
          visa_type_other:
            nonPrForm.visaType === "Other"
              ? nonPrForm.visaTypeOther.trim()
              : null,
          visa_document_path: visaPath,
          referral_name: nonPrForm.referralName.trim(),
          referral_phone: nonPrForm.referralPhone.trim(),
          referral_email: nonPrForm.referralEmail.trim(),
          referral_hkid: nonPrForm.referralHkid.trim(),
        });
      }

      const { error: insertError } = await supabase
        .from("verification_requests")
        .insert(verificationPayload);

      if (insertError) {
        if (insertError.code === "23505") {
          toast.error("You already have a verification request under review");
          setVerificationStatus("pending");
          setSubmitting(false);
          return;
        }
        throw insertError;
      }

      const fullName = user.user_metadata?.full_name || userName;

      if (user.email) {
        const pendingEmail = await sendVerificationPendingEmail({
          email: user.email,
          fullName,
        });

        if (!pendingEmail.ok) {
          toast.warning(
            pendingEmail.message ||
              "Submitted, but we could not send your confirmation email."
          );
        }
      }

      const { data: profileForAdmin } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();

      const adminEmail = await notifyAdminsVerificationSubmitted({
        fullName,
        email: user.email || "",
        phone: profileForAdmin?.phone || "",
        hkidNumber,
        isPermanentResident,
        yearsInHk: isPermanentResident ? undefined : nonPrForm.yearsInHk,
        yearsInHkOther:
          !isPermanentResident && nonPrForm.yearsInHk === "Other"
            ? nonPrForm.yearsInHkOther.trim()
            : undefined,
        visaType: isPermanentResident ? undefined : nonPrForm.visaType,
        visaTypeOther:
          !isPermanentResident && nonPrForm.visaType === "Other"
            ? nonPrForm.visaTypeOther.trim()
            : undefined,
        referralName: isPermanentResident
          ? undefined
          : nonPrForm.referralName.trim(),
        referralPhone: isPermanentResident
          ? undefined
          : nonPrForm.referralPhone.trim(),
        referralEmail: isPermanentResident
          ? undefined
          : nonPrForm.referralEmail.trim(),
        referralHkid: isPermanentResident
          ? undefined
          : nonPrForm.referralHkid.trim(),
      });

      if (!adminEmail.ok) {
        console.error("Admin verification notification failed:", adminEmail.message);
      }

      toast.success("Verification submitted successfully!");
      setVerificationStatus("pending");
      setHkidFile(null);
      setPaymentFile(null);
      setVisaFile(null);
      setNonPrForm(emptyNonPrVerificationForm());
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
        status={verificationStatus}
        submitting={submitting}
        isPermanentResident={isPermanentResident}
        hkidNumber={hkidNumber}
        onHkidNumberChange={setHkidNumber}
        onHkidFileChange={setHkidFile}
        onPaymentFileChange={setPaymentFile}
        nonPrForm={nonPrForm}
        onNonPrFormChange={(updates) =>
          setNonPrForm((current) => ({ ...current, ...updates }))
        }
        onVisaFileChange={setVisaFile}
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