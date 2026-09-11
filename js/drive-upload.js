// OMB ABSENSI V1 - Upload foto absensi ke Google Drive via Google Apps Script Web App
// Isi kedua nilai ini setelah setup Apps Script selesai (lihat google-apps-script/README.md)
const GAS_WEB_APP_URL = 'PASTE_URL_WEB_APP_DI_SINI';
const UPLOAD_SECRET = 'PASTE_SECRET_KEY_DI_SINI';

/**
 * Upload foto (File object dari <input type="file">) ke Google Drive.
 * folderName: nama event, dipakai untuk mengelompokkan foto per-event otomatis.
 * Return: { ok, file_id, file_url, view_url, folder_url } atau { ok:false, error }
 */
async function uploadPhotoToDrive(file, fileNamePrefix, folderName) {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('PASTE_')) {
    return { ok: false, error: 'Upload foto belum dikonfigurasi (GAS_WEB_APP_URL kosong).' };
  }
  const base64 = await fileToBase64(file);
  const fileName = `${fileNamePrefix || 'absensi'}-${Date.now()}.jpg`;

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      // text/plain menghindari CORS preflight OPTIONS yang tidak didukung Apps Script Web App
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: UPLOAD_SECRET, photoBase64: base64, fileName, folderName: folderName || 'Lainnya' })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, error: 'Gagal mengunggah foto: ' + err.message };
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.uploadPhotoToDrive = uploadPhotoToDrive;
