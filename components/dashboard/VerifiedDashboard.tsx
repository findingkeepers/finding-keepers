"use client";

import { FileText, Heart, PenLine, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "./DashboardHeader";
import { ActionCard } from "./ActionCard";

type VerifiedDashboardProps = {

  hasCompletedCV: boolean;
  onDeleteCV: () => void;
  onMenuClick: () => void;
};

export function VerifiedDashboard({

  hasCompletedCV,
  onDeleteCV,
  onMenuClick,
}: VerifiedDashboardProps) {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-6xl px-0 sm:px-2">
      <DashboardHeader
        isVerified={true}
        subtitle={
          hasCompletedCV
            ? "Your profile is complete. Browse matches or manage your CV."
            : "Create your marriage profile to start browsing."
        }
        onMenuClick={onMenuClick}
      />

      <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {hasCompletedCV ? (
          <>
            <ActionCard
              index={0}
              title="My CV"
              description="View your submitted marriage profile."
              icon={FileText}
              actionLabel="View My CV"
              onAction={() => router.push("/dashboard/my-cv")}
            />

            <ActionCard
              index={1}
              title="Edit CV"
              description="Update your profile details and preferences."
              icon={PenLine}
              actionLabel="Edit CV"
              onAction={() => router.push("/dashboard/cv-builder")}
            />

            <ActionCard
              index={2}
              title="Delete CV"
              description="Permanently remove your profile from the platform."
              icon={Trash2}
              actionLabel="Delete CV"
              buttonVariant="destructive"
              onAction={onDeleteCV}
            />
          </>
        ) : (
          <ActionCard
            index={0}
            title="CV Builder"
            description="Create your marriage profile to get started."
            icon={FileText}
            actionLabel="Go to CV Builder"
            onAction={() => router.push("/dashboard/cv-builder")}
          />
        )}

        <ActionCard
          index={hasCompletedCV ? 3 : 1}
          title="Browse Profiles"
          description="View profiles of verified members."
          icon={Search}
          actionLabel="Browse CVs"
          onAction={() => router.push("/browse")}
          disabled={!hasCompletedCV}
          disabledMessage="Please complete your CV first to browse other profiles."
        />

        <ActionCard
          index={hasCompletedCV ? 4 : 2}
          title="Match Requests"
          description="Track your match requests and responses."
          icon={Heart}
          actionLabel="View Requests"
          onAction={() => router.push("/dashboard/my-match-requests")}
          disabled={!hasCompletedCV}
          disabledMessage="Complete your CV to request matches."
        />
      </div>
    </div>
  );
}