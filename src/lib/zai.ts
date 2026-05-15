import ZAI from 'z-ai-web-dev-sdk';

// ─── ZAI SDK Singleton with Initialization Guard ────────────────────

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
let zaiInitError: string | null = null;

/**
 * Get or initialize the ZAI SDK instance.
 * Caches initialization errors to avoid repeated failing init attempts.
 */
export async function getZAI() {
  if (zaiInitError) {
    throw new Error(
      `ZAI SDK initialization previously failed: ${zaiInitError}. Check your API key configuration and restart the server.`
    );
  }
  if (!zaiInstance) {
    try {
      console.log('[ZAI] Initializing ZAI SDK...');
      zaiInstance = await ZAI.create();
      console.log('[ZAI] ZAI SDK initialized successfully');
    } catch (err) {
      zaiInitError = err instanceof Error ? err.message : String(err);
      console.error('[ZAI] Failed to initialize ZAI SDK:', zaiInitError);
      throw new Error(
        `ZAI SDK initialization failed: ${zaiInitError}. Verify that API keys are configured correctly.`
      );
    }
  }
  return zaiInstance;
}

/**
 * Reset the ZAI instance (useful for retrying after initialization failure).
 */
export function resetZAI() {
  zaiInstance = null;
  zaiInitError = null;
  console.log('[ZAI] ZAI SDK instance reset');
}

// ─── Web Search ─────────────────────────────────────────────────────

export async function webSearch(query: string, num: number = 10) {
  console.log(`[ZAI] webSearch called: query="${query.substring(0, 80)}", num=${num}`);
  try {
    const zai = await getZAI();
    console.log('[ZAI] webSearch: calling SDK...');
    const result = await zai.functions.invoke('web_search', { query, num });
    const resultCount = Array.isArray(result) ? result.length : 0;
    console.log(`[ZAI] webSearch completed: got ${resultCount} results`);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ZAI] webSearch FAILED: ${msg}`);
    // Re-throw with context for error classification
    if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
      throw new Error(`Rate limit exceeded during web search (429): ${msg}`);
    }
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key')) {
      throw new Error(`Web search authentication failed (401): ${msg}. Check API key configuration.`);
    }
    if (msg.includes('502') || msg.includes('bad gateway')) {
      throw new Error(`Web search service returned Bad Gateway (502): ${msg}. The search API backend may be temporarily unavailable or overloaded.`);
    }
    throw new Error(`Web search failed: ${msg}`);
  }
}

// ─── Page Reader ────────────────────────────────────────────────────

export async function readPage(url: string) {
  console.log(`[ZAI] readPage called: url="${url.substring(0, 100)}"`);
  try {
    const zai = await getZAI();
    console.log('[ZAI] readPage: calling SDK...');
    const result = await zai.functions.invoke('page_reader', { url });
    console.log(`[ZAI] readPage completed for: ${url.substring(0, 80)}`);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ZAI] readPage FAILED for ${url.substring(0, 80)}: ${msg}`);
    if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
      throw new Error(`Rate limit exceeded during page reading (429): ${msg}`);
    }
    if (msg.includes('502') || msg.includes('bad gateway')) {
      throw new Error(`Page reading service returned Bad Gateway (502) for ${url}: ${msg}. The page reader backend may be temporarily unavailable.`);
    }
    throw new Error(`Page reading failed for ${url}: ${msg}`);
  }
}

// ─── Chat Completion (LLM) ─────────────────────────────────────────

export async function chatCompletion(messages: { role: string; content: string }[]) {
  const msgSummary = messages.map((m) => `${m.role}:${m.content.substring(0, 50)}...`).join(' | ');
  console.log(`[ZAI] chatCompletion called with ${messages.length} messages (${msgSummary.substring(0, 120)})`);
  try {
    const zai = await getZAI();
    console.log('[ZAI] chatCompletion: calling SDK...');
    const completion = await zai.chat.completions.create({
      messages: messages as any,
      thinking: { type: 'disabled' },
    });
    const content = completion.choices[0]?.message?.content || '';
    if (!content) {
      console.warn('[ZAI] chatCompletion returned empty content');
    }
    console.log(`[ZAI] chatCompletion completed: ${content.length} chars`);
    return content;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ZAI] chatCompletion FAILED: ${msg}`);
    // Re-throw with better context for error classification
    if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
      throw new Error(`Rate limit exceeded during AI generation (429): ${msg}`);
    }
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key')) {
      throw new Error(`AI authentication failed (401): ${msg}. Check API key configuration.`);
    }
    if (msg.includes('403') || msg.includes('forbidden')) {
      throw new Error(`AI access forbidden (403): ${msg}`);
    }
    if (msg.includes('500') || msg.includes('internal server')) {
      throw new Error(`AI server error (500): ${msg}`);
    }
    if (msg.includes('503') || msg.includes('service unavailable')) {
      throw new Error(`AI service unavailable (503): ${msg}`);
    }
    if (msg.includes('502') || msg.includes('bad gateway')) {
      throw new Error(`AI service returned Bad Gateway (502): ${msg}. The AI backend may be temporarily unavailable or overloaded.`);
    }
    throw new Error(`AI chat completion failed: ${msg}`);
  }
}

// ─── Structured Response Generator ──────────────────────────────────

/**
 * Generate a structured JSON response from the LLM.
 *
 * Features:
 * - Robust JSON extraction from various response formats
 * - Multiple parsing strategies with fallbacks
 * - Handles markdown code blocks, partial JSON, and malformed responses
 * - Truncation-aware: handles long LLM responses that get cut off
 */
export async function generateStructuredResponse<T>(
  systemPrompt: string,
  userMessage: string,
  schemaDescription: string
): Promise<T> {
  console.log(`[ZAI] generateStructuredResponse called (system: ${systemPrompt.substring(0, 60)}..., user: ${userMessage.substring(0, 60)}...)`);

  const fullMessage = `${userMessage}\n\nIMPORTANT: ${schemaDescription}\n\nRespond with valid JSON only. No markdown, no code blocks, just raw JSON.`;

  let response: string;
  try {
    response = await chatCompletion([
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: fullMessage },
    ]);
  } catch (err) {
    // chatCompletion already wraps errors with good context
    console.error('[ZAI] generateStructuredResponse: chatCompletion threw:', err instanceof Error ? err.message : String(err));
    throw err;
  }

  if (!response || !response.trim()) {
    console.error('[ZAI] LLM returned empty response');
    throw new Error('AI returned an empty response. The model may be overloaded or the request was too large.');
  }

  // Log response length for debugging
  const preview = response.length > 200 ? response.substring(0, 200) + '...' : response;
  console.log(`[ZAI] LLM response received: ${response.length} chars, preview: ${preview}`);

  try {
    const result = extractJsonFromResponse<T>(response);
    if (Array.isArray(result)) {
      console.log(`[ZAI] JSON extraction succeeded: array with ${result.length} items`);
    } else if (typeof result === 'object' && result !== null) {
      console.log(`[ZAI] JSON extraction succeeded: object with keys ${Object.keys(result).join(', ')}`);
    } else {
      console.log(`[ZAI] JSON extraction succeeded: ${typeof result}`);
    }
    return result;
  } catch (parseError) {
    const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
    console.error(`[ZAI] JSON extraction FAILED after receiving ${response.length} char response: ${errMsg}`);
    console.error('[ZAI] Response preview (first 500 chars):', response.substring(0, 500));
    console.error('[ZAI] Response tail (last 200 chars):', response.substring(response.length - 200));
    throw new Error(
      `Failed to parse AI response as JSON. Response was ${response.length} chars. ${errMsg}. ` +
      `This usually happens when the AI model's response is truncated or contains non-JSON content.`
    );
  }
}

// ─── Multi-Strategy JSON Extractor ──────────────────────────────────

/**
 * Extract valid JSON from an LLM response using multiple strategies.
 * 
 * KEY INSIGHT: LLMs often return JSON inside markdown code blocks
 * (```json ... ```) but frequently forget the closing ``` or add
 * extra text. The extraction must handle this robustly.
 * 
 * CRITICAL: When the response starts with `[` (after stripping code fences),
 * we should ALWAYS try to extract an array, NEVER fall back to a single
 * inner object. This prevents the common bug where an array response
 * gets parsed as just its first element.
 */
function extractJsonFromResponse<T>(response: string): T {
  let jsonStr = response.trim();

  // ── Pre-processing: strip markdown code fences ──
  // LLMs often wrap JSON in ```json ... ``` but may forget closing ```
  // Strip opening fence
  const openedWithFence = jsonStr.match(/^```(?:json)?\s*\n?/);
  if (openedWithFence) {
    jsonStr = jsonStr.substring(openedWithFence[0].length);
    // Strip closing fence if present
    jsonStr = jsonStr.replace(/\n?```\s*$/, '');
    jsonStr = jsonStr.trim();
    console.log(`[ZAI JSON] Stripped code fences, remaining: ${jsonStr.length} chars, starts with: ${jsonStr.substring(0, 20)}`);
  }

  // Strategy 1: Direct parse (fast path)
  try {
    const result = JSON.parse(jsonStr);
    console.log(`[ZAI JSON] Strategy 1 (direct parse) succeeded: ${Array.isArray(result) ? `array[${result.length}]` : typeof result}`);
    return result as T;
  } catch {}

  // Strategy 2: Extract balanced JSON from the start character
  // Determine whether we're looking for an array or object based on first char
  const firstJsonChar = findFirstJsonChar(jsonStr);
  if (firstJsonChar) {
    const extracted = extractBalancedFromStart(jsonStr, firstJsonChar.idx, firstJsonChar.char);
    if (extracted) {
      try {
        const result = JSON.parse(extracted);
        console.log(`[ZAI JSON] Strategy 2 (balanced extraction) succeeded: ${Array.isArray(result) ? `array[${result.length}]` : typeof result}`);
        return result as T;
      } catch {}
    }
  }

  // Strategy 3: Remove common prefixes/suffixes and try again
  const cleaned = jsonStr
    .replace(/^[^[\{]*/, '')  // Remove text before first [ or {
    .replace(/[\]\}][^]\}]*$/, '') // Remove text after last ] or }
    .trim();
  if (cleaned && cleaned !== jsonStr) {
    try {
      const result = JSON.parse(cleaned);
      console.log(`[ZAI JSON] Strategy 3 (cleaned) succeeded: ${Array.isArray(result) ? `array[${result.length}]` : typeof result}`);
      return result as T;
    } catch {}
  }

  // Strategy 4: Fix common LLM JSON mistakes (trailing commas, single quotes)
  const fixed = cleaned || jsonStr;
  try {
    const normalized = fixed
      .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas before } or ]
      .replace(/'/g, '"')              // Replace single quotes with double quotes
      .replace(/(\w+)\s*:/g, '"$1":'); // Add quotes around unquoted keys
    const result = JSON.parse(normalized);
    console.log(`[ZAI JSON] Strategy 4 (normalized) succeeded: ${Array.isArray(result) ? `array[${result.length}]` : typeof result}`);
    return result as T;
  } catch {}

  // Strategy 5: Try to repair truncated JSON by closing open brackets
  const repaired = repairTruncatedJson(cleaned || jsonStr);
  if (repaired) {
    try {
      const result = JSON.parse(repaired);
      console.log(`[ZAI JSON] Strategy 5 (repaired) succeeded: ${Array.isArray(result) ? `array[${result.length}]` : typeof result}`);
      return result as T;
    } catch {}
  }

  // Strategy 6: Last resort — try regex code block extraction (handles edge cases)
  const codeBlockMatch = response.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const result = JSON.parse(codeBlockMatch[1].trim());
      console.log(`[ZAI JSON] Strategy 6 (code block regex) succeeded: ${Array.isArray(result) ? `array[${result.length}]` : typeof result}`);
      return result as T;
    } catch {}
  }

  console.error(`[ZAI JSON] ALL strategies failed. Response length: ${response.length}`);
  console.error(`[ZAI JSON] First 100 chars: ${response.substring(0, 100)}`);
  console.error(`[ZAI JSON] Last 100 chars: ${response.substring(response.length - 100)}`);
  throw new Error('Failed to parse AI response as JSON. The AI returned an unparseable response.');
}

/**
 * Find the first JSON-relevant character ([ or {) in the string,
 * returning both the character and its position.
 */
function findFirstJsonChar(text: string): { char: '[' | '{'; idx: number } | null {
  const arrIdx = text.indexOf('[');
  const objIdx = text.indexOf('{');
  
  if (arrIdx === -1 && objIdx === -1) return null;
  if (arrIdx === -1) return { char: '{', idx: objIdx };
  if (objIdx === -1) return { char: '[', idx: arrIdx };
  
  // Return whichever comes first — this determines the top-level structure
  return arrIdx < objIdx ? { char: '[', idx: arrIdx } : { char: '{', idx: objIdx };
}

/**
 * Extract balanced JSON starting from a known start character.
 * Properly tracks BOTH [ ] and { } nesting.
 * 
 * IMPORTANT: This only extracts from the given start character.
 * It does NOT fall back to inner objects if the outer structure
 * is unbalanced (which prevents the bug where an array response
 * gets parsed as just its first element).
 */
function extractBalancedFromStart(text: string, startIdx: number, startChar: '[' | '{'): string | null {
  const depthStack: string[] = [startChar]; // Start with the opening bracket
  let inString = false;
  let escapeNext = false;

  for (let i = startIdx + 1; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '[' || char === '{') {
      depthStack.push(char);
    } else if (char === ']' || char === '}') {
      const expectedOpen = char === ']' ? '[' : '{';
      if (depthStack.length > 0 && depthStack[depthStack.length - 1] === expectedOpen) {
        depthStack.pop();
      } else {
        // Mismatched bracket — could be from unescaped content in strings
        // Skip it rather than breaking
        continue;
      }

      if (depthStack.length === 0) {
        return text.substring(startIdx, i + 1);
      }
    }
  }

  // If we have unclosed brackets, the JSON was truncated
  // Return null to let repairTruncatedJson handle it
  return null;
}

/**
 * Attempt to repair truncated JSON by closing open brackets.
 * Uses balanced bracket tracking to close in the correct order.
 * 
 * This handles the common case where the LLM's response is cut off
 * mid-value, mid-key, or mid-string due to output token limits.
 */
function repairTruncatedJson(text: string): string | null {
  // Find the start of JSON
  const firstChar = findFirstJsonChar(text);
  if (!firstChar) return null;

  const jsonPart = text.substring(firstChar.idx);
  
  // Walk through the JSON to track brackets AND find the last safe truncation point
  const depthStack: string[] = [];
  let inString = false;
  let escapeNext = false;
  
  // Track the position of the last complete value end
  // A "safe point" is after a complete JSON value (closed string, number, boolean, null, array, or object)
  let lastSafePoint = -1;
  
  for (let i = 0; i < jsonPart.length; i++) {
    const char = jsonPart[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      if (inString) {
        // Closing a string — mark this as a safe point
        inString = false;
        lastSafePoint = i + 1;
      } else {
        inString = true;
      }
      continue;
    }

    if (inString) continue;

    if (char === '[' || char === '{') {
      depthStack.push(char);
    } else if (char === ']' || char === '}') {
      const expectedOpen = char === ']' ? '[' : '{';
      if (depthStack.length > 0 && depthStack[depthStack.length - 1] === expectedOpen) {
        depthStack.pop();
        // After closing a bracket, this is a safe point
        lastSafePoint = i + 1;
      }
    } else if (char === ',' || char === ':') {
      // After a comma or colon, the previous value was complete
      // But we need the value after it too, so don't mark as safe
    } else if (char === 'n' && jsonPart.substring(i, i + 4) === 'null') {
      lastSafePoint = i + 4;
    } else if (char === 't' && jsonPart.substring(i, i + 4) === 'true') {
      lastSafePoint = i + 4;
    } else if (char === 'f' && jsonPart.substring(i, i + 5) === 'false') {
      lastSafePoint = i + 5;
    } else if (/[0-9\-]/.test(char)) {
      // Start of a number — find the end
      let numEnd = i + 1;
      while (numEnd < jsonPart.length && /[0-9.eE+\-]/.test(jsonPart[numEnd])) {
        numEnd++;
      }
      lastSafePoint = numEnd;
    }
  }

  if (depthStack.length === 0) return null; // Already balanced, repair won't help

  // If we found a safe truncation point, use it
  let repairable: string;
  if (lastSafePoint > 0) {
    repairable = jsonPart.substring(0, lastSafePoint);
    // Remove trailing comma after the last complete value
    repairable = repairable.replace(/,\s*$/, '');
    console.log(`[ZAI JSON Repair] Truncated at safe point ${lastSafePoint}/${jsonPart.length} (saved ${lastSafePoint} chars of ${jsonPart.length})`);
  } else {
    // No safe point found — try aggressive cleanup
    repairable = jsonPart.trimEnd();
    // Remove incomplete key-value pairs
    repairable = repairable.replace(/"[^"]*"\s*:\s*$/, '');   // "key": (incomplete value)
    repairable = repairable.replace(/"[^"]*"\s*:\s*"[^"]*$/, ''); // "key": "incomplete string
    // Remove trailing incomplete content
    repairable = repairable.replace(/,\s*$/, '');              // Trailing comma
    repairable = repairable.replace(/"([^"\\]*)$/, '');        // Unclosed string (remove it)
    repairable = repairable.replace(/[\[{,]\s*$/, '');         // Open bracket/comma
  }

  // Recalculate depth stack for the repairable content
  const newDepthStack: string[] = [];
  let newInString = false;
  let newEscapeNext = false;
  for (let i = 0; i < repairable.length; i++) {
    const char = repairable[i];
    if (newEscapeNext) { newEscapeNext = false; continue; }
    if (char === '\\') { newEscapeNext = true; continue; }
    if (char === '"') { newInString = !newInString; continue; }
    if (newInString) continue;
    if (char === '[' || char === '{') newDepthStack.push(char);
    else if (char === ']' || char === '}') {
      const expected = char === ']' ? '[' : '{';
      if (newDepthStack.length > 0 && newDepthStack[newDepthStack.length - 1] === expected) {
        newDepthStack.pop();
      }
    }
  }

  // Close remaining open brackets in reverse order
  const closingBrackets = newDepthStack.reverse().map((open) => (open === '[' ? ']' : '}')).join('');
  const repaired = repairable + closingBrackets;

  try {
    JSON.parse(repaired);
    console.log(`[ZAI] Successfully repaired truncated JSON (truncated to ${repairable.length} chars, added ${closingBrackets.length} closing brackets)`);
    return repaired;
  } catch {
    // If the safe-point approach failed, try one more time with more aggressive cleanup
    // Remove everything after the last complete object in the array
    const lastObjEnd = repairable.lastIndexOf('}');
    if (lastObjEnd > 0 && firstChar.char === '[') {
      const aggressiveRepair = repairable.substring(0, lastObjEnd + 1);
      // Recalculate brackets for aggressive repair
      const aggressiveDepthStack: string[] = [];
      let agInString = false;
      let agEscape = false;
      for (let i = 0; i < aggressiveRepair.length; i++) {
        const char = aggressiveRepair[i];
        if (agEscape) { agEscape = false; continue; }
        if (char === '\\') { agEscape = true; continue; }
        if (char === '"') { agInString = !agInString; continue; }
        if (agInString) continue;
        if (char === '[' || char === '{') aggressiveDepthStack.push(char);
        else if (char === ']' || char === '}') {
          const exp = char === ']' ? '[' : '{';
          if (aggressiveDepthStack.length > 0 && aggressiveDepthStack[aggressiveDepthStack.length - 1] === exp) {
            aggressiveDepthStack.pop();
          }
        }
      }
      const aggressiveClosing = aggressiveDepthStack.reverse().map((o) => (o === '[' ? ']' : '}')).join('');
      const aggressiveRepaired = aggressiveRepair + aggressiveClosing;
      try {
        JSON.parse(aggressiveRepaired);
        console.log(`[ZAI] Successfully repaired truncated JSON (aggressive: truncated to last complete object at ${lastObjEnd + 1} chars, added ${aggressiveClosing.length} closing brackets)`);
        return aggressiveRepaired;
      } catch {}
    }
    
    console.error(`[ZAI JSON Repair] All repair attempts failed`);
    return null;
  }
}
