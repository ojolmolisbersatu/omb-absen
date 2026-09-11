-- ============================================================
-- OMB ABSENSI V1 — Tambahan untuk halaman absensi member
-- Hanya menambahkan yang BELUM ADA. Tidak menyentuh/menggantikan
-- policy admin yang sudah berjalan di events/event_sessions/attendance.
-- ============================================================

-- 1) View publik terbatas untuk pencarian member (nama & ID saja,
--    tanpa data domisili/motor/aplikasi_ojol dsb).
create or replace view public.anggota_omb_public as
select id, nama, nama_panggilan, id_anggota, status
from public.anggota_omb
where status = 'Aktif';

grant select on public.anggota_omb_public to anon;

-- 2) Izinkan anon (member tanpa login) mengirim absensi.
--    Policy admin (authenticated: select/update/delete) yang sudah ada
--    TIDAK diubah/dihapus oleh baris ini.
drop policy if exists "anon_insert_attendance" on public.attendance;
create policy "anon_insert_attendance" on public.attendance
for insert to anon
with check (true);

grant insert on public.attendance to anon;
