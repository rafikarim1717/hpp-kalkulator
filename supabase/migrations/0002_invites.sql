-- ─────────────────────────────────────────────────────────────────────────────
-- Pricelab — undangan staf
-- Owner membuat kode undangan, staf mendaftar sendiri lalu memasukkan kode itu.
-- Tidak butuh server/secret key: semua lewat fungsi security definer di bawah.
--
-- Jalankan sekali di Supabase: SQL Editor → paste file ini → Run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Email anggota disimpan supaya owner bisa melihat siapa saja di timnya
-- (tabel auth.users tidak bisa dibaca dari aplikasi).
alter table public.shop_members add column if not exists email text;

-- Id produk cukup unik di dalam satu percetakan (produk contoh "p-brosur" bisa ada di banyak percetakan).
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'products_pkey'
             and conrelid = 'public.products'::regclass and array_length(conkey, 1) = 1) then
    alter table public.products drop constraint products_pkey;
    alter table public.products add constraint products_pkey primary key (shop_id, id);
  end if;
end $$;

create table if not exists public.shop_invites (
  code        text primary key,
  shop_id     uuid not null references public.shops(id) on delete cascade,
  role        text not null default 'staff' check (role in ('owner', 'staff')),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_by     uuid references auth.users(id) on delete set null,
  used_at     timestamptz
);
create index if not exists shop_invites_shop_idx on public.shop_invites(shop_id);

alter table public.shop_invites enable row level security;

-- Owner bisa melihat & mencabut undangan percetakannya. Membuat undangan lewat create_invite().
drop policy if exists invites_owner_select on public.shop_invites;
create policy invites_owner_select on public.shop_invites for select using (public.is_owner(shop_id));

drop policy if exists invites_owner_delete on public.shop_invites;
create policy invites_owner_delete on public.shop_invites for delete using (public.is_owner(shop_id));

-- ── Buat percetakan baru (versi baru: ikut menyimpan email owner) ──────────

create or replace function public.create_shop(p_name text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_shop uuid;
begin
  if auth.uid() is null then
    raise exception 'harus login';
  end if;
  insert into shops (name, plan, active_until)
    values (coalesce(nullif(trim(p_name), ''), 'Percetakan'), 'trial', current_date + 30)
    returning id into v_shop;
  insert into shop_members (shop_id, user_id, role, display_name, email)
    values (v_shop, auth.uid(), 'owner', nullif(trim(p_display_name), ''), auth.jwt() ->> 'email');
  insert into shop_data (shop_id) values (v_shop);
  return v_shop;
end $$;

revoke all on function public.create_shop(text, text) from public;
grant execute on function public.create_shop(text, text) to authenticated;

-- ── Buat kode undangan (owner saja) ────────────────────────────────────────

create or replace function public.create_invite(p_shop uuid, p_role text default 'staff')
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not public.is_owner(p_shop) then
    raise exception 'hanya owner yang bisa mengundang';
  end if;
  if p_role not in ('owner', 'staff') then
    raise exception 'peran tidak dikenal';
  end if;
  -- 8 karakter tanpa huruf/angka yang mirip (0/O, 1/I)
  loop
    v_code := (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
      from generate_series(1, 8)
    );
    exit when not exists (select 1 from shop_invites where code = v_code);
  end loop;
  insert into shop_invites (code, shop_id, role, created_by) values (v_code, p_shop, p_role, auth.uid());
  return v_code;
end $$;

revoke all on function public.create_invite(uuid, text) from public;
grant execute on function public.create_invite(uuid, text) to authenticated;

-- ── Gabung ke percetakan memakai kode undangan ─────────────────────────────

create or replace function public.join_shop(p_code text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_inv shop_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'harus login';
  end if;
  select * into v_inv from shop_invites where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'kode undangan tidak ditemukan';
  end if;
  if v_inv.used_at is not null then
    raise exception 'kode undangan sudah dipakai';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'kode undangan sudah kedaluwarsa';
  end if;
  insert into shop_members (shop_id, user_id, role, display_name, email)
    values (v_inv.shop_id, auth.uid(), v_inv.role, nullif(trim(p_display_name), ''), auth.jwt() ->> 'email')
    on conflict (shop_id, user_id) do nothing;
  update shop_invites set used_by = auth.uid(), used_at = now() where code = v_inv.code;
  return v_inv.shop_id;
end $$;

revoke all on function public.join_shop(text, text) from public;
grant execute on function public.join_shop(text, text) to authenticated;
