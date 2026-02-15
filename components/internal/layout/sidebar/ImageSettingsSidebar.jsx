"use client";

import React, { useState } from "react";
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

export default function ImageSettingsSidebar({
  selectedNode,
  onUpdateNode,
  onBack,
}) {
  const [isCaptionDialogOpen, setIsCaptionDialogOpen] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);

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

  const toggleDrawing = () => {
    const isDrawing = selectedNode.data.isDrawing || false;
    updateData({ isDrawing: !isDrawing });
    toast.info(isDrawing ? "Drawing mode disabled" : "Drawing mode enabled");
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

  const imageSrc = selectedNode.data.src || "https://placehold.co/600x400";

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

          <div className="w-full h-[1px] bg-zinc-800 my-1" />

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

          <div className="w-full h-[1px] bg-zinc-800 my-1" />

          <ActionPlug
            icon={Pencil}
            label="Draw"
            active={selectedNode.data.isDrawing}
            onClick={toggleDrawing}
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
