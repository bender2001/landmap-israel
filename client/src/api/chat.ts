import { api } from './client'

export interface ChatResponse {
  message: string
  session_key: string
  [key: string]: unknown
}

export function sendChatMessage(sessionKey: string, plotId: string | null, message: string): Promise<ChatResponse> {
  return api.post('/chat', { session_key: sessionKey, plot_id: plotId, message }) as Promise<ChatResponse>
}
