import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY
const clerkSecretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET
const clerkMiddlewareOptions = {
  ...(clerkPublishableKey ? { publishableKey: clerkPublishableKey } : {}),
  ...(clerkSecretKey ? { secretKey: clerkSecretKey } : {}),
}
const canUseClerkMiddleware = Boolean(clerkPublishableKey && clerkSecretKey)

// Define public routes
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/', '/manifest.json', '/sw.js'])

const handleDbProxy = (request: NextRequest) => {
  const { pathname, search } = request.nextUrl

  if (!pathname.startsWith('/db')) {
    return null
  }

  const targetPath = pathname.replace(/^\/db/, '')
  const upstreamUrl = process.env.COUCHDB_UPSTREAM_URL || 'http://admin:securepassword@localhost:8900'
  const finalUrl = `${upstreamUrl}${targetPath}${search}`

  return NextResponse.rewrite(finalUrl)
}

const middlewareWithClerk = clerkMiddleware(async (auth, request) => {
  const dbProxyResponse = handleDbProxy(request)

  if (dbProxyResponse) {
    return dbProxyResponse
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }
}, clerkMiddlewareOptions)

const middlewareWithoutClerk = (request: NextRequest) => {
  const dbProxyResponse = handleDbProxy(request)

  if (dbProxyResponse) {
    return dbProxyResponse
  }

  return NextResponse.next()
}

export default canUseClerkMiddleware ? middlewareWithClerk : middlewareWithoutClerk

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
