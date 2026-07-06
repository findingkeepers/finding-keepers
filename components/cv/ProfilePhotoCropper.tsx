"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { getCroppedImageBlobWithinSize } from "@/lib/crop-image";
import { MAX_PROFILE_PHOTO_BYTES } from "@/lib/cv-constants";
import { toast } from "sonner";

type ProfilePhotoCropperProps = {
  imageSrc: string;
  onCancel: () => void;
  onComplete: (file: File) => void;
};

export function ProfilePhotoCropper({
  imageSrc,
  onCancel,
  onComplete,
}: ProfilePhotoCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      return;
    }

    setSaving(true);

    try {
      const blob = await getCroppedImageBlobWithinSize(
        imageSrc,
        croppedAreaPixels,
        MAX_PROFILE_PHOTO_BYTES
      );

      const file = new File([blob], `profile-photo-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      onComplete(file);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not crop photo. Please try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fk-plum/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-fk-gold/25 bg-fk-bg-top shadow-2xl">
        <div className="border-b border-border/60 px-5 py-4">
          <h3 className="font-sans text-lg font-medium text-fk-plum">
            Crop your profile photo
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag to reposition and use the slider to zoom. Your photo will be
            saved as a square portrait.
          </p>
        </div>

        <div className="relative h-[320px] bg-fk-plum/5 sm:h-[380px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-2">
            <label
              htmlFor="photo-crop-zoom"
              className="text-sm font-medium text-fk-plum"
            >
              Zoom
            </label>
            <input
              id="photo-crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-fk-plum"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="premium"
              className="rounded-xl"
              disabled={saving || !croppedAreaPixels}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving..." : "Use this photo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}