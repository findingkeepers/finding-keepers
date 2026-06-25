import { formatMatchDirection } from "@/lib/match-request";

type MatchDirectionDisplayProps = {
  maleShortId: string;
  femaleShortId: string;
  requestedByShortId?: string | null;
  maleName?: string;
  femaleName?: string;
  showNames?: boolean;
  highlightId?: string;
};

function renderShortId(id: string, highlightId?: string) {
  const highlighted = highlightId && id === highlightId;

  return (
    <span
      className={
        highlighted
          ? "font-mono font-semibold text-fk-plum"
          : "font-mono font-medium text-fk-plum"
      }
    >
      {id}
    </span>
  );
}

export function MatchDirectionDisplay({
  maleShortId,
  femaleShortId,
  requestedByShortId,
  maleName,
  femaleName,
  showNames = false,
  highlightId,
}: MatchDirectionDisplayProps) {
  const direction = formatMatchDirection({
    male_short_id: maleShortId,
    female_short_id: femaleShortId,
    requested_by_short_id: requestedByShortId,
  });

  const [fromId, toId] = direction.split(" → ");

  const requesterName =
    fromId === maleShortId
      ? maleName
      : fromId === femaleShortId
        ? femaleName
        : undefined;

  const targetName =
    toId === maleShortId
      ? maleName
      : toId === femaleShortId
        ? femaleName
        : undefined;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {renderShortId(fromId, highlightId)}
        <span className="text-fk-mauve" aria-hidden="true">
          →
        </span>
        {renderShortId(toId, highlightId)}
      </div>
      {showNames && (requesterName || targetName) && (
        <p className="text-sm text-muted-foreground">
          {requesterName || "—"} → {targetName || "—"}
        </p>
      )}
    </div>
  );
}