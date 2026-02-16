import { api } from './client.js'

export function sendChatMessage(sessionKey, plotId, message) {
  return api.post('/chat', { session_key: sessionKey, plot_id: plotId, message })
}
