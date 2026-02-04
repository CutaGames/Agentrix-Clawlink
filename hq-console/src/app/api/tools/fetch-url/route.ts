import { NextRequest, NextResponse } from 'next/server';

// Security: Block internal network access
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.',  // Link-local
  '10.',       // Private Class A
  '172.16.',   // Private Class B (partial)
  '192.168.',  // Private Class C
];

function isUrlAllowed(urlString: string): { allowed: boolean; reason?: string } {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { allowed: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // Block internal hosts
    for (const blocked of BLOCKED_HOSTS) {
      if (url.hostname.startsWith(blocked) || url.hostname === blocked) {
        return { allowed: false, reason: 'Internal network access is not allowed' };
      }
    }

    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'Invalid URL format' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      url, 
      method = 'GET', 
      headers = {}, 
      body: requestBody,
      timeout = 30000,
      followRedirects = true,
    } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'url is required' },
        { status: 400 }
      );
    }

    // Security check
    const urlCheck = isUrlAllowed(url);
    if (!urlCheck.allowed) {
      return NextResponse.json(
        { error: `URL blocked: ${urlCheck.reason}` },
        { status: 403 }
      );
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          'User-Agent': 'Agentrix-HQ-Tools/1.0',
          ...headers,
        },
        signal: controller.signal,
        redirect: followRedirects ? 'follow' : 'manual',
      };

      // Add body for non-GET requests
      if (requestBody && method.toUpperCase() !== 'GET') {
        fetchOptions.body = typeof requestBody === 'string' 
          ? requestBody 
          : JSON.stringify(requestBody);
        if (!headers['Content-Type']) {
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Determine content type and get appropriate body
      const contentType = response.headers.get('content-type') || '';
      let responseBody: any;
      
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else if (contentType.includes('text/')) {
        responseBody = await response.text();
      } else {
        // For binary content, return base64
        const buffer = await response.arrayBuffer();
        responseBody = {
          type: 'binary',
          base64: Buffer.from(buffer).toString('base64'),
          size: buffer.byteLength,
        };
      }

      return NextResponse.json({
        success: true,
        url,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    console.error('Fetch URL error:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch URL' },
      { status: 500 }
    );
  }
}
