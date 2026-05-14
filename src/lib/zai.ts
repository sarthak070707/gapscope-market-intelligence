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

  // Try to extract JSON from the response
  let jsonStr = response.trim();
  
  // Remove markdown code blocks if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    // Try to find JSON object or array in the response
    const objectMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objectMatch) {
      return JSON.parse(objectMatch[1]) as T;
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}
