import subprocess

def kirim_ke_wa(teks):
    nomor = "6287884358475"  # ganti dengan nomor tujuan
    subprocess.run(["node", "bridge.js", nomor, teks])

# contoh penggunaan
print("Mulai proses Python...")
kirim_ke_wa("Halo jir ✅ ini output dari Python di Termux!")

for i in range(3):
    msg = f"Loop ke-{i+1}"
    print(msg)
    kirim_ke_wa(msg)

print("Selesai.")
