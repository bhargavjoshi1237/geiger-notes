// Proxy (the Next 16 rename of middleware). Runs ahead of the CDN on every
// non-asset request, so anything awaited here lands in front of cached
// responses — see updateSession for the workspace-route fast path.

import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
