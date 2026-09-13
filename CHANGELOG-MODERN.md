# OMB Absensi V1 — App Style Update

- Halaman sesi absensi dibuat seperti satu halaman aplikasi: tanpa header hijau.
- Judul acara, identitas anggota, dan verifikasi lokasi berada dalam satu card utama.
- Nomor langkah 1/2/3 dihilangkan.
- Verifikasi wajah tetap menjadi langkah berikutnya setelah lokasi valid.
- Countdown angka di kamera dihilangkan.
- Saat wajah valid, border hijau memiliki animasi berputar seperti proses deteksi.
- Hold internal verifikasi wajah menjadi 3 detik tanpa menampilkan angka detik.
- Tombol KIRIM ABSENSI menampilkan panel loading: anggota → lokasi → foto → menyimpan ke sistem.
- Loading mengikuti proses upload Drive dan insert Supabase yang sebenarnya, tanpa delay palsu.
