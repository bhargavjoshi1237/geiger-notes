"use client";

import { useEffect, useMemo, useState } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { getCachedProfileImageUrl } from "@/lib/profile-image-cache";

export function CachedAvatarImage({ src, cacheKey, ...props }) {
  const [cachedImage, setCachedImage] = useState({ key: "", src: "" });
  const stableCacheKey = useMemo(() => cacheKey || src || "", [cacheKey, src]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    getCachedProfileImageUrl(src, stableCacheKey).then((cachedSrc) => {
      if (cancelled) {
        if (cachedSrc?.startsWith("blob:")) {
          URL.revokeObjectURL(cachedSrc);
        }
        return;
      }

      objectUrl = cachedSrc?.startsWith("blob:") ? cachedSrc : "";
      setCachedImage({ key: stableCacheKey, src: cachedSrc || src || "" });
    });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, stableCacheKey]);

  const resolvedSrc = cachedImage.key === stableCacheKey ? cachedImage.src : src;

  if (!resolvedSrc) {
    return null;
  }

  return <AvatarImage src={resolvedSrc} {...props} />;
}
