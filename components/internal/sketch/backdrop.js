"use client";

// Backdrop helpers for image annotation (Phase 3). An annotated image opens the
// sketch editor with the photo seeded as a locked image element, so the marks
// stay editable forever instead of being flattened into a dataURL.

// A dataURL of a full-size photo inside the sketch's files jsonb is heavy, and
// annotation fidelity does not need the original pixels.
const MAX_BACKDROP_EDGE = 1600;

// Stable per-URL file id so re-opening an annotation never duplicates the file
// entry in the scene.
export function backdropFileId(url, prefix = "backdrop") {
  let hash = 5381;
  for (let i = 0; i < url.length; i += 1) {
    hash = ((hash << 5) + hash + url.charCodeAt(i)) >>> 0;
  }
  return `${prefix}-${hash.toString(36)}`;
}

// Fetch an image and re-encode it, capped on the long edge. Returns
// { dataURL, mimeType, width, height } or null when it can't be loaded.
export async function loadBackdropImage(url) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });

  const natW = image.naturalWidth || image.width;
  const natH = image.naturalHeight || image.height;
  if (!natW || !natH) throw new Error("Image has no dimensions");

  const scale = Math.min(MAX_BACKDROP_EDGE / Math.max(natW, natH), 1);
  const width = Math.round(natW * scale);
  const height = Math.round(natH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);

  return { dataURL: canvas.toDataURL("image/png"), mimeType: "image/png", width, height };
}

// True for the photo layer we seed — locked so it can't be dragged or deleted.
export function isBackdropElement(element) {
  return element?.type === "image" && element?.locked === true;
}

// Stable predicate for useSketchPreview so the node overlay leaves the photo
// out and does not draw it twice over the <img>.
export const withoutBackdrop = (element) => !isBackdropElement(element);
