/**
 * Server-Sent Events (SSE) service for real-time client notifications.
 * Like Madlan's live update feel — when admin updates a plot, all connected
 * clients see the change without refreshing.
 *
 * Features:
 * - Connection limits (global + per-IP) to prevent resource exhaustion
 * - Monotonic event IDs for Last-Event-ID reconnection (SSE spec §9.2)
 * - Configurable retry directive (controls browser reconnect interval)
 * - Event history buffer for replaying missed events on reconnect
 */

const MAX_CLIENTS = 200
const MAX_PER_IP = 5

// Reconnection interval (ms) sent via `retry:` directive.
// Browser's EventSource uses this as the delay before auto-reconnecting.
// Default browser value is 3000ms which is too aggressive for our use case —
// 10s balances freshness vs server load during outages.
const RETRY_MS = 10_000

// Monotonic event ID counter — survives process lifetime (resets on restart).
// Clients send Last-Event-ID on reconnect so we can replay missed events.
let eventIdCounter = 0

// Circular buffer of recent events for replay on reconnect.
// Stores the last N events so clients that reconnect within a window
// can catch up without a full page refresh. Like Google Docs' OT buffer.
const EVENT_HISTORY_SIZE = 50
const eventHistory = [] // { id, data }

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

/**
 * Replay missed events to a reconnecting client.
 * Called when the client sends Last-Event-ID header (browser does this automatically).
 * Only replays events newer than the given ID from our circular buffer.
 * @param {Response} res - Express response object
 * @param {string|number} lastEventId - The Last-Event-ID from the reconnecting client
 */
export function replayMissedEvents(res, lastEventId) {
  const lastId = parseInt(lastEventId, 10)
  if (!isFinite(lastId)) return

  // Find events newer than the client's last seen ID
  const missed = eventHistory.filter(e => e.id > lastId)
  for (const event of missed) {
    try {
      res.write(`id: ${event.id}\ndata: ${event.data}\n\n`)
    } catch {
      // Client already disconnected
      break
    }
  }
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
 * Each event gets a monotonic ID for Last-Event-ID reconnection support.
 * Events are stored in a circular buffer so reconnecting clients can replay missed ones.
 * @param {string} type - Event type (e.g. 'plot_updated', 'plot_created', 'lead_created')
 * @param {object} payload - Additional data to include
 */
export function broadcastEvent(type, payload = {}) {
  const id = ++eventIdCounter
  const data = JSON.stringify({ type, ...payload, ts: Date.now() })

  // Store in circular history buffer for reconnection replay
  eventHistory.push({ id, data })
  if (eventHistory.length > EVENT_HISTORY_SIZE) {
    eventHistory.shift()
  }

  // Broadcast with event ID — enables browser's Last-Event-ID on reconnect
  const message = `id: ${id}\ndata: ${data}\n\n`
  for (const client of clients) {
    try {
      client.write(message)
    } catch {
      clients.delete(client)
    }
  }
}

/**
 * Get the retry interval for SSE connections (used by the /api/events endpoint).
 * @returns {number} Retry interval in milliseconds
 */
export function getRetryMs() {
  return RETRY_MS
}

export function closeAll() {
  stopKeepalive()
  for (const client of clients) {
    try { client.end() } catch {}
  }
  clients.clear()
}

/**
 * SSE keepalive heartbeat — prevents proxy/LB/CDN from killing idle connections.
 * Sends a comment ping (`:keepalive`) every 25 seconds. This is below Nginx's
 * default `proxy_read_timeout` (60s) and Cloudflare's idle timeout (100s).
 * SSE spec says lines starting with `:` are comments and ignored by EventSource.
 * Without this, connections die silently on any reverse proxy, making real-time
 * updates appear to work locally but fail in production behind Nginx/Cloudflare.
 */
let keepaliveTimer = null

export function startKeepalive(intervalMs = 25_000) {
  if (keepaliveTimer) return
  keepaliveTimer = setInterval(() => {
    const dead = []
    for (const client of clients) {
      try {
        client.write(':keepalive\n\n')
      } catch {
        dead.push(client)
      }
    }
    // Clean up dead connections discovered during keepalive
    for (const client of dead) {
      removeClient(client)
    }
  }, intervalMs)
  keepaliveTimer.unref()
}

export function stopKeepalive() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer)
    keepaliveTimer = null
  }
}
