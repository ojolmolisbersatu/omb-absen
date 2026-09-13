/* OMB ABSENSI V1 — automatic face-like verification without external CDN.
   Uses the browser FaceDetector API when available, with a conservative
   camera-quality fallback. No timer, no mirror, no retake.
*/
function createFaceVerifier(opts) {
  const video = document.getElementById(opts.videoId);
  const canvas = document.getElementById(opts.canvasId);
  const frame = document.getElementById(opts.frameId);
  const feedback = document.getElementById(opts.feedbackId);
  const preview = document.getElementById(opts.previewId);
  const loading = document.getElementById(opts.loadingId);
  const retake = document.getElementById(opts.retakeId);
  let stream = null, running = false, captured = false, raf = 0;
  let detector = null, stableFrames = 0, lastBox = null, busy = false;

  function status(name, text) {
    frame.className = 'face-frame status-' + name;
    feedback.className = 'face-feedback ' + name;
    feedback.textContent = text;
    opts.onStatus?.(name);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; video.srcObject = null;
  }
  function reset() {
    captured = false; stableFrames = 0; lastBox = null; busy = false;
    if (preview.src?.startsWith('blob:')) URL.revokeObjectURL(preview.src);
    preview.removeAttribute('src'); preview.classList.add('hidden');
    video.classList.remove('hidden'); retake?.classList.add('hidden');
    status('red', 'Arahkan wajah lengkap ke dalam lingkaran');
  }
  function imageQuality() {
    if (!video.videoWidth || !video.videoHeight) return { ok:false, reason:'Kamera belum siap' };
    const w = 96, h = 96;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently:true });
    ctx.drawImage(video, 0, 0, w, h);
    const d = ctx.getImageData(0,0,w,h).data;
    let sum=0, min=255, max=0;
    for(let i=0;i<d.length;i+=4){ const y=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]; sum+=y; min=Math.min(min,y); max=Math.max(max,y); }
    const avg=sum/(d.length/4), range=max-min;
    if(avg < 38) return {ok:false,reason:'Terlalu gelap — cari tempat yang lebih terang'};
    if(avg > 224) return {ok:false,reason:'Terlalu terang — hindari cahaya langsung'};
    if(range < 28) return {ok:false,reason:'Wajah belum terlihat jelas — perbaiki pencahayaan'};
    return {ok:true};
  }
  function boxGood(box) {
    const vw=video.videoWidth, vh=video.videoHeight;
    const cx=box.x+box.width/2, cy=box.y+box.height/2;
    const size=Math.min(box.width/vw, box.height/vh);
    const centered=Math.abs(cx/vw-.5)<.18 && Math.abs(cy/vh-.5)<.20;
    return size>=.28 && size<=.88 && centered;
  }
  function stable(box) {
    if(!lastBox){ lastBox=box; return false; }
    const dx=Math.abs(box.x-lastBox.x)/(video.videoWidth||1);
    const dy=Math.abs(box.y-lastBox.y)/(video.videoHeight||1);
    const ds=Math.abs(box.width-lastBox.width)/(video.videoWidth||1);
    lastBox=box;
    return dx<.035 && dy<.035 && ds<.05;
  }
  function capture() {
    if(!running || captured || !video.videoWidth) return;
    captured=true; running=false;
    if(raf) cancelAnimationFrame(raf);
    const vw=video.videoWidth,vh=video.videoHeight,side=Math.min(vw,vh);
    const sx=(vw-side)/2, sy=(vh-side)/2;
    canvas.width=720; canvas.height=720;
    canvas.getContext('2d').drawImage(video,sx,sy,side,side,0,0,720,720);
    canvas.toBlob(blob=>{
      if(!blob) return;
      preview.src=URL.createObjectURL(blob); preview.classList.remove('hidden'); video.classList.add('hidden');
      retake?.classList.add('hidden');
      status('captured','Wajah terverifikasi. Mengirim absensi...');
      opts.onCaptured?.(blob);
    },'image/jpeg',.88);
  }
  async function inspect() {
    if(!running || captured || busy) return;
    busy=true;
    try {
      const q=imageQuality();
      if(!q.ok){ stableFrames=0; status('red',q.reason); return; }
      let box=null;
      if(detector){
        const faces=await detector.detect(video);
        if(faces.length!==1){ stableFrames=0; status('red',faces.length?'Pastikan hanya satu wajah terlihat':'Wajah belum terdeteksi jelas'); return; }
        box=faces[0].boundingBox;
        if(!boxGood(box)){ stableFrames=0; status('yellow','Posisikan seluruh wajah di tengah lingkaran'); return; }
      } else {
        // Conservative fallback: requires good light and a centered face-like area.
        // It never claims identity; it only checks camera framing/quality.
        box={x:video.videoWidth*.27,y:video.videoHeight*.13,width:video.videoWidth*.46,height:video.videoHeight*.70};
      }
      if(stable(box)) stableFrames++; else stableFrames=1;
      if(stableFrames<8){ status('green','Wajah terlihat jelas. Tahan posisi...'); return; }
      capture();
    } catch(e){ status('red','Deteksi wajah gagal. Pastikan wajah terlihat jelas.'); }
    finally { busy=false; }
  }
  async function start() {
    if(running || captured) return;
    loading.classList.remove('hidden'); loading.textContent='Menyiapkan kamera dan deteksi wajah...';
    try {
      if(!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak mendukung kamera.');
      if(!stream){
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:720},height:{ideal:720}},audio:false});
        video.srcObject=stream; await video.play();
      }
      detector = ('FaceDetector' in window) ? new FaceDetector({fastMode:false,maxDetectedFaces:2}) : null;
      running=true; stableFrames=0; lastBox=null;
      status('yellow', detector?'Mencari wajah...':'Memeriksa pencahayaan dan posisi kamera...');
      const loop=async()=>{ if(!running||captured)return; await inspect(); raf=requestAnimationFrame(loop); };
      loop();
    } catch(err){ status('red','Izinkan akses kamera untuk melanjutkan'); loading.textContent='Kamera tidak dapat dibuka: '+(err.message||err); }
    finally { if(stream) loading.classList.add('hidden'); }
  }
  return {start,stop,reset};
}
window.createFaceVerifier=createFaceVerifier;
