export function downloadImage({ src, drawingData, transform }) {
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

    if (drawingData) {
      const drawImg = new Image();
      drawImg.onload = () => {
        ctx.drawImage(drawImg, 0, 0, canvas.width, canvas.height);
        triggerDownload();
      };
      drawImg.src = drawingData;
    } else {
      triggerDownload();
    }
  };

  img.src = src;
}
