const { sendOutput } = require("./index.js")

// ambil argumen dari command line
const nomor = process.argv[2]
const pesan = process.argv.slice(3).join(" ")

if (!nomor || !pesan) {
  console.error("❌ Format salah. Contoh: node bridge.js 62858xxxxx 'Halo'")
  process.exit(1)
}

sendOutput(pesan, nomor)
