import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const maskLength = (value?: string) => (value ? value.length : 0);
const maskPrefix = (value?: string) => (value ? `${value.slice(0, 7)}...` : null);

export async function GET() {
  const secret = process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET;
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;

  return NextResponse.json({
    ok: Boolean(secret && publishable),
    runtime: 'nodejs',
    env: {
      CLERK_SECRET_KEY: Boolean(process.env.CLERK_SECRET_KEY),
      CLERK_SECRET: Boolean(process.env.CLERK_SECRET),
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      CLERK_PUBLISHABLE_KEY: Boolean(process.env.CLERK_PUBLISHABLE_KEY),
    },
    resolved: {
      secretExists: Boolean(secret),
      secretLength: maskLength(secret),
      secretPrefix: maskPrefix(secret),
      publishableExists: Boolean(publishable),
      publishableLength: maskLength(publishable),
      publishablePrefix: maskPrefix(publishable),
    },
    netlifyContext: process.env.CONTEXT || null,
    netlifySiteName: process.env.SITE_NAME || null,
  });
}
