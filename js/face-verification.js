/* OMB ABSENSI V1 — Face verification UI
   MediaPipe Face Detection via CDN.
   NOT face recognition/biometric matching: only presence, approximate size/position,
   and short-term stability are checked.
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

  let detector = null, stream = null, raf = 0;
  let running = false, captured = false, greenSince = 0;
  let lastStable = null, starting = false;

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

   function setStatus(name, text) {
    frame.className = 'face-frame status-' + name;
    feedback.className = 'face-feedback ' + name;
    feedback.textContent = text;
    opts.onStatus?.(name);
  }

  function resetHold() {
    greenSince = 0;
    lastStable = null;
    countdown.classList.add('hidden');
  }

  function showCountdown(ms) {
    countdown.classList.remove('hidden');
    countdown.textContent = Math.max(0, (2000 - ms) / 1000).toFixed(1);
  }

  function evaluateDetection(detection) {
    if (!detection?.boundingBox) {
      resetHold();
      setStatus('red', 'Arahkan wajah ke dalam lingkaran');
      return;
    }

    const b = detection.boundingBox;
    const fw = video.videoWidth || 1;
    const fh = video.videoHeight || 1;
    const x = b.originX ?? 0, y = b.originY ?? 0;
    const w = b.width ?? 0, h = b.height ?? 0;
    const faceCx = (x + w / 2) / fw;
    const faceCy = (y + h / 2) / fh;
    const sizeRatio = Math.max(w / fw, h / fh);

    if (sizeRatio < 0.35) {
      resetHold();
      setStatus('yellow', 'Wajah terlalu jauh, mendekatlah');
      return;
    }
    if (sizeRatio > 0.70) {
      resetHold();
      setStatus('yellow', 'Wajah terlalu dekat, jauhkan HP');
      return;
    }

    const dx = Math.abs(faceCx - 0.5);
    const dy = Math.abs(faceCy - 0.5);
    if (dx > 0.23 || dy > 0.25) {
      resetHold();
      setStatus('yellow', 'Posisikan wajah di tengah lingkaran');
      return;
    }

    const now = performance.now();
    if (!greenSince) {
      greenSince = now;
      lastStable = { x: faceCx, y: faceCy, s: sizeRatio };
    } else if (
      Math.abs(faceCx - lastStable.x) > 0.045 ||
      Math.abs(faceCy - lastStable.y) > 0.045 ||
      Math.abs(sizeRatio - lastStable.s) > 0.07
    ) {
      greenSince = now;
      lastStable = { x: faceCx, y: faceCy, s: sizeRatio };
    }

    setStatus('green', 'Tahan, jangan gerak-gerak dulu...');
    const elapsed = now - greenSince;
    showCountdown(elapsed);

    if (elapsed >= 2000 && !captured) capturePhoto();
  }

  function drawVideoToCanvas() {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return false;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2, sy = (vh - side) / 2;
    const size = 720;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    return true;
  }

  function capturePhoto() {
    captured = true;
    running = false;
    cancelAnimationFrame(raf);
    if (!drawVideoToCanvas()) { captured = false; running = true; return; }

    canvas.toBlob((blob) => {
      if (!blob) { captured = false; running = true; return; }
      if (preview.src?.startsWith('blob:')) URL.revokeObjectURL(preview.src);
      preview.src = URL.createObjectURL(blob);
      preview.classList.remove('hidden');
      video.classList.add('hidden');
      countdown.classList.add('hidden');
      retake.classList.remove('hidden');
      setStatus('captured', 'Foto berhasil. Silakan cek sebelum dikirim.');
      opts.onCaptured?.(blob);
    }, 'image/jpeg', 0.82);
  }

  async function loadDetector() {
    if (detector) return detector;
    if (starting) return null;
    starting = true;
    loading.classList.remove('hidden');
    try {
      const visionModule = await import(CDN_IMPORT);
      const { FilesetResolver, FaceDetector } = visionModule;
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5
      });
      return detector;
    } finally {
      starting = false;
      loading.classList.add('hidden');
    }
  }

  async function loop() {
    if (!running || captured || !detector) return;
    if (video.readyState >= 2) {
      try {
        const result = detector.detectForVideo(video, performance.now());
        evaluateDetection(result.detections?.[0] || null);
      } catch (_) {}
    }
    raf = requestAnimationFrame(loop);
  }

  async function start() {
    if (captured || running) return;
    try {
      await loadDetector();
      if (!detector) throw new Error('Deteksi wajah belum siap.');
      if (!stream) {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak mendukung kamera.');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false
        });
        video.srcObject = stream;
        await video.play();
      }
      running = true;
      resetHold();
      setStatus('red', 'Arahkan wajah ke dalam lingkaran');
      loop();
    } catch (err) {
      loading.classList.remove('hidden');
      loading.textContent = 'Kamera tidak dapat dibuka: ' + (err.message || err);
      setStatus('red', 'Izinkan akses kamera untuk melanjutkan');
    }
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
      video.srcObject = null;
    }
  }

  function photoReset() {
    resetHold();
    if (preview.src?.startsWith('blob:')) URL.revokeObjectURL(preview.src);
    preview.removeAttribute('src');
    preview.classList.add('hidden');
    video.classList.remove('hidden');
    retake.classList.add('hidden');
    setStatus('red', 'Arahkan wajah ke dalam lingkaran');
  }

  function retakePhoto() {
    captured = false;
    photoReset();
    start();
  }

  return {
    start, stop,
    reset: () => { captured = false; photoReset(); },
    retake: retakePhoto
  };
}
window.createFaceVerifier = createFaceVerifier;
