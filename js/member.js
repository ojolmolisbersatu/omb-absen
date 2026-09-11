/* OMB ABSENSI V1 REDESIGN — Member flow */
const $ = (id) => document.getElementById(id);

let sessionData = null;
let eventData = null;
let pickedMember = null;
let gpsResultData = null;
let photoFile = null;
let faceVerifier = null;

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function setStepState(stepId, state) {
  const el = $(stepId);
  if (!el) return;
  el.classList.toggle('is-locked', state === 'locked');
  el.classList.toggle('done', state === 'done');
}

function setFlowStatus(id, text, type='') {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'flow-status' + (type ? ' ' + type : '');
}

function updateSubmitState() {
  const ready = !!(pickedMember && gpsResultData?.valid && photoFile);
  $('submitBtn').disabled = !ready;
  const summary = $('submitSummary');
  if (ready) {
    summary.classList.add('ready');
    summary.innerHTML = '<span class="summary-dot"></span><div><strong>Semua verifikasi selesai</strong><small>Absensi siap dikirim.</small></div>';
  } else {
    summary.classList.remove('ready');
    summary.innerHTML = '<span class="summary-dot"></span><div><strong>Siap dikirim?</strong><small>Lengkapi anggota, lokasi, dan foto wajah.</small></div>';
  }
}

async function loadSession() {
  const sessionId = new URLSearchParams(location.search).get('session');
  if (!sessionId) return loadActiveSessionList();

  const { data: session, error: err1 } = await supabaseClient
    .from('event_sessions').select('*').eq('id', sessionId).single();

  if (err1 || !session) {
    $('eventTitle').textContent = 'Sesi tidak ditemukan';
    showMessage($('message'), 'Sesi absensi tidak ditemukan atau sudah tidak aktif.', 'error');
    return;
  }

  sessionData = session;
  const { data: ev } = await supabaseClient.from('events').select('*').eq('id', session.event_id).single();
  eventData = ev || null;

  $('eventTitle').textContent = (eventData ? eventData.name : 'Absensi') + ' — ' + session.name;
  $('eventSub').textContent = `${session.location_name || '-'} · Radius ${session.radius_meter ?? '-'} m`;

  if (session.status !== 'active') {
    $('sessionClosed').classList.remove('hidden');
    return;
  }

  $('formArea').classList.remove('hidden');
  setStepState('stepLocation', 'locked');
  setStepState('stepPhoto', 'locked');
}

async function loadActiveSessionList() {
  $('eventTitle').textContent = 'Absensi OMB';
  $('eventSub').textContent = 'Pilih sesi yang sedang berlangsung.';
  $('sessionPicker').classList.remove('hidden');

  const { data: sessionsData, error } = await supabaseClient
    .from('event_sessions').select('*').eq('status', 'active').order('start_time');

  if (error) {
    $('activeSessionList').innerHTML = `<div class="empty">Gagal memuat sesi aktif: ${escapeHtml(error.message)}</div>`;
    return;
  }
  if (!sessionsData?.length) {
    $('activeSessionList').innerHTML = '<div class="empty">Tidak ada sesi absensi yang aktif saat ini.</div>';
    return;
  }

  const eventIds = [...new Set(sessionsData.map((s) => s.event_id))];
  const { data: eventsData } = await supabaseClient.from('events').select('*').in('id', eventIds);
  const eventMap = {};
  (eventsData || []).forEach((e) => (eventMap[e.id] = e));

  $('activeSessionList').innerHTML = sessionsData.map((s) => {
    const ev = eventMap[s.event_id];
    return `<button class="session-choice" type="button" onclick="location.href='?session=${encodeURIComponent(s.id)}'">
      <span class="session-choice-main"><strong>${escapeHtml(ev ? ev.name : 'Event')}</strong><span>${escapeHtml(s.name)}</span></span>
      <span class="session-choice-meta">${escapeHtml(s.location_name || '-')} · ${s.radius_meter ?? '-'} m <b>›</b></span>
    </button>`;
  }).join('');
}

async function searchMember(q) {
  const box = $('searchResults');
  if (!q || q.trim().length < 2) {
    box.innerHTML = '';
    return;
  }

  const safe = q.trim().replace(/[%_]/g, '');
  const { data, error } = await supabaseClient
    .from('anggota_omb_public')
    .select('*')
    .or(`nama.ilike.%${safe}%,nama_panggilan.ilike.%${safe}%,id_anggota.ilike.%${safe}%`)
    .limit(8);

  if (error) {
    box.innerHTML = `<div class="empty">Gagal mencari data: ${escapeHtml(error.message)}</div>`;
    return;
  }

  const results = data || [];
  box.innerHTML = results.length ? results.map((m) =>
    `<button type="button" class="member-item" data-id="${escapeHtml(m.id_anggota)}" data-nama="${escapeHtml(m.nama)}">
      <span><strong>${escapeHtml(m.nama)}</strong>${m.nama_panggilan ? '<small>' + escapeHtml(m.nama_panggilan) + '</small>' : ''}</span>
      <b>${escapeHtml(m.id_anggota)}</b>
    </button>`
  ).join('') : '<div class="empty">Anggota tidak ditemukan.</div>';

  box.querySelectorAll('.member-item').forEach((el) => {
    el.addEventListener('click', () => {
      pickedMember = { id_anggota: el.dataset.id, nama: el.dataset.nama };
      gpsResultData = null;
      photoFile = null;
      renderPickedMember();
      box.innerHTML = '';
      $('memberSearch').value = '';
      setStepState('stepMember', 'done');
      setFlowStatus('memberStatus', 'Terverifikasi', 'ok');
      setStepState('stepLocation', 'ready');
      $('checkLocationBtn').disabled = false;
      $('gpsResult').classList.add('hidden');
      setFlowStatus('locationStatus', 'Siap dicek');
      resetFace();
      updateSubmitState();
      $('stepLocation').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

function renderPickedMember() {
  const box = $('pickedMemberBox');
  if (!pickedMember) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `<div class="picked-member">
    <div><strong>${escapeHtml(pickedMember.nama)}</strong><small>${escapeHtml(pickedMember.id_anggota)}</small></div>
    <button type="button" id="clearMemberBtn">Ganti</button>
  </div>`;
  $('clearMemberBtn').addEventListener('click', () => {
    pickedMember = null;
    gpsResultData = null;
    photoFile = null;
    renderPickedMember();
    setStepState('stepMember', 'ready');
    setFlowStatus('memberStatus', 'Belum dipilih');
    setStepState('stepLocation', 'locked');
    setStepState('stepPhoto', 'locked');
    $('checkLocationBtn').disabled = true;
    $('gpsResult').classList.add('hidden');
    setFlowStatus('locationStatus', 'Menunggu');
    setFlowStatus('faceStatus', 'Menunggu');
    resetFace();
    updateSubmitState();
  });
}

function checkLocation() {
  const resultEl = $('gpsResult');
  const btn = $('checkLocationBtn');
  if (!navigator.geolocation) {
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = '<div class="invalid">Geolocation tidak didukung browser ini.</div>';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Mencari lokasi...';
  setFlowStatus('locationStatus', 'Mencari...', 'loading');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const targetLat = Number(sessionData.latitude);
      const targetLng = Number(sessionData.longitude);
      const radius = Number(sessionData.radius_meter) || 0;
      let distance = null;
      let valid = false;

      if (!Number.isNaN(targetLat) && !Number.isNaN(targetLng)) {
        distance = haversineMeters(latitude, longitude, targetLat, targetLng);
        valid = distance <= radius;
      }

      gpsResultData = { latitude, longitude, accuracy, distance, valid };
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = valid
        ? `<div class="gps-main valid">✓ Lokasi sesuai</div><div class="gps-detail">${Math.round(distance)} m dari titik absensi · akurasi ±${Math.round(accuracy)} m</div>`
        : `<div class="gps-main invalid">✕ Di luar radius absensi</div><div class="gps-detail">${distance == null ? 'Lokasi sesi belum diatur admin.' : Math.round(distance) + ' m dari titik absensi · radius ' + radius + ' m'}</div>`;

      btn.disabled = false;
      btn.textContent = valid ? '📍 Cek ulang lokasi' : '📍 Coba lagi';
      setFlowStatus('locationStatus', valid ? 'Valid' : 'Tidak valid', valid ? 'ok' : 'bad');

      if (valid) {
        setStepState('stepLocation', 'done');
        setStepState('stepPhoto', 'ready');
        setFlowStatus('faceStatus', 'Siap');
        if (!faceVerifier) initFaceVerifier();
      } else {
        setStepState('stepLocation', 'ready');
        setStepState('stepPhoto', 'locked');
        if (faceVerifier) faceVerifier.stop();
      }
      updateSubmitState();
    },
    (err) => {
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `<div class="invalid">✕ Gagal mengambil lokasi: ${escapeHtml(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = '📍 Coba lagi';
      setFlowStatus('locationStatus', 'Gagal', 'bad');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
  );
}

function resetFace() {
  if (faceVerifier) {
    faceVerifier.stop();
    faceVerifier.reset();
  }
  const frame = $('faceFrame');
  if (frame) frame.className = 'face-frame status-red';
  const feedback = $('faceFeedback');
  if (feedback) {
    feedback.className = 'face-feedback red';
    feedback.textContent = 'Arahkan wajah ke dalam lingkaran';
  }
  $('facePreview')?.classList.add('hidden');
  $('faceVideo')?.classList.remove('hidden');
  $('faceCountdown')?.classList.add('hidden');
  $('retakeBtn')?.classList.add('hidden');
  $('faceLoading')?.classList.add('hidden');
  setFlowStatus('faceStatus', 'Menunggu');
  photoFile = null;
  updateSubmitState();
}

function initFaceVerifier() {
  if (faceVerifier) {
    faceVerifier.start();
    return;
  }
  faceVerifier = createFaceVerifier({
    videoId: 'faceVideo',
    canvasId: 'faceCanvas',
    frameId: 'faceFrame',
    feedbackId: 'faceFeedback',
    countdownId: 'faceCountdown',
    previewId: 'facePreview',
    loadingId: 'faceLoading',
    retakeId: 'retakeBtn',
    onStatus: (status) => {
      const map = {
        red: ['Mengarahkan', 'bad'],
        yellow: ['Sesuaikan', 'warn'],
        green: ['Siap', 'ok'],
        captured: ['Foto siap', 'ok']
      };
      const [text, type] = map[status] || ['Menunggu', ''];
      setFlowStatus('faceStatus', text, type);
      setStepState('stepPhoto', status === 'captured' ? 'done' : 'ready');
    },
    onCaptured: (blob) => {
      photoFile = new File([blob], `${pickedMember?.id_anggota || 'absensi'}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      updateSubmitState();
    }
  });
  faceVerifier.start();
}

function showSuccess() {
  const time = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
  $('formArea').innerHTML = `<div class="success-card">
    <div class="success-check">✓</div>
    <div class="eyebrow">ABSENSI TERCATAT</div>
    <h2>Absensi berhasil dikirim</h2>
    <p>Terima kasih, kehadiran Anda sudah tersimpan.</p>
    <div class="receipt">
      <div><span>Nama</span><strong>${escapeHtml(pickedMember.nama)}</strong></div>
      <div><span>ID Anggota</span><strong>${escapeHtml(pickedMember.id_anggota)}</strong></div>
      <div><span>Sesi</span><strong>${escapeHtml(sessionData.name || '-')}</strong></div>
      <div><span>Waktu</span><strong>${escapeHtml(time)}</strong></div>
    </div>
    <button type="button" class="btn full" onclick="location.reload()">Selesai</button>
  </div>`;
}

async function submitAttendance() {
  if (!pickedMember || !gpsResultData?.valid || !photoFile) return;
  const btn = $('submitBtn');
  btn.disabled = true;
  btn.textContent = '⏳ MENGIRIM...';

  try {
    const folderName = eventData ? `${eventData.name} - ${eventData.event_date}` : 'Lainnya';
    const upload = await uploadPhotoToDrive(photoFile, pickedMember.id_anggota, folderName);
    if (!upload.ok) throw new Error(upload.error || 'Upload foto gagal.');

    const payload = {
      event_id: sessionData.event_id,
      session_id: sessionData.id,
      member_id: pickedMember.id_anggota,
      latitude: gpsResultData.latitude,
      longitude: gpsResultData.longitude,
      gps_accuracy: gpsResultData.accuracy,
      distance_meter: gpsResultData.distance,
      location_valid: gpsResultData.valid,
      photo_drive_id: upload.file_id,
      photo_drive_url: upload.view_url || upload.file_url,
      status: 'hadir',
      device_info: navigator.userAgent
    };

    const { error } = await supabaseClient.from('attendance').insert(payload);
    if (error) throw error;
    if (faceVerifier) faceVerifier.stop();
    showSuccess();
  } catch (err) {
    showMessage($('message'), 'Gagal mengirim absensi: ' + (err.message || err), 'error');
    btn.disabled = false;
    btn.textContent = '✓ KIRIM ABSENSI';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  let searchTimer;
  $('memberSearch').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchMember(e.target.value), 250);
  });
  $('checkLocationBtn').addEventListener('click', checkLocation);
  $('submitBtn').addEventListener('click', submitAttendance);
  $('retakeBtn').addEventListener('click', () => {
    photoFile = null;
    if (faceVerifier) faceVerifier.retake();
    updateSubmitState();
  });
});
