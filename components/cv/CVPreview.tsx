"use client";

import { User } from "lucide-react";
import { CVField, CVSectionCard } from "@/components/cv/CVSectionCard";
import {
  formatMultiSelectWithOther,
  formatSelectionWithOther,
} from "@/lib/cv-other";

type CVPreviewProps = {
  data: Record<string, string>;
  shortId?: string;
  photoUrl?: string;
};

export function CVPreview({ data, shortId, photoUrl }: CVPreviewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fk-gold/30 bg-fk-cream/30 p-4 text-sm text-muted-foreground">
        Review your CV below. If everything looks correct, confirm submission.
        You can go back to edit any section before submitting.
      </div>

      {shortId && (
        <div className="text-center">
          <span className="fk-eyebrow text-[10px]">Preview Short ID</span>
          <p className="font-title text-3xl tracking-[0.2em] text-fk-plum-light">
            {shortId}
          </p>
        </div>
      )}

      {photoUrl ? (
        <div className="flex justify-center">
          <img
            src={photoUrl}
            alt="Profile preview"
            className="size-40 rounded-2xl object-cover shadow-sm"
          />
        </div>
      ) : (
        <div className="mx-auto flex size-40 items-center justify-center rounded-2xl bg-fk-bg-top">
          <User className="size-14 text-fk-mauve/30" strokeWidth={1} />
        </div>
      )}

      <CVSectionCard title="Basic Information" index={0}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CVField label="Full Name" value={data.fullName} />
          <CVField label="Gender" value={data.gender} />
          <CVField label="HKID Number" value={data.hkidNumber} />
          <CVField label="Occupation" value={data.occupation} />
          <CVField label="Education" value={data.education} />
          <CVField
            label="Ethnic Background"
            value={formatSelectionWithOther(
              data.ethnicBackground,
              data.ethnicBackgroundOther
            )}
          />
        </div>
      </CVSectionCard>

      <CVSectionCard title="Personality & Individualism" index={1}>
        <CVField label="Sense of Humor" value={data.senseOfHumor} />
        <CVField label="What motivates you" value={data.motivation} />
        <CVField
          label="What you would change about yourself"
          value={data.changeAboutSelf}
        />
        <CVField
          label="Types of people you get along with"
          value={data.peopleGetAlongWith}
        />
      </CVSectionCard>

      <CVSectionCard title="Partner Preferences" index={2}>
        <CVField label="Qualities in a partner" value={data.partnerQualities} />
        <CVField
          label="Vision of a successful marriage"
          value={data.marriageVision}
        />
        <CVField label="What you're seeking" value={data.whatSeeking} />
        <CVField label="Partner's Age Range" value={data.partnerAgeRange} />
        <CVField label="Partner's Education" value={data.partnerEducation} />
        <CVField
          label="Partner's Ethnic Background"
          value={formatMultiSelectWithOther(
            data.partnerEthnicBackground,
            data.partnerEthnicBackgroundOther
          )}
        />
      </CVSectionCard>

      <CVSectionCard title="Family + Lifestyle & Goals" index={3}>
        <CVField label="Role of family" value={data.familyRole} />
        <CVField label="Hobbies" value={data.hobbies} />
        <CVField label="Long-term goals" value={data.longTermGoals} />
        <CVField
          label="Ideal lifestyle as a couple"
          value={data.idealCoupleLifestyle}
        />
      </CVSectionCard>

      <CVSectionCard title="Work / Finances" index={4}>
        <CVField label="Definition of wealth" value={data.wealthDefinition} />
        <CVField label="How you spend money" value={data.howSpendMoney} />
        <CVField label="How you save money" value={data.howSaveMoney} />
        <CVField label="Dream job" value={data.dreamJob} />
        <CVField
          label="House finances management"
          value={data.houseFinancesManagement}
        />
      </CVSectionCard>

      <CVSectionCard title="Values, Religion & Faith" index={5}>
        <CVField label="Important values" value={data.importantValues} />
        <CVField label="Faith in daily life" value={data.faithInDailyLife} />
        <CVField
          label="Practicing faith with spouse"
          value={data.faithWithSpouse}
        />
      </CVSectionCard>

      <CVSectionCard title="Communication & Conflict Resolution" index={6}>
        <CVField label="Approach to conflict" value={data.conflictResolution} />
        <CVField
          label="Handling disagreements"
          value={data.handleDisagreements}
        />
      </CVSectionCard>

      <CVSectionCard title="Detailed Information" index={7}>
        <CVField label="Self Description" value={data.selfDescription} />
        <CVField label="Religious History" value={data.religiousHistory} />
        <CVField label="Do you pray?" value={data.prayLevel} />
        <CVField
          label="Sect / Madhab"
          value={formatSelectionWithOther(data.sect, data.sectOther)}
        />
      </CVSectionCard>

      <CVSectionCard title="Guarantor / Wali" index={8}>
        <CVField label="Wali involvement" value={data.waliInvolvement} />
        <CVField label="Wali's Name" value={data.waliName} />
        <CVField
          label="Relationship"
          value={formatSelectionWithOther(
            data.waliRelationship,
            data.waliRelationshipOther
          )}
        />
        <CVField label="Wali's Phone" value={data.waliPhone} />
        <CVField label="Wali's Email" value={data.waliEmail} />
      </CVSectionCard>
    </div>
  );
}