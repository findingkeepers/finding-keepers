import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OtherSpecifyFieldProps = {
  show: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function OtherSpecifyField({
  show,
  label,
  value,
  onChange,
  placeholder = "Please specify",
}: OtherSpecifyFieldProps) {
  if (!show) return null;

  return (
    <div className="ml-1 space-y-2 rounded-xl border border-fk-gold/30 bg-fk-cream/40 p-4">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl"
        required
      />
    </div>
  );
}