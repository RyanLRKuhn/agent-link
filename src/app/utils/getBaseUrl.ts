/**
 * Get the base URL for internal API calls, handling both development and production environments
 * @param headers Request headers to extract host information
 * @returns The base URL to use for internal API calls
 */
export function getBaseUrl(headers?: Headers): string {
  // Check for Vercel environment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Check for custom domain in production
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Use request headers if available
  if (headers?.get('host')) {
    const protocol = headers.get('x-forwarded-proto') || 'http';
    return `${protocol}://${headers.get('host')}`;
  }

  // Default to localhost in development
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
} 