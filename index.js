// index.js
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'

// Tempat nyimpen session (multi-file)
const SESSION_DIR = './auth_state'

async function startBot() {
    // Ambil versi WA terbaru
    const { version } = await fetchLatestBaileysVersion()

    // Multi-file auth
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true // Bisa dimatikan kalau pakai session lama
    })

    // Simpan state kalau berubah
    sock.ev.on('creds.update', saveCreds)

    // Reconnect otomatis
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            console.log('Terputus, reconnecting...', reason)
            if (reason !== DisconnectReason.loggedOut) {
                startBot() // reconnect otomatis
            } else {
                console.log('Logout permanen, hapus folder auth_state kalau mau login lagi')
            }
        } else if(connection === 'open') {
            console.log('Bot terhubung ke WhatsApp!')
        }
    })

    // Event message masuk
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        if(text?.toLowerCase() === 'ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Pong!' })
        }
    })
}

startBot()
