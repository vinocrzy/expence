import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/', '/manifest.json', '/sw.js'])

export default clerkMiddleware(async (auth, request) => {
  const { pathname, search } = request.nextUrl

  // Proxy logic for /db requests
  if (pathname.startsWith('/db')) {
    // Construct the upstream URL
    // remove /db prefix
    const targetPath = pathname.replace(/^\/db/, '') 
    const upstreamUrl = process.env.COUCHDB_UPSTREAM_URL || 'http://admin:securepassword@localhost:8900'
    const finalUrl = `${upstreamUrl}${targetPath}${search}`
    
    return NextResponse.rewrite(finalUrl)
  }

  // Authentication logic
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
