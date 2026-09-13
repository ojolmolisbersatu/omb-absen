# OMB Absensi V1 — UI Fix

- Alur member dibuat satu layar: pilih anggota → verifikasi lokasi → verifikasi wajah → kirim.
- Tidak memakai `scrollIntoView` dan bagian wajah disembunyikan sampai lokasi valid.
- Kamera tidak mirror.
- Menghapus ketergantungan dynamic import MediaPipe CDN yang menyebabkan `Failed to fetch dynamically imported module`.
- Verifikasi kamera ringan: kamera dibuka, posisi diarahkan, foto otomatis setelah hitung mundur 3 detik.
- Menambahkan pengecekan agar anggota yang sudah absen pada sesi yang sama mendapat tanda **Anda sudah absen di sesi ini**.
