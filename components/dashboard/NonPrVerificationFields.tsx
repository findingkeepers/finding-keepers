import { OtherSpecifyField } from "@/components/cv/OtherSpecifyField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  VISA_TYPE_OPTIONS,
  YEARS_IN_HK_OPTIONS,
  type NonPrVerificationForm,
} from "@/lib/non-pr-verification";

type NonPrVerificationFieldsProps = {
  form: NonPrVerificationForm;
  onChange: (updates: Partial<NonPrVerificationForm>) => void;
  onVisaFileChange: (file: File | null) => void;
};

export function NonPrVerificationFields({
  form,
  onChange,
  onVisaFileChange,
}: NonPrVerificationFieldsProps) {
  return (
    <div className="space-y-6 rounded-2xl border border-fk-gold/40 bg-fk-cream/30 p-6">
      <div>
        <h3 className="font-sans text-lg font-medium text-fk-plum">
          Extra Verification for non Permanent Residents
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          It would be great if you can provide us with some additional
          information to verify your status.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="years-in-hk">How long have you been in Hong Kong?</Label>
        <Select
          id="years-in-hk"
          value={form.yearsInHk}
          onChange={(e) =>
            onChange({
              yearsInHk: e.target.value,
              yearsInHkOther:
                e.target.value === "Other" ? form.yearsInHkOther : "",
            })
          }
          required
        >
          <option value="" disabled>
            Select
          </option>
          {YEARS_IN_HK_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <OtherSpecifyField
          show={form.yearsInHk === "Other"}
          label="Please specify"
          value={form.yearsInHkOther}
          onChange={(value) => onChange({ yearsInHkOther: value })}
          placeholder="e.g. 7 years"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="visa-type">What type of visa are you on?</Label>
        <Select
          id="visa-type"
          value={form.visaType}
          onChange={(e) =>
            onChange({
              visaType: e.target.value,
              visaTypeOther:
                e.target.value === "Other" ? form.visaTypeOther : "",
            })
          }
          required
        >
          <option value="" disabled>
            Select
          </option>
          {VISA_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <OtherSpecifyField
          show={form.visaType === "Other"}
          label="Please specify"
          value={form.visaTypeOther}
          onChange={(value) => onChange({ visaTypeOther: value })}
          placeholder="e.g. Dependent visa"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="visa-file">
          Please upload a copy of your latest valid visa
        </Label>
        <Input
          id="visa-file"
          type="file"
          onChange={(e) => onVisaFileChange(e.target.files?.[0] || null)}
          accept=".jpg,.jpeg,.png,.pdf"
          className="rounded-xl"
          required
        />
      </div>

      <div className="space-y-4 border-t border-fk-gold/30 pt-6">
        <p className="text-sm text-muted-foreground">
          Please provide a referral from someone who has a reasonable
          experience/relation with you, is a permanent resident and is able to
          provide additional inputs to hopefully increase your chances in the
          selection process.
        </p>

        <div className="space-y-2">
          <Label htmlFor="referral-name">Referral Name</Label>
          <Input
            id="referral-name"
            value={form.referralName}
            onChange={(e) => onChange({ referralName: e.target.value })}
            className="h-11 rounded-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="referral-phone">Referral Phone No.</Label>
          <Input
            id="referral-phone"
            type="tel"
            value={form.referralPhone}
            onChange={(e) => onChange({ referralPhone: e.target.value })}
            placeholder="+852 XXXX XXXX"
            className="h-11 rounded-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="referral-email">Referral Email Address</Label>
          <Input
            id="referral-email"
            type="email"
            value={form.referralEmail}
            onChange={(e) => onChange({ referralEmail: e.target.value })}
            className="h-11 rounded-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="referral-hkid">Referral HKID No.</Label>
          <Input
            id="referral-hkid"
            value={form.referralHkid}
            onChange={(e) => onChange({ referralHkid: e.target.value })}
            placeholder="A123456(7)"
            className="h-11 rounded-xl"
            required
          />
        </div>
      </div>
    </div>
  );
}