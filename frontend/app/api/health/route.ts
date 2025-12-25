import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    region: process.env.AWS_REGION || 'dev', // Netlify often mimics AWS lambda envs
  });
}
