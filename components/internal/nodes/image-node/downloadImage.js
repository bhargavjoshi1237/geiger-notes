// Composite the photo with its annotation and hand the user a PNG. The
// annotation arrives as rendered SVG markup (the sketch preview), which is
// rasterized through a blob URL before it is drawn over the photo.
export function downloadImage({ src, annotation, transform }) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    const triggerDownload = () => {
      const link = document.createElement("a");
      link.download = "image-node.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    if (!annotation) {
      triggerDownload();
      return;
    }

    const url = URL.createObjectURL(
      new Blob([annotation], { type: "image/svg+xml;charset=utf-8" }),
    );
    const overlay = new Image();
    overlay.onload = () => {
      ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      triggerDownload();
    };
    overlay.onerror = () => {
      URL.revokeObjectURL(url);
      triggerDownload();
    };
    overlay.src = url;
  };

  img.src = src;
}
