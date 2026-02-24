/**
 * Netlify Scheduled Function (Optional)
 * 
 * This is a lightweight trigger that calls the Next.js API.
 * Configure in netlify.toml:
 * 
 * [[plugins]]
 * package = "@netlify/plugin-scheduled-functions"
 * 
 * [plugins.config]
 *   schedule = "20 9 * * 1-5"  # 9:20 AM IST (Mon-Fri)
 */

interface NetlifyEvent {
  httpMethod?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface NetlifyContext {
  functionName?: string;
  requestId?: string;
}

interface NetlifyResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

type NetlifyHandler = (
  event: NetlifyEvent,
  context: NetlifyContext
) => Promise<NetlifyResponse>;

const handler: NetlifyHandler = async (event, context) => {
  try {
    console.log('Netlify scheduled trigger: Market sync');

    // Determine session based on time
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getUTCHours();

    // 9:20 AM IST = OPEN, 3:35 PM IST = CLOSE
    const session = hour === 9 ? 'OPEN' : 'CLOSE';

    // Get the base URL from environment
    const baseUrl = process.env.URL || 'http://localhost:3000';

    // Call Next.js API route
    const response = await fetch(`${baseUrl}/api/portfolio/market-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Market sync failed:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          error: 'Market sync failed',
          details: data,
        }),
      };
    }

    console.log('Market sync successful:', data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Market sync completed for ${session} session`,
        data,
      }),
    };
  } catch (error) {
    console.error('Netlify trigger error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
