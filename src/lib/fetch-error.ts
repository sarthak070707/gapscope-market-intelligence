/**
 * Frontend Fetch Error Handling Utilities
 *
 * When the gateway/proxy returns non-JSON errors (502, 504, etc.),
 * res.json() throws, and we need to create meaningful error objects.
 *
 * This module provides a shared utility that:
 * 1. Tries to read the response body as text for more context
 * 2. Creates specific, actionable error messages (not generic)
 * 3. Preserves the HTTP status code and likely stage info
 */

import { classifyError, type ModuleError } from '@/lib/error-handler';

interface FetchErrorOptions {
  moduleName: string;
  endpoint: string;
  category?: string;
  payload?: string;
}

/**
 * Handle a non-OK fetch response, returning a structured ModuleError.
 *
 * Attempts to parse JSON first (backend may have returned a structured error).
 * If JSON parse fails (gateway returned HTML), creates a context-rich error
 * that includes the HTTP status, likely stage, and actionable advice.
 */
export async function handleFetchError(
  res: Response,
  options: FetchErrorOptions
): Promise<ModuleError> {
  const { moduleName, endpoint, category, payload } = options;

  // Try to parse as JSON first — backend may have returned structured error
  try {
    const errorBody = await res.json();

    // If the backend returned a structured moduleError, use it directly
    if (errorBody.moduleError && typeof errorBody.moduleError === 'object') {
      const moduleError = errorBody.moduleError as ModuleError;
      moduleError.statusCode = res.status;
      if (!moduleError.requestCategory && category) moduleError.requestCategory = category;
      if (!moduleError.requestPayload && payload) moduleError.requestPayload = payload;
      if (!moduleError.backendMessage && errorBody.error) moduleError.backendMessage = errorBody.error;
      return moduleError;
    }

    // Backend returned a plain error — classify it
    const moduleError = classifyError(
      new Error(errorBody.error || `HTTP ${res.status}`),
      moduleName,
      endpoint,
      { category, payload, backendMessage: errorBody.error }
    );
    moduleError.statusCode = res.status;
    if (!moduleError.requestCategory && category) moduleError.requestCategory = category;
    if (!moduleError.requestPayload && payload) moduleError.requestPayload = payload;
    if (!moduleError.backendMessage && errorBody.error) moduleError.backendMessage = errorBody.error;
    return moduleError;
  } catch {
    // JSON parse failed — gateway returned HTML or non-JSON error
    // Try to read the response text for additional context
    let responseText = '';
    try {
      responseText = await res.text();
    } catch {
      // Can't read response body at all
    }

    const statusMsg = buildGatewayErrorMessage(res.status, endpoint, responseText);
    const moduleError = classifyError(new Error(statusMsg), moduleName, endpoint, {
      category,
      payload,
    });
    moduleError.statusCode = res.status;
    if (!moduleError.requestCategory && category) moduleError.requestCategory = category;
    if (!moduleError.requestPayload && payload) moduleError.requestPayload = payload;
    moduleError.backendMessage = `Gateway returned HTTP ${res.status} (non-JSON response). ${responseText ? `Response preview: ${responseText.substring(0, 200)}` : 'The response body was not readable.'}`;
    return moduleError;
  }
}

/**
 * Build a specific, actionable error message for gateway/proxy errors.
 * NEVER returns generic text — always includes the HTTP status, likely cause,
 * and what the user should do.
 */
function buildGatewayErrorMessage(status: number, endpoint: string, responseText: string): string {
  const endpointLabel = endpoint.replace('/api/', '');

  switch (status) {
    case 502:
      return `Gateway returned 502 Bad Gateway for ${endpointLabel}. The backend was likely still processing your request (scans and analyses can take 60-120 seconds). The gateway closed the connection before the backend finished. ${responseText ? `Gateway response: ${responseText.substring(0, 150)}` : 'Try again in 30 seconds — the second attempt is often faster because data is cached.'}`;

    case 504:
      return `Gateway timeout (504) for ${endpointLabel}. The request took too long and the gateway closed the connection. The backend may still be processing. Try again in 30 seconds — repeated attempts are usually faster.`;

    case 503:
      return `Service unavailable (503) for ${endpointLabel}. The server is temporarily overloaded. Wait a moment and try again.`;

    case 429:
      return `Rate limited (429) for ${endpointLabel}. Too many requests were sent. Wait 60 seconds before retrying.`;

    default:
      return `HTTP ${status} error from ${endpointLabel}. ${responseText ? `Response: ${responseText.substring(0, 200)}` : 'The server returned an unexpected response.'}`;
  }
}
