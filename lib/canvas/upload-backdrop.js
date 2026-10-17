"use client";

import { createClient } from "@/utils/supabase/client";
import { isPlaygroundActive } from "@/lib/playground/mode";

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

// Downscale an image to at most 2560px and re-encode as JPEG to keep backgrounds light.
async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 2560 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Upload a background file to the user's homeboard folder and return its public URL (data URL in the offline playground).
export async function uploadBackdrop(file, kind, boardKey) {
  const blob = kind === "image" ? await compressImage(file) : file;
  if (isPlaygroundActive()) {
    if (kind === "video") throw new Error("Video uploads need a Geiger account — paste a video URL instead.");
    return toDataUrl(blob);
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to upload a background.");
  const ext = kind === "image" ? "jpg" : (file.name.split(".").pop() || "mp4").toLowerCase();
  const path = `${user.id}/backgrounds/${boardKey || "home"}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("homeboard")
    .upload(path, blob, { upsert: true, contentType: blob.type || file.type });
  if (error) throw error;
  return supabase.storage.from("homeboard").getPublicUrl(path).data.publicUrl;
}
