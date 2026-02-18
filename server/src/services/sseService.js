/**
 * Server-Sent Events (SSE) service for real-time client notifications.
 * Like Madlan's live update feel — when admin updates a plot, all connected
 * clients see the change without refreshing.
 */

const clients = new Set()

export function addClient(res) {
  clients.add(res)
}

export function removeClient(res) {
  clients.delete(res)
}

export function getClientCount() {
  return clients.size
}

/**
 * Broadcast an event to all connected SSE clients.
 * @param {string} type - Event type (e.g. 'plot_updated', 'plot_created', 'lead_created')
 * @param {object} payload - Additional data to include
 */
export function broadcastEvent(type, payload = {}) {
  const data = JSON.stringify({ type, ...payload, ts: Date.now() })
  for (const client of clients) {
    try {
      client.write(`data: ${data}\n\n`)
    } catch {
      clients.delete(client)
    }
  }
}

export function closeAll() {
  for (const client of clients) {
    try { client.end() } catch {}
  }
  clients.clear()
}
