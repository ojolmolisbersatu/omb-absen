const $ = (id) => document.getElementById(id);
let allRows = [];
let sessionId = null;

function statusBadge(row) {
  return row.location_valid
    ? '<span class="badge active">VALID</span>'
    : '<span class="badge cancelled">TIDAK VALID</span>';
}

function renderRows() {
  const validFilter = $('filterValid').value;
  const q = $('filterSearch').value.trim().toLowerCase();
  const rows = allRows.filter((r) => {
    if (validFilter === 'valid' && !r.location_valid) return false;
    if (validFilter === 'invalid' && r.location_valid) return false;
    if (q && !String(r.member_id).toLowerCase().includes(q)) return false;
    return true;
  });

  $('attBody').innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
            <td>${r.photo_drive_url ? `<a href="${escapeHtml(r.photo_drive_url)}" target="_blank"><img class="thumb" src="${escapeHtml(r.photo_drive_url)}" alt="foto"></a>` : '-'}</td>
            <td>${escapeHtml(r.member_id)}</td>
            <td>${new Date(r.attendance_time).toLocaleString('id-ID')}</td>
            <td>${r.distance_meter != null ? Math.round(r.distance_meter) : '-'}</td>
            <td>${r.gps_accuracy != null ? '± ' + Math.round(r.gps_accuracy) + ' m' : '-'}</td>
            <td>${statusBadge(r)}</td>
            <td>${escapeHtml(r.status || '-')}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="7" class="empty">Tidak ada data.</td></tr>';
}

function updateStats() {
  $('statTotal').textContent = allRows.length;
  $('statValid').textContent = allRows.filter((r) => r.location_valid).length;
  $('statInvalid').textContent = allRows.filter((r) => !r.location_valid).length;
  $('statUnique').textContent = new Set(allRows.map((r) => r.member_id)).size;
}

function exportCsv() {
  const headers = ['member_id', 'attendance_time', 'latitude', 'longitude', 'distance_meter', 'gps_accuracy', 'location_valid', 'status', 'photo_drive_url'];
  const lines = [headers.join(',')];
  allRows.forEach((r) => {
    const row = headers.map((h) => {
      const v = r[h] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    });
    lines.push(row.join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `absensi-${sessionId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAdmin())) return;
  sessionId = new URLSearchParams(location.search).get('session');
  if (!sessionId) {
    showMessage($('message'), 'Session ID tidak ditemukan. Buka halaman ini melalui Session Manager.');
    return;
  }

  const { data: session } = await supabaseClient.from('event_sessions').select('*').eq('id', sessionId).single();
  if (session) {
    $('sessionInfo').textContent = `${session.name} · ${session.location_name || '-'}`;
  }

  const { data, error } = await supabaseClient
    .from('attendance')
    .select('*')
    .eq('session_id', sessionId)
    .order('attendance_time', { ascending: false });

  if (error) {
    showMessage($('message'), 'Gagal memuat data kehadiran: ' + error.message, 'error');
    $('attBody').innerHTML = '<tr><td colspan="7" class="empty">Gagal memuat data.</td></tr>';
    return;
  }

  allRows = data || [];
  updateStats();
  renderRows();

  $('filterValid').addEventListener('change', renderRows);
  $('filterSearch').addEventListener('input', renderRows);
  $('exportBtn').addEventListener('click', exportCsv);
});
