# Setup Google Apps Script — Upload Foto Absensi ke Drive

## 1. Siapkan folder Drive induk
1. Buka Google Drive, buat folder baru, misalnya **"OMB Absensi - Foto"**.
   Ini folder **induk** saja — sub-folder per event akan **dibuat otomatis**
   oleh script setiap ada event baru, kamu tidak perlu bikin manual satu-satu.
2. Buka folder itu, lihat URL di address bar:
   `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp...`
3. Bagian setelah `/folders/` itu adalah **FOLDER_ID** kamu.

## 2. Buat script
1. Buka https://script.google.com → **New project**.
2. Beri nama project, misal "OMB Absensi Upload".
3. Hapus isi default di editor, lalu paste seluruh isi file `Code.gs` yang sudah disediakan.
4. Ganti dua baris ini di paling atas:
   ```js
   const FOLDER_ID = 'PASTE_FOLDER_ID_DI_SINI';   // dari langkah 1
   const SECRET_KEY = 'GANTI_DENGAN_STRING_RAHASIA_ACAK'; // bebas, buat string acak
   ```
   Simpan `SECRET_KEY` ini baik-baik — nilai yang sama persis nanti dipasang juga
   di file frontend `js/drive-upload.js`.

## 3. Deploy sebagai Web App
1. Klik **Deploy → New deployment**.
2. Klik ikon gear di sebelah "Select type" → pilih **Web app**.
3. Isi:
   - **Execute as**: `Me (email kamu)`
   - **Who has access**: `Anyone`
4. Klik **Deploy**.
5. Google akan minta izin akses Drive — klik **Authorize access**, pilih akun Google-mu,
   lalu klik **Advanced → Go to (nama project) (unsafe) → Allow**.
   (Ini normal untuk script buatan sendiri yang belum diverifikasi Google — aman karena
   ini script milikmu sendiri.)
6. Setelah deploy selesai, copy **Web app URL** yang muncul, formatnya:
   `https://script.google.com/macros/s/AKfycb..................../exec`

## 4. Hubungkan ke frontend
Buka `js/drive-upload.js` di project OMB Absensi, isi:
```js
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/....../exec';
const UPLOAD_SECRET = 'STRING_RAHASIA_YANG_SAMA_DENGAN_SECRET_KEY_DI_ATAS';
```

## 5. Testing
Setelah semua terpasang, coba absen dari halaman member — foto seharusnya otomatis
masuk ke **sub-folder bernama sesuai event** (misal "Jalan Sehat - 2026-09-20") di
dalam folder induk yang kamu buat di langkah 1. Sub-folder ini dibuat otomatis oleh
script, kamu tidak perlu membuatnya manual. Link foto tersimpan di kolom
`photo_drive_url` pada tabel `attendance`.

## Catatan keamanan
- Folder foto tetap privat secara default (tidak publik ke semua orang), tapi setiap
  file yang diupload otomatis diset "Anyone with link can view" agar admin bisa
  membuka link fotonya langsung dari dashboard tanpa perlu login Drive kamu.
- `SECRET_KEY` mencegah orang iseng yang menemukan URL Web App kamu untuk mengirim
  upload sembarangan — bukan proteksi tingkat tinggi, tapi cukup untuk kebutuhan ini.
- Jika suatu saat mau ganti kunci, update di dua tempat: `Code.gs` (lalu **Deploy → Manage
  deployments → Edit → New version**) dan `js/drive-upload.js`.
