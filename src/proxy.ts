import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through non-admin routes immediately
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Pass through login page — no auth check needed
  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  // Redirect bare /admin or /admin/ → /admin/dashboard
  if (pathname === '/admin' || pathname === '/admin/') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  // Protect all other /admin/* routes
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session token
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
