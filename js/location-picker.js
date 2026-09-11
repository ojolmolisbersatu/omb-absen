/* ==========================================================================
   OMB ABSENSI V1 — Location picker helper
   Menyediakan: tombol "Gunakan Lokasi Saya" (Geolocation API), peta Leaflet
   interaktif (klik / geser marker), dan preset radius absensi.
   Tidak menyentuh logika auth/login sama sekali.
   ========================================================================== */

const DEFAULT_CENTER = { lat: -6.2, lng: 106.816666 }; // fallback: Jakarta
const DEFAULT_ZOOM = 13;

/**
 * Inisialisasi peta lokasi interaktif + tombol GPS.
 * opts: {
 *   mapId, latId, lngId, statusId, useMyLocationBtnId
 * }
 * Return: { setMarker(lat,lng) } supaya bisa dipanggil lagi dari luar
 * (misal saat mode edit, untuk memindahkan marker ke koordinat tersimpan).
 */
function initLocationPicker(opts) {
  const latInput = document.getElementById(opts.latId);
  const lngInput = document.getElementById(opts.lngId);
  const statusEl = document.getElementById(opts.statusId);
  const btn = document.getElementById(opts.useMyLocationBtnId);
  const mapEl = document.getElementById(opts.mapId);

  const startLat = Number(latInput.value) || DEFAULT_CENTER.lat;
  const startLng = Number(lngInput.value) || DEFAULT_CENTER.lng;

  const map = L.map(mapEl).setView([startLat, startLng], latInput.value ? 16 : DEFAULT_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  let marker = null;

  function updateCoords(lat, lng) {
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
  }

  function setMarker(lat, lng, opts2) {
    lat = Number(lat);
    lng = Number(lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    if (!marker) {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        updateCoords(p.lat, p.lng);
      });
    } else {
      marker.setLatLng([lat, lng]);
    }
    if (!opts2 || opts2.recenter !== false) {
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
    }
    updateCoords(lat, lng);
  }

  if (latInput.value && lngInput.value) {
    setMarker(latInput.value, lngInput.value, { recenter: false });
  }

  map.on('click', (e) => setMarker(e.latlng.lat, e.latlng.lng));

  // Setelah render, ukuran peta perlu di-refresh (khususnya jika awalnya di dalam elemen hidden)
  setTimeout(() => map.invalidateSize(), 200);

  if (btn) {
    btn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showMessage(statusEl, 'Geolocation tidak didukung browser ini.', 'error');
        return;
      }
      statusEl.classList.remove('hidden');
      statusEl.className = 'notice';
      statusEl.textContent = 'Mencari lokasi Anda...';
      btn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setMarker(latitude, longitude);
          showMessage(statusEl, `Lokasi berhasil didapatkan. Akurasi GPS: ± ${Math.round(accuracy)} meter`, 'success');
          btn.disabled = false;
        },
        (err) => {
          showMessage(statusEl, 'Gagal mengambil lokasi: ' + err.message, 'error');
          btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });
  }

  return { setMarker, map };
}

/**
 * Inisialisasi preset chip radius (50/100/200/500 m) + input custom.
 * opts: { radiusInputId, presetContainerId, defaultValue }
 */
function initRadiusPresets(opts) {
  const input = document.getElementById(opts.radiusInputId);
  const container = document.getElementById(opts.presetContainerId);
  if (!input || !container) return;

  function syncActive() {
    const chips = container.querySelectorAll('.chip');
    let matched = false;
    chips.forEach((chip) => {
      const isMatch = Number(chip.dataset.val) === Number(input.value);
      chip.classList.toggle('active', isMatch);
      if (isMatch) matched = true;
    });
    return matched;
  }

  container.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.val;
      syncActive();
    });
  });

  input.addEventListener('input', syncActive);

  if (!input.value) {
    input.value = opts.defaultValue || 100;
  }
  syncActive();
  return { sync: syncActive };
}

window.initLocationPicker = initLocationPicker;
window.initRadiusPresets = initRadiusPresets;
