"use client";

import { User } from "lucide-react";
import { CVField } from "@/components/cv/CVSectionCard";
import { BrowseProfileSections } from "@/components/cv/BrowseProfileSections";
import { redactCvDataForBrowse } from "@/lib/cv-browse";

type CVPreviewProps = {
  data: Record<string, string>;
  shortId?: string;
  photoUrl?: string;
  intro?: string | null;
};

const DEFAULT_INTRO =
  "This preview shows what verified members will see when browsing your profile. Your HKID is always private. Wali/guarantor contact details only appear here if you chose to display them on your public profile.";

export function CVPreview({
  data,
  shortId,
  photoUrl,
  intro = DEFAULT_INTRO,
}: CVPreviewProps) {
  const browseData = redactCvDataForBrowse(data, {
    showWali: data.showWaliOnProfile === "yes",
  });

  return (
    <div className="space-y-6">
      {intro ? (
        <div className="rounded-2xl border border-fk-gold/30 bg-fk-cream/30 p-4 text-sm text-muted-foreground">
          {intro}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex justify-center lg:col-span-1">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Profile preview"
              className="aspect-square w-full max-w-xs rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-2xl bg-fk-bg-top">
              <User className="size-14 text-fk-mauve/30" strokeWidth={1} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-fk-gold/20 bg-white/70 p-6 lg:col-span-2">
          {shortId && (
            <div className="mb-6 text-center">
              <span className="fk-eyebrow text-[10px]">Short ID</span>
              <p className="font-title text-4xl tracking-[0.2em] text-fk-plum-light">
                {shortId}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <CVField label="Gender" value={browseData.gender} />
            <CVField label="Occupation" value={browseData.occupation} />
            <CVField label="Education" value={browseData.education} />
          </div>
        </div>
      </div>

      <BrowseProfileSections data={data} />
    </div>
  );
}