"use client";

const PROFILE_IMAGE_CACHE_NAME = "geiger-profile-image-v1";
const PROFILE_IMAGE_CACHE_PREFIX = "/__geiger_profile_image_cache__/";

function canUseCacheStorage() {
  return typeof window !== "undefined" && "caches" in window;
}

function cacheRequestFor(cacheKey) {
  return new Request(`${PROFILE_IMAGE_CACHE_PREFIX}${encodeURIComponent(cacheKey)}`);
}

export async function getCachedProfileImageUrl(src, cacheKey) {
  if (!src || !cacheKey || !canUseCacheStorage()) {
    return src || "";
  }

  try {
    const cache = await caches.open(PROFILE_IMAGE_CACHE_NAME);
    const request = cacheRequestFor(cacheKey);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      const cachedBlob = await cachedResponse.blob();
      return URL.createObjectURL(cachedBlob);
    }

    const response = await fetch(src, { cache: "force-cache" });

    if (!response.ok) {
      return src;
    }

    const imageBlob = await response.blob();
    const contentType = response.headers.get("content-type") || imageBlob.type || "image/jpeg";
    await cache.put(
      request,
      new Response(imageBlob, {
        headers: {
          "content-type": contentType,
          "x-profile-image-src": src,
        },
      })
    );

    return URL.createObjectURL(imageBlob);
  } catch {
    return src;
  }
}

export async function clearProfileImageCache() {
  if (!canUseCacheStorage()) {
    return;
  }

  try {
    await caches.delete(PROFILE_IMAGE_CACHE_NAME);
  } catch {
    // Logout must continue even if a browser blocks cache access.
  }
}
