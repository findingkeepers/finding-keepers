"use client";

import { Button } from "@/components/ui/button";

type InterestDecisionDialogProps = {
  open: boolean;
  decision: "approve" | "reject" | null;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function InterestDecisionDialog({
  open,
  decision,
  confirming = false,
  onCancel,
  onConfirm,
}: InterestDecisionDialogProps) {
  if (!open || !decision) {
    return null;
  }

  const isAccept = decision === "approve";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0 bg-fk-plum/30 backdrop-blur-sm"
        onClick={() => !confirming && onCancel()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl border border-fk-gold/25 bg-[#faf6f1] p-6 shadow-xl"
      >
        <h2 className="font-heading text-xl font-medium text-fk-plum">
          {isAccept ? "Confirm that you are interested" : "Confirm that you are not interested"}
        </h2>
        {isAccept ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-fk-body">
              Should you accept, and the other party initiates an active introduction,
              you are required to commit to the introduction meeting.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-fk-body">
              Failure to do so may risk account suspension and banning.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-fk-body">
            Are you sure you are not interested? This will close the interest, and no
            contact details will be shared.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={confirming}
            onClick={onCancel}
          >
            Go back
          </Button>
          <Button
            type="button"
            variant="premium"
            className="rounded-xl"
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming
              ? "Saving..."
              : isAccept
                ? "Yes, I am interested"
                : "Yes, I am not interested"}
          </Button>
        </div>
      </div>
    </div>
  );
}
