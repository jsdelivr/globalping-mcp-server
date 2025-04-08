/**
 * Error handling utilities for the Globalping MCP server
 */

/**
 * Custom error class for Globalping API errors
 */
export class GlobalpingError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  
  constructor(message: string, statusCode = 500, type = 'api_error') {
    super(message);
    this.name = 'GlobalpingError';
    this.statusCode = statusCode;
    this.type = type;
    
    // This is necessary for proper instanceof checks with custom Error classes
    Object.setPrototypeOf(this, GlobalpingError.prototype);
  }
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends GlobalpingError {
  public readonly resetTime: number;
  
  constructor(message: string, resetTime: number) {
    super(message, 429, 'rate_limit_exceeded');
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
    
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Parse and handle Globalping API errors
 * @param error The error object
 * @param defaultMessage Default message to return if parsing fails
 * @returns Formatted error object
 */
export function handleGlobalpingError(error: unknown, defaultMessage = 'An error occurred with the Globalping API'): { message: string; type: string; statusCode: number } {
  // Handle known error types
  if (error instanceof GlobalpingError) {
    return {
      message: error.message,
      type: error.type,
      statusCode: error.statusCode
    };
  }
  
  // Try to extract error information if it's a Response object
  if (error instanceof Response) {
    return {
      message: `API request failed with status: ${error.status} ${error.statusText}`,
      type: 'api_error',
      statusCode: error.status
    };
  }
  
  // Handle generic Error objects
  if (error instanceof Error) {
    // Try to parse rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
      return {
        message: error.message,
        type: 'rate_limit_exceeded',
        statusCode: 429
      };
    }
    
    return {
      message: error.message,
      type: 'error',
      statusCode: 500
    };
  }
  
  // Handle unknown error types
  return {
    message: typeof error === 'string' ? error : defaultMessage,
    type: 'unknown_error',
    statusCode: 500
  };
}

/**
 * Provide helpful guidance for rate limit errors
 * @param resetTime Time until rate limit resets (in seconds)
 * @returns Guidance message
 */
export function getRateLimitGuidance(resetTime?: number): string {
  let guidance = 'You have exceeded the Globalping API rate limit. ';
  
  if (resetTime) {
    const minutes = Math.ceil(resetTime / 60);
    guidance += `The rate limit will reset in ${minutes} minute${minutes === 1 ? '' : 's'}. `;
  }
  
  guidance += 'To continue using the service, you can:\n\n';
  guidance += '1. Wait for the rate limit to reset\n';
  guidance += '2. Provide your own Globalping API token (get one at https://dash.globalping.io/tokens)\n';
  guidance += '3. Reduce the number of probes or locations in your measurements\n';
  
  return guidance;
}

/**
 * Check if an error is related to rate limiting
 * @param error The error to check
 * @returns True if it's a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }
  
  if (error instanceof Error) {
    return error.message.includes('rate limit') || 
           error.message.includes('too many requests') ||
           error.message.includes('429');
  }
  
  return false;
}
