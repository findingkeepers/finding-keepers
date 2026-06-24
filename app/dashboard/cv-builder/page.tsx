'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { CVProgressBar } from '@/components/cv/CVProgressBar';
import { useDashboardMenu } from '@/components/dashboard/DashboardLayoutProvider';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { CVPdf } from '@/components/CVPdf';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const generateShortID = (gender: string) => {
  const prefix = gender?.toLowerCase() === 'male' ? 'M' : 'F';
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}${randomNum}`;
};

export default function CVBuilder() {
  const router = useRouter();
  const { onMenuClick } = useDashboardMenu();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const [errors, setErrors] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [existingCVId, setExistingCVId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '', gender: '', hkidNumber: '', height: '', weight: '', photoUrl: '',
    senseOfHumor: '', motivation: '', changeAboutSelf: '', peopleGetAlongWith: '',
    partnerQualities: '', marriageVision: '', sharedInterestsImportance: '', 
    partnershipGrowth: '', dealBreakers: '', whatSeeking: '',
    partnerAgeRange: '', partnerEducation: '', partnerEthnicBackground: '',
    partnerSect: '', partnerReligiousHistory: '', partnerReligiosity: '',
    familyRole: '', closestFamilyMember: '', hobbies: '', favoriteBooksMovies: '',
    hangoutWithFriends: '', relaxMethod: '', longTermGoals: '', idealCoupleLifestyle: '',
    selfImprovement: '', workLifeBalance: '',
    importantValues: '', beliefsShapeLife: '', faithInDailyLife: '', 
    prayerCommunityRole: '', faithWithSpouse: '', raisingChildrenIslamic: '',
    conflictResolution: '', handleStress: '', handleDisagreements: '', communicationRole: '',
    selfDescription: '', residencyStatus: '', occupation: '', education: '',
    maritalStatus: '', religiousHistory: '', prayLevel: '', sect: '',
    waliInvolvement: '', waliReason: '', waliRelationship: '', waliName: '',
    waliHKID: '', waliPhone: '', waliEmail: '', waliAddress: '',
    shortID: '',
  });

  const [photo, setPhoto] = useState<File | null>(null);

  // Load existing CV if editing
  useEffect(() => {
    const loadExistingCV = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingCV } = await supabase
        .from('cvs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingCV) {
        setIsEditing(true);
        setExistingCVId(existingCV.id);

        if (existingCV.data) {
          setFormData(prev => ({
            ...prev,
            ...existingCV.data,
            shortID: existingCV.short_id || '',
            photoUrl: existingCV.photo_url || '',
          }));
        }
      }
    };

    loadExistingCV();
  }, []);

  // Auto-save (only for new CVs)
  useEffect(() => {
    if (!isEditing) {
      const saved = localStorage.getItem('cv_form_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    }
  }, [isEditing]);

  useEffect(() => {
    localStorage.setItem('cv_form_data', JSON.stringify(formData));
  }, [formData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.length > 0) setErrors([]);
  };

  const handleMultiSelect = (field: string, value: string) => {
    const current = formData[field as keyof typeof formData] as string || '';
    const values = current ? current.split(', ') : [];
    if (values.includes(value)) {
      const newValues = values.filter(v => v !== value);
      handleChange(field, newValues.join(', '));
    } else {
      handleChange(field, [...values, value].join(', '));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      const { error } = await supabase.storage.from('profile-photos').upload(filePath, file);
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
      handleChange('photoUrl', publicUrlData.publicUrl);
      toast.success("Photo uploaded successfully!");
    } catch (error: any) {
      toast.error("Failed to upload photo");
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const validateForm = () => {
    const errorsList: string[] = [];

    if (!formData.fullName.trim()) errorsList.push("Full Name is required");
    if (!formData.gender) errorsList.push("Please select your Gender");
    if (!formData.hkidNumber.trim()) errorsList.push("HKID Number is required");
    if (!formData.senseOfHumor.trim()) errorsList.push("Sense of humor is required");
    if (!formData.motivation.trim()) errorsList.push("What motivates you is required");
    if (!formData.changeAboutSelf.trim()) errorsList.push("What you would change about yourself is required");
    if (!formData.peopleGetAlongWith.trim()) errorsList.push("Types of people you get along with is required");
    if (!formData.partnerQualities.trim()) errorsList.push("Qualities you value in a partner is required");
    if (!formData.marriageVision.trim()) errorsList.push("Your vision of a successful marriage is required");
    if (!formData.whatSeeking.trim() || formData.whatSeeking.length < 100) {
      errorsList.push("What you are seeking must be at least 100 characters");
    }
    if (!formData.selfDescription.trim() || formData.selfDescription.length < 100) {
      errorsList.push("Self description must be at least 100 characters");
    }
    if (!formData.residencyStatus) errorsList.push("Residency Status is required");
    if (!formData.occupation.trim()) errorsList.push("Occupation is required");
    if (!formData.education) errorsList.push("Education level is required");
    if (!formData.maritalStatus) errorsList.push("Marital Status is required");
    if (!formData.religiousHistory) errorsList.push("Religious History is required");
    if (!formData.prayLevel) errorsList.push("Please select how often you pray");
    if (!formData.sect) errorsList.push("Please select your Sect/Madhab");
    if (!formData.waliInvolvement) errorsList.push("Wali involvement selection is required");

    return errorsList;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (validationErrors.length > 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      let shortID = formData.shortID;
      if (!shortID) {
        shortID = generateShortID(formData.gender);
        setFormData(prev => ({ ...prev, shortID }));
      }

      if (isEditing && existingCVId) {
        const { error } = await supabase.from('cvs').update({
          short_id: shortID,
          data: formData,
          photo_url: formData.photoUrl || null,
        }).eq('id', existingCVId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cvs').insert({
          user_id: user.id,
          short_id: shortID,
          data: formData,
          photo_url: formData.photoUrl || null,
        });
        if (error) throw error;
      }

      // Generate and download PDF
      const blob = await pdf(<CVPdf data={{ ...formData, shortID }} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV_${shortID}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(isEditing ? "CV Updated Successfully!" : "CV Submitted Successfully!");

      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);

    } catch (error: any) {
      toast.error(error.message || "Failed to save CV");
    }
  };

  // ==================== RENDER STEPS ====================

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-medium text-fk-plum">Step 1: Personal Particulars & Physical Attributes</h2>
      <div><Label>Full Name</Label><Input value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} /></div>
      <div><Label>Gender</Label><div className="flex gap-6 mt-2">
        <label><input type="radio" name="gender" value="Male" checked={formData.gender === 'Male'} onChange={(e) => handleChange('gender', e.target.value)} /> Male</label>
        <label><input type="radio" name="gender" value="Female" checked={formData.gender === 'Female'} onChange={(e) => handleChange('gender', e.target.value)} /> Female</label>
      </div></div>
      <div><Label>HKID Number</Label><Input value={formData.hkidNumber} onChange={(e) => handleChange('hkidNumber', e.target.value)} /></div>
      <div><Label>Profile Photo (Optional)</Label><Input type="file" accept="image/*" onChange={handlePhotoUpload} /></div>
      {formData.photoUrl && <p className="text-sm text-green-600">✓ Photo uploaded successfully</p>}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-medium text-fk-plum">Step 2: Detailed Information</h2>
      <div><Label>Short description of yourself (Minimum 100 words)</Label><Textarea value={formData.selfDescription} onChange={(e) => handleChange('selfDescription', e.target.value)} rows={5} /></div>
      <div><Label>Residency Status</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {["Permanent Resident", "Student", "Work Visa", "Other"].map(opt => (
          <label key={opt} className="flex items-center gap-2"><input type="radio" name="residencyStatus" value={opt} checked={formData.residencyStatus === opt} onChange={(e) => handleChange('residencyStatus', e.target.value)} /> {opt}</label>
        ))}
      </div></div>
      <div><Label>Your Occupation</Label><Input value={formData.occupation} onChange={(e) => handleChange('occupation', e.target.value)} /></div>
      <div><Label>Your Education</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {["Secondary School", "Diploma/ Associate Degree", "Under-graduate", "Graduate/Post-graduate"].map(opt => (
          <label key={opt} className="flex items-center gap-2"><input type="radio" name="education" value={opt} checked={formData.education === opt} onChange={(e) => handleChange('education', e.target.value)} /> {opt}</label>
        ))}
      </div></div>
      <div><Label>Marital Status</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {["Never Married", "Divorced", "Widowed"].map(opt => (
          <label key={opt} className="flex items-center gap-2"><input type="radio" name="maritalStatus" value={opt} checked={formData.maritalStatus === opt} onChange={(e) => handleChange('maritalStatus', e.target.value)} /> {opt}</label>
        ))}
      </div></div>
      <div><Label>Religious History</Label><div className="flex gap-6 mt-2">
        <label><input type="radio" name="religiousHistory" value="Born Muslim" checked={formData.religiousHistory === "Born Muslim"} onChange={(e) => handleChange('religiousHistory', e.target.value)} /> Born Muslim</label>
        <label><input type="radio" name="religiousHistory" value="Revert" checked={formData.religiousHistory === "Revert"} onChange={(e) => handleChange('religiousHistory', e.target.value)} /> Revert</label>
      </div></div>
      <div><Label>Do you pray?</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {["All Fard + Nafil Prayers", "All Fard Prayers", "Some Fard Prayers", "Rarely Pray", "Want to Start Praying", "Do Not Pray"].map(opt => (
          <label key={opt} className="flex items-center gap-2"><input type="radio" name="prayLevel" value={opt} checked={formData.prayLevel === opt} onChange={(e) => handleChange('prayLevel', e.target.value)} /> {opt}</label>
        ))}
      </div></div>
      <div><Label>Sect / Madhab</Label><div className="flex gap-6 mt-2 flex-wrap">
        <label><input type="radio" name="sect" value="Sunni" checked={formData.sect === "Sunni"} onChange={(e) => handleChange('sect', e.target.value)} /> Sunni</label>
        <label><input type="radio" name="sect" value="Shia" checked={formData.sect === "Shia"} onChange={(e) => handleChange('sect', e.target.value)} /> Shia</label>
        <label><input type="radio" name="sect" value="Other" checked={formData.sect === "Other"} onChange={(e) => handleChange('sect', e.target.value)} /> Other</label>
        <label><input type="radio" name="sect" value="Prefer not to mention" checked={formData.sect === "Prefer not to mention"} onChange={(e) => handleChange('sect', e.target.value)} /> Prefer not to mention</label>
      </div></div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-medium text-fk-plum">Step 3: Personality & Individualism</h2>
      <div><Label>How would you describe your sense of humor?</Label><Textarea value={formData.senseOfHumor} onChange={(e) => handleChange('senseOfHumor', e.target.value)} rows={3} /></div>
      <div><Label>What motivates you in life?</Label><Textarea value={formData.motivation} onChange={(e) => handleChange('motivation', e.target.value)} rows={3} /></div>
      <div><Label>If you could change one thing about yourself, what would it be?</Label><Textarea value={formData.changeAboutSelf} onChange={(e) => handleChange('changeAboutSelf', e.target.value)} rows={3} /></div>
      <div><Label>What types of people do you get along with?</Label><Textarea value={formData.peopleGetAlongWith} onChange={(e) => handleChange('peopleGetAlongWith', e.target.value)} rows={3} /></div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-medium text-fk-plum">Step 4: Marriage & Partner Preferences</h2>
      <div><Label>What qualities do you value most in a partner?</Label><Textarea value={formData.partnerQualities} onChange={(e) => handleChange('partnerQualities', e.target.value)} rows={3} /></div>
      <div><Label>What is your vision of a successful marriage?</Label><Textarea value={formData.marriageVision} onChange={(e) => handleChange('marriageVision', e.target.value)} rows={3} /></div>
      <div><Label>How important is it for you to share similar interests with your spouse?</Label><Textarea value={formData.sharedInterestsImportance} onChange={(e) => handleChange('sharedInterestsImportance', e.target.value)} rows={3} /></div>
      <div><Label>How do you think a strong partnership can contribute to personal growth?</Label><Textarea value={formData.partnershipGrowth} onChange={(e) => handleChange('partnershipGrowth', e.target.value)} rows={3} /></div>
      <div><Label>What are your deal breakers?</Label><Textarea value={formData.dealBreakers} onChange={(e) => handleChange('dealBreakers', e.target.value)} rows={3} /></div>
      <div><Label>What are you seeking in a partner? (min 100 characters)</Label><Textarea value={formData.whatSeeking} onChange={(e) => handleChange('whatSeeking', e.target.value)} rows={3} /></div>

      <div><Label>Partner’s Age Range</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {["Less than 25 years", "Between 25 to 30 years", "Between 30 to 35 years", "Above 35 years"].map(opt => (
          <label key={opt} className="flex items-center gap-2"><input type="radio" name="partnerAgeRange" value={opt} checked={formData.partnerAgeRange === opt} onChange={(e) => handleChange('partnerAgeRange', e.target.value)} /> {opt}</label>
        ))}
      </div></div>

      <div><Label>Partner’s Education</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {["Secondary School", "Diploma/ Associate Degree", "Under-graduate", "Graduate/Post-graduate"].map(opt => (
          <label key={opt} className="flex items-center gap-2"><input type="radio" name="partnerEducation" value={opt} checked={formData.partnerEducation === opt} onChange={(e) => handleChange('partnerEducation', e.target.value)} /> {opt}</label>
        ))}
      </div></div>

      <div><Label>Partner’s Ethnic Background (Select all that apply)</Label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        {["Chinese", "Pakistani", "Indian", "Bangladeshi", "Malaysian", "Indonesian", "Philippines", "Other"].map(opt => (
          <label key={opt} className="flex items-center gap-2">
            <input type="checkbox" checked={formData.partnerEthnicBackground?.includes(opt) || false} onChange={() => handleMultiSelect('partnerEthnicBackground', opt)} /> {opt}
          </label>
        ))}
      </div></div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-medium text-fk-plum">Step 5: Family + Lifestyle & Goals</h2>
      <div><Label>What role does your family play in your life?</Label><Textarea value={formData.familyRole} onChange={(e) => handleChange('familyRole', e.target.value)} rows={3} /></div>
      <div><Label>Who are you closest to in your family, and why?</Label><Textarea value={formData.closestFamilyMember} onChange={(e) => handleChange('closestFamilyMember', e.target.value)} rows={3} /></div>
      <div><Label>What are some of your hobbies?</Label><Textarea value={formData.hobbies} onChange={(e) => handleChange('hobbies', e.target.value)} rows={3} /></div>
      <div><Label>Do you have any favorite books or movies that have influenced you?</Label><Textarea value={formData.favoriteBooksMovies} onChange={(e) => handleChange('favoriteBooksMovies', e.target.value)} rows={3} /></div>
      <div><Label>How often do you hang out with friends?</Label><Textarea value={formData.hangoutWithFriends} onChange={(e) => handleChange('hangoutWithFriends', e.target.value)} rows={3} /></div>
      <div><Label>What is your favorite way to relax or unwind?</Label><Textarea value={formData.relaxMethod} onChange={(e) => handleChange('relaxMethod', e.target.value)} rows={3} /></div>
      <div><Label>What are your long-term goals (personal & professional)?</Label><Textarea value={formData.longTermGoals} onChange={(e) => handleChange('longTermGoals', e.target.value)} rows={3} /></div>
      <div><Label>How do you see your ideal lifestyle as a couple?</Label><Textarea value={formData.idealCoupleLifestyle} onChange={(e) => handleChange('idealCoupleLifestyle', e.target.value)} rows={3} /></div>
      <div><Label>How do you seek to improve yourself over time?</Label><Textarea value={formData.selfImprovement} onChange={(e) => handleChange('selfImprovement', e.target.value)} rows={3} /></div>
      <div><Label>How do you balance work and personal life?</Label><Textarea value={formData.workLifeBalance} onChange={(e) => handleChange('workLifeBalance', e.target.value)} rows={3} /></div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-medium text-fk-plum">Step 6: Values, Religion & Faith</h2>
      <div><Label>What values are most important to you in life?</Label><Textarea value={formData.importantValues} onChange={(e) => handleChange('importantValues', e.target.value)} rows={3} /></div>
      <div><Label>How do your beliefs shape your daily activities and decisions?</Label><Textarea value={formData.beliefsShapeLife} onChange={(e) => handleChange('beliefsShapeLife', e.target.value)} rows={3} /></div>
      <div><Label>How do you incorporate your faith into your daily life?</Label><Textarea value={formData.faithInDailyLife} onChange={(e) => handleChange('faithInDailyLife', e.target.value)} rows={3} /></div>
      <div><Label>What role does prayer and community play in your life?</Label><Textarea value={formData.prayerCommunityRole} onChange={(e) => handleChange('prayerCommunityRole', e.target.value)} rows={3} /></div>
      <div><Label>How do you envision practicing your faith together with your future spouse?</Label><Textarea value={formData.faithWithSpouse} onChange={(e) => handleChange('faithWithSpouse', e.target.value)} rows={3} /></div>
      <div><Label>What are your views on raising children in accordance with Islamic values?</Label><Textarea value={formData.raisingChildrenIslamic} onChange={(e) => handleChange('raisingChildrenIslamic', e.target.value)} rows={3} /></div>
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-medium text-fk-plum">Step 7: Communication & Conflict Resolution</h2>
      <div><Label>What is your approach to conflict resolution?</Label><Textarea value={formData.conflictResolution} onChange={(e) => handleChange('conflictResolution', e.target.value)} rows={3} /></div>
      <div><Label>How do you handle stress or difficult situations?</Label><Textarea value={formData.handleStress} onChange={(e) => handleChange('handleStress', e.target.value)} rows={3} /></div>
      <div><Label>How do you typically handle disagreements or conflicts in relationships?</Label><Textarea value={formData.handleDisagreements} onChange={(e) => handleChange('handleDisagreements', e.target.value)} rows={3} /></div>
      <div><Label>What role does communication play in resolving issues for you?</Label><Textarea value={formData.communicationRole} onChange={(e) => handleChange('communicationRole', e.target.value)} rows={3} /></div>
    </div>
  );

  const renderStep8 = () => (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-medium text-fk-plum">Step 8: Guarantor / Wali (Private)</h2>
      <div><Label>Involvement of Parents/Wali</Label><div className="grid grid-cols-1 gap-2 mt-2">
        {["My parents/wali will be involved from the beginning", "My parents/wali will be involved if I have found a match", "I do not wish to involve my parents/wali"].map(opt => (
          <label key={opt} className="flex items-center gap-2"><input type="radio" name="waliInvolvement" value={opt} checked={formData.waliInvolvement === opt} onChange={(e) => handleChange('waliInvolvement', e.target.value)} /> {opt}</label>
        ))}
      </div></div>
      <div><Label>If you selected "No", please state the reason (otherwise put N/A)</Label><Textarea value={formData.waliReason} onChange={(e) => handleChange('waliReason', e.target.value)} rows={3} /></div>
      <div><Label>Wali’s Relationship to you</Label><div className="flex gap-6 mt-2">
        <label><input type="radio" name="waliRelationship" value="Father" checked={formData.waliRelationship === "Father"} onChange={(e) => handleChange('waliRelationship', e.target.value)} /> Father</label>
        <label><input type="radio" name="waliRelationship" value="Mother" checked={formData.waliRelationship === "Mother"} onChange={(e) => handleChange('waliRelationship', e.target.value)} /> Mother</label>
        <label><input type="radio" name="waliRelationship" value="Other" checked={formData.waliRelationship === "Other"} onChange={(e) => handleChange('waliRelationship', e.target.value)} /> Other</label>
      </div></div>
      <div><Label>Wali’s Name</Label><Input value={formData.waliName} onChange={(e) => handleChange('waliName', e.target.value)} /></div>
      <div><Label>Wali’s HKID / Passport No.</Label><Input value={formData.waliHKID} onChange={(e) => handleChange('waliHKID', e.target.value)} /></div>
      <div><Label>Wali’s Phone No.</Label><Input value={formData.waliPhone} onChange={(e) => handleChange('waliPhone', e.target.value)} /></div>
      <div><Label>Wali’s Email</Label><Input type="email" value={formData.waliEmail} onChange={(e) => handleChange('waliEmail', e.target.value)} /></div>
      <div><Label>Wali’s Home Address</Label><Textarea value={formData.waliAddress} onChange={(e) => handleChange('waliAddress', e.target.value)} rows={3} /></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEditing ? "Edit Your CV" : "CV Builder"}
        subtitle="Complete each section to build your marriage profile."
        eyebrow="Your Profile"
        onMenuClick={onMenuClick}
        actions={
          <Button variant="premium-outline" className="rounded-xl" onClick={() => router.push('/dashboard')}>
            ← Dashboard
          </Button>
        }
      />

      <CVProgressBar currentStep={currentStep} totalSteps={totalSteps} />

      <Card className="min-h-[500px]">
        <CardContent className="pt-2">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
          {currentStep === 7 && renderStep7()}
          {currentStep === 8 && renderStep8()}

          {errors.length > 0 && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="mb-2 font-semibold text-red-600">Please fix the following issues before submitting:</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-red-600">
                {errors.map((error, index) => <li key={index}>{error}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row">
        <Button variant="premium-outline" className="h-11 rounded-xl" onClick={prevStep} disabled={currentStep === 1}>
          Back
        </Button>
        <Button variant="premium" className="h-11 rounded-xl" onClick={currentStep === totalSteps ? handleSubmit : nextStep}>
          {currentStep === totalSteps
            ? (isEditing ? "Update CV" : "Submit CV")
            : "Next"}
        </Button>
      </div>
    </div>
  );
}