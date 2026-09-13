/* OMB ABSENSI V1 — face-like verification
   Green must remain valid continuously for 3 seconds before auto capture.
   No visible timer, no retake, no mirror. */
function createFaceVerifier(opts) {
  const video=document.getElementById(opts.videoId), canvas=document.getElementById(opts.canvasId), frame=document.getElementById(opts.frameId), feedback=document.getElementById(opts.feedbackId), preview=document.getElementById(opts.previewId), loading=document.getElementById(opts.loadingId);
  let stream=null,running=false,captured=false,raf=0,detector=null,busy=false,lastBox=null,greenSince=0;
  const GREEN_MS=3000;
  function status(name,text){frame.className='face-frame status-'+name;feedback.className='face-feedback '+name;feedback.textContent=text;opts.onStatus?.(name);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;}
  function reset(){captured=false;lastBox=null;greenSince=0;busy=false;preview.removeAttribute('src');preview.classList.add('hidden');video.classList.remove('hidden');status('red','Arahkan wajah lengkap ke dalam lingkaran');}
  function imageQuality(){
    if(!video.videoWidth||!video.videoHeight)return {ok:false,reason:'Kamera belum siap'};
    const w=160,h=160;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,w,h);const d=ctx.getImageData(0,0,w,h).data;
    let sum=0,min=255,max=0,lap=0,prev=0;for(let i=0;i<d.length;i+=4){const y=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];sum+=y;min=Math.min(min,y);max=Math.max(max,y);if(i>=4){lap+=Math.abs(y-prev);}prev=y;}
    const avg=sum/(d.length/4),range=max-min,sharp=lap/(d.length/4);
    if(avg<42)return {ok:false,reason:'Terlalu gelap — cari tempat lebih terang'};
    if(avg>218)return {ok:false,reason:'Terlalu terang — hindari cahaya langsung'};
    if(range<35)return {ok:false,reason:'Struktur wajah belum terlihat jelas'};
    if(sharp<7.5)return {ok:false,reason:'Wajah masih blur — tahan HP agar stabil'};
    return {ok:true};
  }
  function boxGood(b){const vw=video.videoWidth,vh=video.videoHeight,cx=b.x+b.width/2,cy=b.y+b.height/2,size=Math.min(b.width/vw,b.height/vh);return size>=.30&&size<=.86&&Math.abs(cx/vw-.5)<.16&&Math.abs(cy/vh-.5)<.18&&b.width/vw>.28&&b.height/vh>.35;}
  function stable(b){if(!lastBox){lastBox=b;return false;}const dx=Math.abs(b.x-lastBox.x)/(video.videoWidth||1),dy=Math.abs(b.y-lastBox.y)/(video.videoHeight||1),ds=Math.abs(b.width-lastBox.width)/(video.videoWidth||1);lastBox=b;return dx<.025&&dy<.025&&ds<.035;}
  function capture(){if(!running||captured)return;captured=true;running=false;if(raf)cancelAnimationFrame(raf);const vw=video.videoWidth,vh=video.videoHeight,side=Math.min(vw,vh),sx=(vw-side)/2,sy=(vh-side)/2;canvas.width=720;canvas.height=720;canvas.getContext('2d').drawImage(video,sx,sy,side,side,0,0,720,720);canvas.toBlob(blob=>{if(!blob)return;preview.src=URL.createObjectURL(blob);preview.classList.remove('hidden');video.classList.add('hidden');status('captured','Wajah terverifikasi. Mengirim absensi...');opts.onCaptured?.(blob);},'image/jpeg',.94);}
  async function inspect(){if(!running||captured||busy)return;busy=true;try{const q=imageQuality();if(!q.ok){greenSince=0;lastBox=null;status('red',q.reason);return;}let box=null;if(detector){const faces=await detector.detect(video);if(faces.length!==1){greenSince=0;lastBox=null;status('red',faces.length?'Pastikan hanya satu wajah terlihat':'Wajah, mata, hidung, dan mulut belum terlihat lengkap');return;}box=faces[0].boundingBox;if(!boxGood(box)){greenSince=0;status('yellow','Sesuaikan seluruh wajah di tengah lingkaran');return;}if(!stable(box)){greenSince=0;status('yellow','Tahan posisi wajah agar stabil');return;}}else{status('yellow','Deteksi wajah tidak tersedia di browser ini');greenSince=0;return;}
      if(!greenSince){greenSince=performance.now();status('green','Wajah pas. Tahan posisi...');return;}const elapsed=performance.now()-greenSince;if(elapsed>=GREEN_MS){capture();}else{status('green','Wajah pas. Sedang memverifikasi...');}
    }catch(e){greenSince=0;lastBox=null;status('red','Wajah belum terlihat jelas');}finally{busy=false;}}
  async function start(){if(running||captured)return;loading.classList.remove('hidden');try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Browser tidak mendukung kamera.');if(!stream){stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:720},height:{ideal:720}},audio:false});video.srcObject=stream;await video.play();}detector=('FaceDetector'in window)?new FaceDetector({fastMode:false,maxDetectedFaces:2}):null;running=true;greenSince=0;lastBox=null;status('yellow',detector?'Mencari wajah...':'Browser belum mendukung deteksi wajah otomatis');const loop=async()=>{if(!running||captured)return;await inspect();raf=requestAnimationFrame(loop);};loop();}catch(err){status('red','Izinkan akses kamera untuk melanjutkan');loading.textContent='Kamera tidak dapat dibuka: '+(err.message||err);}finally{if(stream)loading.classList.add('hidden');}}
  return {start,stop,reset};
}
window.createFaceVerifier=createFaceVerifier;
