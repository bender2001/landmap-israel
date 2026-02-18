/**
 * Server-Sent Events (SSE) service for real-time client notifications.
 * Like Madlan's live update feel — when admin updates a plot, all connected
 * clients see the change without refreshing.
 *
 * Connection limits:
 * - MAX_CLIENTS: hard cap on total concurrent connections (prevents resource exhaustion)
 * - MAX_PER_IP: per-IP limit (prevents a single client/bot from monopolizing connections)
 */

const MAX_CLIENTS = 200
const MAX_PER_IP = 5

const clients = new Set()
const clientIPs = new Map() // ip -> count

/**
 * Add an SSE client with connection limiting.
 * @param {Response} res - Express response object
 * @param {string} ip - Client IP address (from req.ip)
 * @returns {boolean} true if added, false if rejected (limit reached)
 */
export function addClient(res, ip) {
  // Hard cap: reject if server is at capacity
  if (clients.size >= MAX_CLIENTS) {
    return false
  }

  // Per-IP limit: prevent a single source from opening too many connections
  if (ip) {
    const current = clientIPs.get(ip) || 0
    if (current >= MAX_PER_IP) {
      return false
    }
    clientIPs.set(ip, current + 1)
    res._sseIp = ip // store for cleanup
  }

  clients.add(res)
  return true
}

export function removeClient(res) {
  clients.delete(res)
  // Decrement per-IP counter
  const ip = res._sseIp
  if (ip && clientIPs.has(ip)) {
    const count = clientIPs.get(ip) - 1
    if (count <= 0) {
      clientIPs.delete(ip)
    } else {
      clientIPs.set(ip, count)
    }
  }
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
