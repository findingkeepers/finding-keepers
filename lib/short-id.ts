export function generateShortIdCandidate(gender: string) {
  const prefix = gender?.toLowerCase() === "male" ? "M" : "F";
  const random = crypto.getRandomValues(new Uint32Array(1))[0] % 90000;
  return `${prefix}${10000 + random}`;
}