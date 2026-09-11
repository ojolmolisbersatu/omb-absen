/**
 * OMB ABSENSI V1 — Upload Foto Absensi ke Google Drive
 * ======================================================
 * Cara pakai:
 * 1. Buka https://script.google.com -> New project.
 * 2. Hapus isi default, paste seluruh kode ini.
 * 3. Ganti FOLDER_ID dan SECRET_KEY di bawah (lihat petunjuk masing-masing).
 * 4. Deploy -> New deployment -> pilih tipe "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy URL Web App yang diberikan (formatnya https://script.google.com/macros/s/XXXX/exec)
 *    lalu tempel ke js/drive-upload.js pada frontend (GAS_WEB_APP_URL).
 */

// ID folder Google Drive tempat foto absensi disimpan.
// Cara dapat: buka folder di Drive, lihat URL-nya:
// https://drive.google.com/drive/folders/INI_ADALAH_FOLDER_ID
const FOLDER_ID = 'PASTE_FOLDER_ID_DI_SINI';

// Kunci rahasia sederhana supaya tidak sembarang orang bisa upload ke script ini.
// Bebas isi string apa saja (acak, panjang), lalu nilai yang SAMA persis harus
// dipasang juga di frontend (js/drive-upload.js -> UPLOAD_SECRET).
const SECRET_KEY = 'GANTI_DENGAN_STRING_RAHASIA_ACAK';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (!body.secret || body.secret !== SECRET_KEY) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }
    if (!body.photoBase64 || !body.fileName) {
      return jsonResponse({ ok: false, error: 'Data foto tidak lengkap' });
    }

    const rootFolder = DriveApp.getFolderById(FOLDER_ID);
    const eventFolder = getOrCreateSubfolder(rootFolder, body.folderName || 'Lainnya');

    // photoBase64 dikirim dalam format data URL: "data:image/jpeg;base64,xxxxx"
    const base64Data = body.photoBase64.split(',').pop();
    const mimeType = (body.photoBase64.match(/^data:(.*?);base64,/) || [])[1] || 'image/jpeg';
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, body.fileName);

    const file = eventFolder.createFile(blob);
    // Supaya link foto bisa langsung dibuka admin dari dashboard tanpa perlu login Drive.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return jsonResponse({
      ok: true,
      file_id: file.getId(),
      file_url: file.getUrl(),
      view_url: 'https://drive.google.com/uc?id=' + file.getId(),
      folder_url: eventFolder.getUrl()
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

/**
 * Cari folder dengan nama tertentu di dalam parent; kalau belum ada, buat baru.
 * Ini yang membuat foto otomatis terkumpul per-event tanpa perlu buat folder manual.
 */
function getOrCreateSubfolder(parent, name) {
  const safeName = String(name).trim().replace(/[\\/]/g, '-').slice(0, 120) || 'Tanpa Nama Event';
  const existing = parent.getFoldersByName(safeName);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(safeName);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
