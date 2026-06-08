import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = new Set([
  '/',
  '/notes',
  '/login',
  '/loading-test',
  '/notes/login',
  '/notes/loading-test',
  '/robots.txt',
  '/sitemap.xml',
  '/api/login',
  '/notes/api/login',
])

function normalizePathname(pathname) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}

function isStaticAssetPath(pathname) {
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|woff|woff2|ttf|otf)$/i.test(pathname)
}

export async function updateSession(request) {
  const pathname = normalizePathname(request.nextUrl.pathname)

  if (isStaticAssetPath(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const isPublicPath = PUBLIC_PATHS.has(pathname)

    if (isPublicPath) {
      return supabaseResponse
    }

    const isApiRequest = pathname.includes('/api/') || pathname.endsWith('/api')

    if (isApiRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loginUrl = new URL('/login', request.nextUrl.origin)
    const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`
    loginUrl.searchParams.set('next', returnTo)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
