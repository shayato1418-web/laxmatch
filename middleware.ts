import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAILS = ['s.hayato1418@gmail.com', 'laxmatch14@gmail.com'] as const

// Routes that require an authenticated session
const AUTH_ROUTES = ['/explore', '/availability', '/matches', '/chat', '/settings', '/admin']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Validates the JWT and refreshes the session — must be called before any
  // route logic so the session cookie is always up to date.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // /admin — only admin emails allowed (server-side enforcement)
  if (path.startsWith('/admin')) {
    if (!user || !(ADMIN_EMAILS as readonly string[]).includes(user.email ?? '')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // Protected app routes — require login
  if (AUTH_ROUTES.some((r) => path.startsWith(r))) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', path)
      return NextResponse.redirect(loginUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
