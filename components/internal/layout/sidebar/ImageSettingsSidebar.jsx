"use client";

import React, { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Type,
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Pencil,
  Image as LucideImage,
} from "lucide-react";
import { SidebarShell, SidebarSection } from "./SidebarPrimitives";
import { ActionPlug } from "./plugs/ActionPlug";
import ImageCaptionDialog from "./dialogs/ImageCaptionDialog";
import ImageCropDialog from "./dialogs/ImageCropDialog";
import ImageChangeDialog from "./dialogs/ImageChangeDialog";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { PLACEHOLDER_SRC } from "@/components/internal/nodes/image-node";

export default function ImageSettingsSidebar({
  selectedNode,
  onUpdateNode,
  onBack,
  projectId,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCaptionDialogOpen, setIsCaptionDialogOpen] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);

  if (!selectedNode || selectedNode.type !== "image") return null;

  const updateData = (newData) => {
    onUpdateNode(selectedNode.id, {
      data: { ...selectedNode.data, ...newData },
    });
  };

  const handleCaptionSave = (captionData) => {
    updateData({ caption: captionData });
    setIsCaptionDialogOpen(false);
  };

  const handleRotate = (deg) => {
    const currentRotation = selectedNode.data.transform?.rotation || 0;
    const newRotation = (currentRotation + deg) % 360;
    updateData({
      transform: {
        ...selectedNode.data.transform,
        rotation: newRotation,
      },
    });
  };

  const handleFlip = (axis) => {
    const currentScaleX = selectedNode.data.transform?.scaleX || 1;
    const currentScaleY = selectedNode.data.transform?.scaleY || 1;

    if (axis === "horizontal") {
      updateData({
        transform: {
          ...selectedNode.data.transform,
          scaleX: currentScaleX * -1,
        },
      });
    } else {
      updateData({
        transform: {
          ...selectedNode.data.transform,
          scaleY: currentScaleY * -1,
        },
      });
    }
  };

  // Annotating opens the shared sketch editor with the photo as a locked
  // backdrop; the marks live in notes.sketches so they stay editable.
  const openAnnotation = async () => {
    if (isAnnotating) return;
    const openSketch = (id) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sketch", id);
      router.push(`${pathname}?${params.toString()}`);
    };

    const existing = selectedNode.data.annotationSketchId;
    if (existing) {
      openSketch(existing);
      return;
    }

    setIsAnnotating(true);
    try {
      const label = selectedNode.data.caption?.text || selectedNode.data.label || "Image";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/sketches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${label} — annotation`,
            ...(projectId ? { projectId } : {}),
            metadata: {
              backdrop: { url: selectedNode.data.src || PLACEHOLDER_SRC },
              // Preserved so existing strokes come back as a locked layer.
              ...(selectedNode.data.drawing
                ? { legacyDrawing: selectedNode.data.drawing }
                : {}),
            },
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to create annotation");
      const sketch = await response.json();
      updateData({ annotationSketchId: sketch.id });
      openSketch(sketch.id);
    } catch (error) {
      console.error("Annotate error:", error);
      toast.error("Failed to open the annotation");
    } finally {
      setIsAnnotating(false);
    }
  };

  const handleCropSave = (croppedDataUrl) => {
    updateData({ src: croppedDataUrl, drawing: null });
    toast.info("Image cropped successfully");
  };

  const createThumbnailInfo = async (dataUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxDim = 300;
        let w = img.width;
        let h = img.height;
        const scale = Math.min(maxDim / w, maxDim / h, 1);
        w = w * scale;
        h = h * scale;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Thumbnail creation failed"));
          },
          "image/jpeg",
          0.7,
        );
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  const handleImageChangeSave = async (newSrc) => {
    setIsChangeDialogOpen(false);
    const toastId = toast.loading("Uploading image...");

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to upload images.");
      }

      const basePath = `${user.id}/${selectedNode.id}`;

      const { data: existingFiles } = await supabase.storage
        .from("homeboard")
        .list(basePath);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(
          (file) => `${basePath}/${file.name}`,
        );
        const { error: deleteError } = await supabase.storage
          .from("homeboard")
          .remove(filesToDelete);

        if (deleteError) {
          console.warn("Failed to delete old files:", deleteError);
        }
      }

      const res = await fetch(newSrc);
      const highResBlob = await res.blob();
      const thumbnailBlob = await createThumbnailInfo(newSrc);
      const highResPath = `${basePath}/high_res.png`;
      const thumbPath = `${basePath}/thumbnail.png`;

      const { error: highResError } = await supabase.storage
        .from("homeboard")
        .upload(highResPath, highResBlob, {
          upsert: true,
          contentType: highResBlob.type,
        });

      if (highResError) throw highResError;

      const { error: thumbError } = await supabase.storage
        .from("homeboard")
        .upload(thumbPath, thumbnailBlob, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (thumbError) {
        console.warn("Thumbnail upload failed", thumbError);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("homeboard").getPublicUrl(highResPath);

      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      updateData({ src: cacheBustedUrl, drawing: null });
      toast.success("Image uploaded successfully", { id: toastId });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image", { id: toastId });
    }
  };

  const imageSrc = selectedNode.data.src || PLACEHOLDER_SRC;

  return (
    <>
      <SidebarShell onBack={onBack} title="Image">
        <SidebarSection>
          <ActionPlug
            icon={LucideImage}
            label="Change Image"
            onClick={() => setIsChangeDialogOpen(true)}
          />
          <ActionPlug
            icon={Type}
            label="Edit Caption"
            onClick={() => setIsCaptionDialogOpen(true)}
          />

          <div className="w-full h-[1px] bg-border my-1" />

          <ActionPlug
            icon={RotateCcw}
            label="Rotate Left"
            onClick={() => handleRotate(-90)}
          />
          <ActionPlug
            icon={RotateCw}
            label="Rotate Right"
            onClick={() => handleRotate(90)}
          />
          <ActionPlug
            icon={FlipHorizontal}
            label="Flip Horizontal"
            onClick={() => handleFlip("horizontal")}
          />
          <ActionPlug
            icon={FlipVertical}
            label="Flip Vertical"
            onClick={() => handleFlip("vertical")}
          />
          <ActionPlug
            icon={Crop}
            label="Crop"
            onClick={() => setIsCropDialogOpen(true)}
          />

          <div className="w-full h-[1px] bg-border my-1" />

          <ActionPlug
            icon={Pencil}
            label="Annotate"
            onClick={openAnnotation}
          />
        </SidebarSection>
      </SidebarShell>

      <ImageCaptionDialog
        open={isCaptionDialogOpen}
        onOpenChange={setIsCaptionDialogOpen}
        initialData={selectedNode.data.caption || {}}
        onSave={handleCaptionSave}
      />

      <ImageCropDialog
        open={isCropDialogOpen}
        onOpenChange={setIsCropDialogOpen}
        src={imageSrc}
        onSave={handleCropSave}
      />

      <ImageChangeDialog
        open={isChangeDialogOpen}
        onOpenChange={setIsChangeDialogOpen}
        onSave={handleImageChangeSave}
        currentSrc={imageSrc}
      />
    </>
  );
}
