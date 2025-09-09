// index.js
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeInMemoryStore,
  delay
} from '@whiskeysockets/baileys'
import pino from 'pino'

const logger = pino({ level: 'info' })
const store = makeInMemoryStore({ logger })

// backoff config
const MIN_RECONNECT_MS = 2000
const MAX_RECONNECT_MS = 60_000

let socket // current socket instance
let reconnectAttempts = 0

async function startSock() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    // create socket
    socket = makeWASocket({
      logger,
      printQRInTerminal: true,
      auth: state,
      // kamu bisa set version di sini kalo perlu
    })

    // bind store events (optional, useful)
    store.bind(socket.ev)

    // save credentials when updated
    socket.ev.on('creds.update', saveCreds)

    // connection updates
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update
      logger.info({ connection, isNewLogin })

      if (qr) {
        logger.info('QR code received - scan dengan WhatsApp untuk login (hanya awal saja)')
      }

      if (connection === 'open') {
        logger.info('✔ Connected to WhatsApp')
        reconnectAttempts = 0 // reset attempts on successful connect
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error) ? lastDisconnect.error : null
        logger.warn({ msg: 'Connection closed', reason })

        // attempt reconnect logic
        // if lastDisconnect is Boom with statusCode 401/419/428 etc, still try to restart,
        // but if it's an unrecoverable logout you may need to rescan
        const statusCode = reason?.output?.statusCode || reason?.statusCode || null
        logger.info({ statusCode })

        // if WA told us it's a logout (example: 401/403/440-ish) then log and exit or require re-scan.
        // Here kita coba reconnect anyway; kalau memang logout you'll see `isNewLogin` false and QR shown.
        doReconnect('connection.close')
      }
    })

    // optional: listen for messages
    socket.ev.on('messages.upsert', m => {
      // contoh auto-reply simple
      const msg = m.messages[0]
      if (!msg || msg.key?.fromMe) return
      const from = msg.key.remoteJid
      const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim()
      if (!text) return
      logger.info({ from, text })
      // reply simple
      socket.sendMessage(from, { text: `Pesan diterima: ${text}` })
    })

    // generic error handlers
    socket.ev.on('connection.error', e => logger.error({ e }))
    socket.ev.on('creds.update', () => logger.info('creds updated'))

    // keep process alive
    process.on('uncaughtException', (err) => {
      logger.error({ err }, 'uncaughtException - akan restart socket')
      doReconnect('uncaughtException')
    })
    process.on('unhandledRejection', (err) => {
      logger.error({ err }, 'unhandledRejection - akan restart socket')
      doReconnect('unhandledRejection')
    })

    return socket
  } catch (err) {
    logger.error({ err }, 'startSock gagal, coba reconnect dengan backoff')
    doReconnect('start-failed')
  }
}

function doReconnect(trigger='unknown') {
  // jika socket masih ada, destroy dulu
  try { socket?.end?.() } catch (e) { /* ignore */ }
  reconnectAttempts++
  const wait = Math.min(MIN_RECONNECT_MS * (2 ** (reconnectAttempts-1)), MAX_RECONNECT_MS)
  logger.info({ reconnectAttempts, wait, trigger }, 'akan mencoba reconnect dalam ms')
  setTimeout(() => {
    startSock()
  }, wait)
}

// start pertama
startSock()
