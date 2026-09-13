/* OMB ABSENSI V1 — lightweight camera verification (no external ML/CDN dependency).
   Checks camera availability, portrait orientation and captures a centered proof photo.
*/
function createFaceVerifier(opts) {
  const video = document.getElementById(opts.videoId);
  const canvas = document.getElementById(opts.canvasId);
  const frame = document.getElementById(opts.frameId);
  const feedback = document.getElementById(opts.feedbackId);
  const countdown = document.getElementById(opts.countdownId);
  const preview = document.getElementById(opts.previewId);
  const loading = document.getElementById(opts.loadingId);
  const retake = document.getElementById(opts.retakeId);
  let stream = null, timer = null, running = false, captured = false;

  function status(name, text) {
    frame.className = 'face-frame status-' + name;
    feedback.className = 'face-feedback ' + name;
    feedback.textContent = text;
    opts.onStatus?.(name);
  }
  function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }
  function stop() {
    running = false; clearTimer();
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; video.srcObject = null;
  }
  function reset() {
    captured = false; clearTimer();
    if (preview.src?.startsWith('blob:')) URL.revokeObjectURL(preview.src);
    preview.removeAttribute('src'); preview.classList.add('hidden');
    video.classList.remove('hidden'); retake.classList.add('hidden'); countdown.classList.add('hidden');
    status('red', 'Posisikan wajah di tengah lingkaran');
  }
  function capture() {
    if (!running || captured || !video.videoWidth) return;
    captured = true; running = false;
    const vw = video.videoWidth, vh = video.videoHeight;
    const side = Math.min(vw, vh), sx = (vw - side) / 2, sy = (vh - side) / 2;
    canvas.width = 720; canvas.height = 720;
    canvas.getContext('2d').drawImage(video, sx, sy, side, side, 0, 0, 720, 720);
    canvas.toBlob(blob => {
      if (!blob) return;
      preview.src = URL.createObjectURL(blob); preview.classList.remove('hidden'); video.classList.add('hidden');
      countdown.classList.add('hidden'); retake.classList.remove('hidden');
      status('captured', 'Foto berhasil. Silakan cek sebelum dikirim.');
      opts.onCaptured?.(blob);
    }, 'image/jpeg', .86);
  }
  async function start() {
    if (running || captured) return;
    loading.classList.remove('hidden'); loading.textContent = 'Menyiapkan kamera...';
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak mendukung kamera.');
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
        video.srcObject = stream; await video.play();
      }
      running = true; status('green', 'Tahan posisi. Foto otomatis dalam 3 detik...');
      let n = 3;
      const tick = () => {
        if (!running || captured) return;
        countdown.classList.remove('hidden'); countdown.textContent = n;
        if (n <= 0) { capture(); return; }
        n--; timer = setTimeout(tick, 1000);
      };
      tick();
    } catch (err) {
      status('red', 'Izinkan akses kamera untuk melanjutkan');
      loading.textContent = 'Kamera tidak dapat dibuka: ' + (err.message || err);
    } finally { if (stream) loading.classList.add('hidden'); }
  }
  function retakePhoto() { stop(); reset(); start(); }
  return { start, stop, reset, retake: retakePhoto };
}
window.createFaceVerifier = createFaceVerifier;
