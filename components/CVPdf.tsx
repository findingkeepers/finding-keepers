import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import {
  formatMultiSelectWithOther,
  formatSelectionWithOther,
} from '@/lib/cv-other';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    lineHeight: 1.4,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  shortID: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 13,
    marginTop: 14,
    marginBottom: 6,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 5,
  },
  value: {
    marginBottom: 6,
  },
  photo: {
    width: 120,
    height: 120,
    marginBottom: 15,
    alignSelf: 'center',
    borderRadius: 8,
  },
});

interface CVPdfProps {
  data: any;
}

export const CVPdf = ({ data }: CVPdfProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Finding Keepers - CV</Text>
      <Text style={styles.shortID}>Short ID: {data.shortID}</Text>

      {/* Show photo only if uploaded */}
      {data.photoUrl && (
        <Image 
          src={data.photoUrl} 
          style={styles.photo} 
        />
      )}

      {/* Step 1 */}
      <Text style={styles.sectionTitle}>Personal Particulars & Physical Attributes</Text>
      <Text style={styles.label}>Full Name:</Text>
      <Text style={styles.value}>{data.fullName}</Text>

      <Text style={styles.label}>Gender:</Text>
      <Text style={styles.value}>{data.gender}</Text>

      <Text style={styles.label}>HKID Number:</Text>
      <Text style={styles.value}>{data.hkidNumber}</Text>

      <Text style={styles.label}>Height:</Text>
      <Text style={styles.value}>{data.height}</Text>

      <Text style={styles.label}>Weight:</Text>
      <Text style={styles.value}>{data.weight}</Text>

      {/* Step 2 */}
      <Text style={styles.sectionTitle}>Personality & Individualism</Text>
      <Text style={styles.label}>Sense of Humor:</Text>
      <Text style={styles.value}>{data.senseOfHumor}</Text>

      <Text style={styles.label}>What motivates you:</Text>
      <Text style={styles.value}>{data.motivation}</Text>

      <Text style={styles.label}>What would you change about yourself:</Text>
      <Text style={styles.value}>{data.changeAboutSelf}</Text>

      <Text style={styles.label}>Types of people you get along with:</Text>
      <Text style={styles.value}>{data.peopleGetAlongWith}</Text>

      {/* Step 3 */}
      <Text style={styles.sectionTitle}>Marriage & Partner Preferences</Text>
      <Text style={styles.label}>Qualities in a partner:</Text>
      <Text style={styles.value}>{data.partnerQualities}</Text>

      <Text style={styles.label}>Vision of successful marriage:</Text>
      <Text style={styles.value}>{data.marriageVision}</Text>

      <Text style={styles.label}>Importance of shared interests:</Text>
      <Text style={styles.value}>{data.sharedInterestsImportance}</Text>

      <Text style={styles.label}>Partnership contribution to growth:</Text>
      <Text style={styles.value}>{data.partnershipGrowth}</Text>

      <Text style={styles.label}>Deal breakers:</Text>
      <Text style={styles.value}>{data.dealBreakers}</Text>

      <Text style={styles.label}>What you are seeking:</Text>
      <Text style={styles.value}>{data.whatSeeking}</Text>

      <Text style={styles.label}>Partner’s Age Range:</Text>
      <Text style={styles.value}>{data.partnerAgeRange}</Text>

      <Text style={styles.label}>Partner’s Education:</Text>
      <Text style={styles.value}>{data.partnerEducation}</Text>

      <Text style={styles.label}>Partner’s Ethnic Background:</Text>
      <Text style={styles.value}>
        {formatMultiSelectWithOther(
          data.partnerEthnicBackground,
          data.partnerEthnicBackgroundOther
        )}
      </Text>

      {/* Step 4 */}
      <Text style={styles.sectionTitle}>Family + Lifestyle & Goals</Text>
      <Text style={styles.label}>Role of family:</Text>
      <Text style={styles.value}>{data.familyRole}</Text>

      <Text style={styles.label}>Closest family member:</Text>
      <Text style={styles.value}>{data.closestFamilyMember}</Text>

      <Text style={styles.label}>Hobbies:</Text>
      <Text style={styles.value}>{data.hobbies}</Text>

      <Text style={styles.label}>Favorite books/movies:</Text>
      <Text style={styles.value}>{data.favoriteBooksMovies}</Text>

      <Text style={styles.label}>How often hang out with friends:</Text>
      <Text style={styles.value}>{data.hangoutWithFriends}</Text>

      <Text style={styles.label}>Favorite way to relax:</Text>
      <Text style={styles.value}>{data.relaxMethod}</Text>

      <Text style={styles.label}>Long-term goals:</Text>
      <Text style={styles.value}>{data.longTermGoals}</Text>

      <Text style={styles.label}>Ideal lifestyle as a couple:</Text>
      <Text style={styles.value}>{data.idealCoupleLifestyle}</Text>

      <Text style={styles.label}>Self improvement:</Text>
      <Text style={styles.value}>{data.selfImprovement}</Text>

      <Text style={styles.label}>Work-life balance:</Text>
      <Text style={styles.value}>{data.workLifeBalance}</Text>

      {/* Step 5 */}
      <Text style={styles.sectionTitle}>Values, Religion & Faith</Text>
      <Text style={styles.label}>Important values:</Text>
      <Text style={styles.value}>{data.importantValues}</Text>

      <Text style={styles.label}>How beliefs shape daily life:</Text>
      <Text style={styles.value}>{data.beliefsShapeLife}</Text>

      <Text style={styles.label}>Faith in daily life:</Text>
      <Text style={styles.value}>{data.faithInDailyLife}</Text>

      <Text style={styles.label}>Role of prayer and community:</Text>
      <Text style={styles.value}>{data.prayerCommunityRole}</Text>

      <Text style={styles.label}>Practicing faith with spouse:</Text>
      <Text style={styles.value}>{data.faithWithSpouse}</Text>

      <Text style={styles.label}>Raising children in Islamic values:</Text>
      <Text style={styles.value}>{data.raisingChildrenIslamic}</Text>

      {/* Step 6 */}
      <Text style={styles.sectionTitle}>Communication & Conflict Resolution</Text>
      <Text style={styles.label}>Approach to conflict resolution:</Text>
      <Text style={styles.value}>{data.conflictResolution}</Text>

      <Text style={styles.label}>Handling stress:</Text>
      <Text style={styles.value}>{data.handleStress}</Text>

      <Text style={styles.label}>Handling disagreements:</Text>
      <Text style={styles.value}>{data.handleDisagreements}</Text>

      <Text style={styles.label}>Role of communication:</Text>
      <Text style={styles.value}>{data.communicationRole}</Text>

      {/* Step 7 */}
      <Text style={styles.sectionTitle}>Detailed Information</Text>
      <Text style={styles.label}>Self Description:</Text>
      <Text style={styles.value}>{data.selfDescription}</Text>

      <Text style={styles.label}>Residency Status:</Text>
      <Text style={styles.value}>
        {formatSelectionWithOther(data.residencyStatus, data.residencyStatusOther)}
      </Text>

      <Text style={styles.label}>Ethnic Background:</Text>
      <Text style={styles.value}>
        {formatSelectionWithOther(data.ethnicBackground, data.ethnicBackgroundOther)}
      </Text>

      <Text style={styles.label}>Occupation:</Text>
      <Text style={styles.value}>{data.occupation}</Text>

      <Text style={styles.label}>Education:</Text>
      <Text style={styles.value}>{data.education}</Text>

      <Text style={styles.label}>Marital Status:</Text>
      <Text style={styles.value}>{data.maritalStatus}</Text>

      <Text style={styles.label}>Religious History:</Text>
      <Text style={styles.value}>{data.religiousHistory}</Text>

      <Text style={styles.label}>Do you pray?:</Text>
      <Text style={styles.value}>{data.prayLevel}</Text>

      <Text style={styles.label}>Sect / Madhab:</Text>
      <Text style={styles.value}>
        {formatSelectionWithOther(data.sect, data.sectOther)}
      </Text>

      <Text style={{ marginTop: 30, fontSize: 9, color: '#666' }}>
        Generated by Finding Keepers CV Builder
      </Text>
    </Page>
  </Document>
);