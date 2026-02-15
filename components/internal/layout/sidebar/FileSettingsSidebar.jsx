"use client";

import React, { useState } from "react";
import { Download, Upload, FileText } from "lucide-react";
import { SidebarShell, SidebarSection } from "./SidebarPrimitives";
import { ActionPlug } from "./plugs/ActionPlug";
import { ColorPlug } from "./plugs/ColorPlug";
import FileChangeDialog from "./dialogs/FileChangeDialog";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function FileSettingsSidebar({
  selectedNode,
  onUpdateNode,
  onBack,
}) {
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);

  if (!selectedNode || selectedNode.type !== "file") return null;

  const updateData = (newData) => {
    onUpdateNode(selectedNode.id, {
      data: { ...selectedNode.data, ...newData },
    });
  };

  const handleDownload = () => {
    const src = selectedNode.data.src;
    if (!src) {
      toast.error("No file to download");
      return;
    }
    window.open(src, "_blank");
  };

  const handleFileChangeSave = async (file) => {
    setIsChangeDialogOpen(false);
    const toastId = toast.loading("Uploading file...");

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to upload files.");
      }

      const basePath = `${user.id}/${selectedNode.id}`;
      const { data: existingFiles } = await supabase.storage
        .from("homeboard")
        .list(basePath);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((f) => `${basePath}/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from("homeboard")
          .remove(filesToDelete);

        if (deleteError) {
          console.warn("Failed to delete old files:", deleteError);
        }
      }

      const filePath = `${basePath}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("homeboard")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("homeboard").getPublicUrl(filePath);
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      updateData({
        src: cacheBustedUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      toast.success("File uploaded successfully", { id: toastId });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file", { id: toastId });
    }
  };

  return (
    <>
      <SidebarShell onBack={onBack} title="File">
        <SidebarSection>
          <ActionPlug
            icon={Upload}
            label="Upload File"
            onClick={() => setIsChangeDialogOpen(true)}
          />
          <ActionPlug
            icon={Download}
            label="Download File"
            onClick={handleDownload}
            disabled={!selectedNode.data.src}
          />
        </SidebarSection>

        <SidebarSection title="Appearance">
          <ColorPlug
            value={selectedNode.data.color}
            onChange={(color) => updateData({ color })}
          />
        </SidebarSection>
      </SidebarShell>

      <FileChangeDialog
        open={isChangeDialogOpen}
        onOpenChange={setIsChangeDialogOpen}
        onSave={handleFileChangeSave}
        currentSrc={selectedNode.data.src}
      />
    </>
  );
}
