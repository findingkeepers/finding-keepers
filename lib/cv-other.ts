export function selectionIsOther(value: string | undefined) {
  return value === "Other";
}

export function multiSelectIncludesOther(value: string | undefined) {
  return value?.split(", ").includes("Other") ?? false;
}

export function formatSelectionWithOther(
  selection: string | undefined,
  other?: string
) {
  if (!selection) return "";
  if (selectionIsOther(selection) && other?.trim()) {
    return `Other: ${other.trim()}`;
  }
  return selection;
}

export function formatMultiSelectWithOther(
  selections: string | undefined,
  other?: string
) {
  if (!selections?.trim()) return "";

  const values = selections.split(", ").filter(Boolean);
  if (!values.includes("Other")) return selections;

  const otherLabel =
    other?.trim() ? `Other: ${other.trim()}` : "Other";
  const rest = values.filter((value) => value !== "Other");

  return rest.length > 0 ? `${rest.join(", ")}, ${otherLabel}` : otherLabel;
}