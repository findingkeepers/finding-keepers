"use client";

import { CVField, CVSectionCard } from "@/components/cv/CVSectionCard";
import { redactCvDataForBrowse } from "@/lib/cv-browse";
import {
  formatMultiSelectWithOther,
  formatSelectionWithOther,
} from "@/lib/cv-other";
import { shouldShowWaliOnBrowseProfile } from "@/lib/cv-privacy";

type BrowseProfileSectionsProps = {
  data: Record<string, string>;
};

export function BrowseProfileSections({ data }: BrowseProfileSectionsProps) {
  const browseData = redactCvDataForBrowse(data, {
    showWali: shouldShowWaliOnBrowseProfile(data),
  });

  return (
    <div className="space-y-6">
      <CVSectionCard title="Detailed Information" index={0}>
        <CVField label="Self Description" value={browseData.selfDescription} />
        <CVField
          label="Ethnic Background"
          value={formatSelectionWithOther(
            browseData.ethnicBackground,
            browseData.ethnicBackgroundOther
          )}
        />
        <CVField
          label="Residency Status"
          value={formatSelectionWithOther(
            browseData.residencyStatus,
            browseData.residencyStatusOther
          )}
        />
        <CVField label="Occupation" value={browseData.occupation} />
        <CVField label="Education" value={browseData.education} />
        <CVField label="Marital Status" value={browseData.maritalStatus} />
        <CVField label="Religious History" value={browseData.religiousHistory} />
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
        <CVField
          label="What types of people do you get along with"
          value={browseData.peopleGetAlongWith}
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
        <CVField
          label="Importance of sharing similar interests with your spouse"
          value={browseData.sharedInterestsImportance}
        />
        <CVField
          label="How a strong partnership contributes to personal growth"
          value={browseData.partnershipGrowth}
        />
        <CVField label="Deal breakers" value={browseData.dealBreakers} />
        <CVField label="What you're seeking" value={browseData.whatSeeking} />
        <CVField label="Partner's Age Range" value={browseData.partnerAgeRange} />
        <CVField
          label="Partner's Education"
          value={browseData.partnerEducation}
        />
        <CVField
          label="Partner's Ethnic Background"
          value={formatMultiSelectWithOther(
            browseData.partnerEthnicBackground,
            browseData.partnerEthnicBackgroundOther
          )}
        />
      </CVSectionCard>

      <CVSectionCard title="Family + Lifestyle & Goals" index={3}>
        <CVField label="Role of family" value={browseData.familyRole} />
        <CVField
          label="Closest family member and why"
          value={browseData.closestFamilyMember}
        />
        <CVField label="Hobbies" value={browseData.hobbies} />
        <CVField
          label="Favorite books or movies that influenced you"
          value={browseData.favoriteBooksMovies}
        />
        <CVField
          label="How often you hang out with friends"
          value={browseData.hangoutWithFriends}
        />
        <CVField
          label="Favorite way to relax or unwind"
          value={browseData.relaxMethod}
        />
        <CVField label="Long-term goals" value={browseData.longTermGoals} />
        <CVField
          label="Ideal lifestyle as a couple"
          value={browseData.idealCoupleLifestyle}
        />
        <CVField
          label="How you seek to improve yourself over time"
          value={browseData.selfImprovement}
        />
        <CVField
          label="Work and personal life balance"
          value={browseData.workLifeBalance}
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
          label="How beliefs shape daily activities and decisions"
          value={browseData.beliefsShapeLife}
        />
        <CVField
          label="Faith in daily life"
          value={browseData.faithInDailyLife}
        />
        <CVField
          label="Role of prayer and community"
          value={browseData.prayerCommunityRole}
        />
        <CVField
          label="Practicing faith with spouse"
          value={browseData.faithWithSpouse}
        />
        <CVField
          label="Raising children in accordance with Islamic values"
          value={browseData.raisingChildrenIslamic}
        />
      </CVSectionCard>

      <CVSectionCard title="Communication & Conflict Resolution" index={6}>
        <CVField
          label="Approach to conflict"
          value={browseData.conflictResolution}
        />
        <CVField
          label="Handling stress or difficult situations"
          value={browseData.handleStress}
        />
        <CVField
          label="Handling disagreements"
          value={browseData.handleDisagreements}
        />
        <CVField
          label="Role of communication in resolving issues"
          value={browseData.communicationRole}
        />
      </CVSectionCard>

      <CVSectionCard title="Guarantor / Wali" index={7}>
        <CVField
          label="Involvement of Parents/Wali"
          value={browseData.waliInvolvement}
        />
        <CVField
          label="Situation if not involving parents/wali"
          value={browseData.waliReason}
        />
        <CVField
          label="Wali's Relationship"
          value={formatSelectionWithOther(
            browseData.waliRelationship,
            browseData.waliRelationshipOther
          )}
        />
        <CVField label="Wali's Name" value={browseData.waliName} />
        <CVField label="Wali's Phone" value={browseData.waliPhone} />
        <CVField label="Wali's Email" value={browseData.waliEmail} />
      </CVSectionCard>
    </div>
  );
}