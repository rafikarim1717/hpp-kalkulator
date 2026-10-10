-- ─────────────────────────────────────────────────────────────────────────────
-- Setup percetakan Mas Ucup: 1 percetakan, 2 akun (admin + pegawai).
--
-- Sebelum menjalankan:
--   1. Supabase → Authentication → Users → Add user → Create new user
--      buat 2 akun (email + password), centang "Auto Confirm User".
--   2. Ganti 2 email di bawah sesuai akun yang dibuat (dan nama percetakan kalau perlu).
--   3. SQL Editor → paste file ini → Run.
--
-- Aman dijalankan ulang: kalau percetakan dengan nama yang sama sudah ada, dipakai lagi.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_shop_name     text := 'Percetakan Mas Ucup';     -- ← nama percetakan
  v_admin_email   text := 'admin@ganti-ini.com';     -- ← email akun admin (Mas Ucup)
  v_pegawai_email text := 'pegawai@ganti-ini.com';   -- ← email akun pegawai
  v_shop    uuid;
  v_admin   uuid;
  v_pegawai uuid;
begin
  select id into v_admin   from auth.users where lower(email) = lower(v_admin_email);
  select id into v_pegawai from auth.users where lower(email) = lower(v_pegawai_email);
  if v_admin is null then raise exception 'Akun admin % belum dibuat di Authentication → Users', v_admin_email; end if;
  if v_pegawai is null then raise exception 'Akun pegawai % belum dibuat di Authentication → Users', v_pegawai_email; end if;

  select id into v_shop from public.shops where name = v_shop_name limit 1;
  if v_shop is null then
    -- active_until null = aktif tanpa batas. Isi tanggal kalau mau akses berhenti otomatis.
    insert into public.shops (name, plan, active_until) values (v_shop_name, 'subscription', null)
    returning id into v_shop;
  end if;

  insert into public.shop_data (shop_id) values (v_shop) on conflict (shop_id) do nothing;

  insert into public.shop_members (shop_id, user_id, role, display_name, email) values
    (v_shop, v_admin,   'owner', 'Admin',   v_admin_email),
    (v_shop, v_pegawai, 'staff', 'Pegawai', v_pegawai_email)
  on conflict (shop_id, user_id) do update set role = excluded.role, display_name = excluded.display_name, email = excluded.email;

  raise notice 'Selesai. Percetakan: % (%)', v_shop_name, v_shop;
end $$;

-- ── Saklar akses (dipakai nanti kalau perlu) ─────────────────────────────────
-- Matikan (data jadi hanya-lihat):
--   update public.shops set active_until = current_date - 1 where name = 'Percetakan Mas Ucup';
-- Hidupkan lagi tanpa batas:
--   update public.shops set active_until = null where name = 'Percetakan Mas Ucup';
