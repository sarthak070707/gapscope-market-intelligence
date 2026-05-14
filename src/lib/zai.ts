import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function webSearch(query: string, num: number = 10) {
  const zai = await getZAI();
  return zai.functions.invoke('web_search', { query, num });
}

export async function readPage(url: string) {
  const zai = await getZAI();
  return zai.functions.invoke('page_reader', { url });
}

export async function chatCompletion(messages: { role: string; content: string }[]) {
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages: messages as any,
    thinking: { type: 'disabled' },
  });
  return completion.choices[0]?.message?.content || '';
}

/**
 * Generate a structured JSON response from the LLM.
 * 
 * Features:
 * - Robust JSON extraction from various response formats
 * - Multiple parsing strategies with fallbacks
 * - Handles markdown code blocks, partial JSON, and malformed responses
 */
export async function generateStructuredResponse<T>(
  systemPrompt: string,
  userMessage: string,
  schemaDescription: string
): Promise<T> {
  const fullMessage = `${userMessage}\n\nIMPORTANT: ${schemaDescription}\n\nRespond with valid JSON only. No markdown, no code blocks, just raw JSON.`;
  
  const response = await chatCompletion([
    { role: 'assistant', content: systemPrompt },
    { role: 'user', content: fullMessage },
  ]);

  if (!response || !response.trim()) {
    throw new Error('AI returned an empty response');
  }

  return extractJsonFromResponse<T>(response);
}

/**
 * Multi-strategy JSON extractor.
 * Tries multiple approaches to extract valid JSON from LLM responses.
 */
function extractJsonFromResponse<T>(response: string): T {
  let jsonStr = response.trim();
  
  // Strategy 1: Direct parse (fast path)
  try {
    return JSON.parse(jsonStr) as T;
  } catch {}
  
  // Strategy 2: Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {}
  }
  
  // Strategy 3: Find JSON object or array boundary with balanced brackets
  const extracted = findBalancedJson(jsonStr);
  if (extracted) {
    try {
      return JSON.parse(extracted) as T;
    } catch {}
  }

  // Strategy 4: Remove common prefixes/suffixes and try again
  const cleaned = jsonStr
    .replace(/^[^[\{]*/, '')  // Remove text before first [ or {
    .replace(/[^\]]*$/, '')    // Remove text after last ] or }
    .trim();
  if (cleaned && cleaned !== jsonStr.trim()) {
    try {
      return JSON.parse(cleaned) as T;
    } catch {}
  }

  // Strategy 5: Fix common LLM JSON mistakes (trailing commas, single quotes)
  const fixed = cleaned || jsonStr;
  try {
    const normalized = fixed
      .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas before } or ]
      .replace(/'/g, '"')              // Replace single quotes with double quotes
      .replace(/(\w+)\s*:/g, '"$1":'); // Add quotes around unquoted keys
    return JSON.parse(normalized) as T;
  } catch {}

  throw new Error('Failed to parse AI response as JSON. The AI returned an unparseable response.');
}

/**
 * Find a balanced JSON structure in the response string.
 * Handles nested objects and arrays.
 */
function findBalancedJson(text: string): string | null {
  // Try to find a JSON array first
  const arrayStart = text.indexOf('[');
  if (arrayStart !== -1) {
    const result = extractBalanced(text, arrayStart, '[', ']');
    if (result) return result;
  }
  
  // Try to find a JSON object
  const objStart = text.indexOf('{');
  if (objStart !== -1) {
    const result = extractBalanced(text, objStart, '{', '}');
    if (result) return result;
  }
  
  return null;
}

function extractBalanced(text: string, startIdx: number, openChar: string, closeChar: string): string | null {
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIdx; i < text.length; i++) {
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
    
    if (char === openChar) depth++;
    if (char === closeChar) depth--;
    
    if (depth === 0) {
      return text.substring(startIdx, i + 1);
    }
  }
  
  // If we have an unbalanced but potentially valid prefix, try it
  if (depth > 0) {
    const partial = text.substring(startIdx);
    // Try closing it ourselves
    const closing = openChar === '[' ? ']'.repeat(depth) : '}'.repeat(depth);
    try {
      JSON.parse(partial + closing);
      return partial + closing;
    } catch {}
  }
  
  return null;
}
