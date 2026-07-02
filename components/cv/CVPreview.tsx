"use client";

import { User } from "lucide-react";
import { CVField, CVSectionCard } from "@/components/cv/CVSectionCard";
import { formatSelectionWithOther } from "@/lib/cv-other";
import { redactCvDataForBrowse } from "@/lib/cv-browse";
import { hasWaliDetails, shouldShowWaliOnBrowseProfile } from "@/lib/cv-privacy";

type CVPreviewProps = {
  data: Record<string, string>;
  shortId?: string;
  photoUrl?: string;
};

export function CVPreview({ data, shortId, photoUrl }: CVPreviewProps) {
  const browseData = redactCvDataForBrowse(data, {
    showWali: shouldShowWaliOnBrowseProfile(data),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fk-gold/30 bg-fk-cream/30 p-4 text-sm text-muted-foreground">
        This preview shows what verified members will see when browsing your
        profile. Private details such as your HKID and full guarantor
        information are hidden unless you chose to display wali details on
        browse.
      </div>

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

      <CVSectionCard title="Detailed Information" index={0}>
        <CVField
          label="Self Description"
          value={browseData.selfDescription}
        />
        <CVField
          label="Religious History"
          value={browseData.religiousHistory}
        />
        <CVField label="Do you pray?" value={browseData.prayLevel} />
        <CVField
          label="Sect / Madhab"
          value={formatSelectionWithOther(browseData.sect, browseData.sectOther)}
        />
      </CVSectionCard>

      <CVSectionCard title="Personality & Individualism" index={1}>
        <CVField label="Sense of Humor" value={browseData.senseOfHumor} />
        <CVField label="What motivates you" value={browseData.motivation} />
        <CVField
          label="What you would change about yourself"
          value={browseData.changeAboutSelf}
        />
      </CVSectionCard>

      <CVSectionCard title="Partner Preferences" index={2}>
        <CVField
          label="Qualities in a partner"
          value={browseData.partnerQualities}
        />
        <CVField
          label="Vision of a successful marriage"
          value={browseData.marriageVision}
        />
        <CVField label="What you're seeking" value={browseData.whatSeeking} />
        <CVField
          label="Partner's Age Range"
          value={browseData.partnerAgeRange}
        />
        <CVField
          label="Partner's Education"
          value={browseData.partnerEducation}
        />
      </CVSectionCard>

      <CVSectionCard title="Family + Lifestyle & Goals" index={3}>
        <CVField label="Role of family" value={browseData.familyRole} />
        <CVField label="Hobbies" value={browseData.hobbies} />
        <CVField label="Long-term goals" value={browseData.longTermGoals} />
        <CVField
          label="Ideal lifestyle as a couple"
          value={browseData.idealCoupleLifestyle}
        />
      </CVSectionCard>

      <CVSectionCard title="Work / Finances" index={4}>
        <CVField
          label="Definition of wealth"
          value={browseData.wealthDefinition}
        />
        <CVField
          label="How you spend money"
          value={browseData.howSpendMoney}
        />
        <CVField label="How you save money" value={browseData.howSaveMoney} />
        <CVField label="Dream job" value={browseData.dreamJob} />
        <CVField
          label="House finances management"
          value={browseData.houseFinancesManagement}
        />
      </CVSectionCard>

      <CVSectionCard title="Values, Religion & Faith" index={5}>
        <CVField label="Important values" value={browseData.importantValues} />
        <CVField
          label="Faith in daily life"
          value={browseData.faithInDailyLife}
        />
        <CVField
          label="Practicing faith with spouse"
          value={browseData.faithWithSpouse}
        />
      </CVSectionCard>

      <CVSectionCard title="Communication & Conflict Resolution" index={6}>
        <CVField
          label="Approach to conflict"
          value={browseData.conflictResolution}
        />
        <CVField
          label="Handling disagreements"
          value={browseData.handleDisagreements}
        />
      </CVSectionCard>

      {shouldShowWaliOnBrowseProfile(data) && hasWaliDetails(browseData) && (
        <CVSectionCard title="Guarantor / Wali" index={7}>
          <CVField label="Wali's Name" value={browseData.waliName} />
          <CVField
            label="Relationship"
            value={formatSelectionWithOther(
              browseData.waliRelationship,
              browseData.waliRelationshipOther
            )}
          />
          <CVField label="Wali's Phone" value={browseData.waliPhone} />
          <CVField label="Wali's Email" value={browseData.waliEmail} />
        </CVSectionCard>
      )}
    </div>
  );
}