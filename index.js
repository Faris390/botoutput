const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys")

const { state, saveState } = useSingleFileAuthState("./session.json")

let sock

async function startBot() {
  sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  })

  // simpan session
  sock.ev.on("creds.update", saveState)

  // status koneksi
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        console.log("⚠️ Koneksi putus, mencoba reconnect...")
        startBot()
      } else {
        console.log("❌ Logout, hapus session.json lalu scan QR ulang")
      }
    } else if (connection === "open") {
      console.log("✅ Bot sudah nyambung")
    }
  })
}

// fungsi kirim pesan
async function sendOutput(teks, nomorTujuan) {
  if (!sock) {
    console.log("❌ Socket belum siap")
    return
  }
  try {
    await sock.sendMessage(nomorTujuan + "@s.whatsapp.net", { text: teks })
    console.log("📤 Pesan terkirim ke", nomorTujuan)
  } catch (e) {
    console.error("Gagal kirim:", e)
  }
}

startBot()

// export biar bisa dipanggil dari bridge.js
module.exports = { sendOutput }
