"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ProfileCardProps = {
  shortId: string;
  fullName?: string;
  occupation?: string;
  education?: string;
  photoUrl?: string | null;
  onView: () => void;
  index?: number;
};

export function ProfileCard({
  shortId,
  fullName,
  occupation,
  education,
  photoUrl,
  onView,
  index = 0,
}: ProfileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <Card className="overflow-hidden py-0 transition-shadow duration-300 hover:shadow-md">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Profile"
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-fk-bg-top">
            <User className="size-12 text-fk-mauve/40" strokeWidth={1} />
          </div>
        )}

        <CardContent className="p-5">
          <div className="mb-4">
            <span className="fk-eyebrow text-[10px]">Short ID</span>
            <p className="font-title text-2xl tracking-[0.15em] text-fk-plum-light">
              {shortId}
            </p>
          </div>

          <div className="mb-5 space-y-1.5 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-fk-plum">Name:</span>{" "}
              {fullName}
            </p>
            <p>
              <span className="font-medium text-fk-plum">Occupation:</span>{" "}
              {occupation || "N/A"}
            </p>
            <p>
              <span className="font-medium text-fk-plum">Education:</span>{" "}
              {education || "N/A"}
            </p>
          </div>

          <Button
            variant="premium"
            className="h-11 w-full rounded-xl"
            onClick={onView}
          >
            View Profile
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}