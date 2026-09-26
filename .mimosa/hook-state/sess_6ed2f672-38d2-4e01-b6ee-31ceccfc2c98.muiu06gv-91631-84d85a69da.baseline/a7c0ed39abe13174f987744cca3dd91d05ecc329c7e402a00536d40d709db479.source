// Minimal OpenAI-compatible chat-completions client with tool calling.
// Works with any provider that speaks this protocol (OpenAI, GLM, Groq,
// Ollama, vLLM...).

export type ToolCall = {
  id: string
  type: 'function'
  function: {name: string; arguments: string}
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export type OpenAITool = {
  type: 'function'
  function: {name: string; description: string; parameters: Record<string, unknown>}
}

export type LlmConfig = {agentBaseUrl: string; agentApiKey: string; agentModel: string}

export async function chat(cfg: LlmConfig, messages: ChatMessage[], tools: OpenAITool[]): Promise<ChatMessage> {
  const res = await fetch(`${cfg.agentBaseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: `Bearer ${cfg.agentApiKey}`},
    body: JSON.stringify({
      model: cfg.agentModel,
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? 'auto' : undefined,
    }),
  })
  if (!res.ok) throw new Error(`LLM API ${res.status}: ${(await res.text()).slice(0, 500)}`)
  const json = (await res.json()) as {choices: {message: ChatMessage}[]}
  return json.choices[0].message
}

export function assistantMessage(msg: ChatMessage): ChatMessage {
  return {role: 'assistant', content: msg.content, tool_calls: msg.tool_calls}
}

export function toolResultMessage(callId: string, text: string): ChatMessage {
  return {role: 'tool', tool_call_id: callId, content: text}
}
