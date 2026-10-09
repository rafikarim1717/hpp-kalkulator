-- ─────────────────────────────────────────────────────────────────────────────
-- Pricelab — skema awal multi-percetakan (multi-tenant)
-- Satu database untuk semua percetakan. Setiap baris data terikat ke satu shop,
-- dan Row Level Security memastikan user hanya bisa membaca/mengubah data
-- percetakan tempat dia terdaftar.
--
-- Jalankan sekali di Supabase: SQL Editor → paste file ini → Run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tabel ──────────────────────────────────────────────────────────────────

-- Satu baris per percetakan (client)
create table if not exists public.shops (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  plan          text not null default 'trial'
                check (plan in ('trial', 'subscription', 'license', 'internal')),
  -- langganan / hosting aktif sampai tanggal ini; null = tanpa batas
  active_until  date,
  created_at    timestamptz not null default now()
);

-- Siapa saja anggota sebuah percetakan
create table if not exists public.shop_members (
  shop_id       uuid not null references public.shops(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'staff' check (role in ('owner', 'staff')),
  display_name  text,
  created_at    timestamptz not null default now(),
  primary key (shop_id, user_id)
);
create index if not exists shop_members_user_idx on public.shop_members(user_id);

-- Data master per percetakan (kertas, mesin, finishing, biaya lain, digital, pengaturan).
-- Disimpan sebagai jsonb supaya bentuknya masih bisa berubah tanpa migrasi tabel.
create table if not exists public.shop_data (
  shop_id           uuid primary key references public.shops(id) on delete cascade,
  settings          jsonb not null default '{}'::jsonb,
  papers            jsonb not null default '[]'::jsonb,
  machines          jsonb not null default '[]'::jsonb,
  finishing         jsonb not null default '{}'::jsonb,
  others            jsonb not null default '[]'::jsonb,
  digital_papers    jsonb not null default '[]'::jsonb,
  digital_machines  jsonb not null default '[]'::jsonb,
  updated_at        timestamptz not null default now(),
  updated_by        uuid references auth.users(id)
);

-- Produk yang sudah dihitung (offset / digital). Isi lengkapnya di kolom data.
create table if not exists public.products (
  id          text primary key,
  shop_id     uuid not null references public.shops(id) on delete cascade,
  kind        text not null check (kind in ('offset', 'digital')),
  name        text not null default '',
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);
create index if not exists products_shop_idx on public.products(shop_id, kind);

-- ── updated_at otomatis ────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists shop_data_touch on public.shop_data;
create trigger shop_data_touch before insert or update on public.shop_data
  for each row execute function public.touch_updated_at();

drop trigger if exists products_touch on public.products;
create trigger products_touch before insert or update on public.products
  for each row execute function public.touch_updated_at();

-- ── Helper untuk RLS ───────────────────────────────────────────────────────
-- security definer supaya policy tidak saling memanggil RLS shop_members (rekursi).

create or replace function public.is_member(p_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from shop_members where shop_id = p_shop and user_id = auth.uid());
$$;

create or replace function public.is_owner(p_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from shop_members where shop_id = p_shop and user_id = auth.uid() and role = 'owner');
$$;

-- Masih aktif? (langganan / hosting belum lewat)
create or replace function public.is_active(p_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select active_until is null or active_until >= current_date from shops where id = p_shop), false);
$$;

-- ── Row Level Security ─────────────────────────────────────────────────────

alter table public.shops         enable row level security;
alter table public.shop_members  enable row level security;
alter table public.shop_data     enable row level security;
alter table public.products      enable row level security;

-- shops: anggota bisa melihat; perubahan plan / masa aktif hanya lewat dashboard admin (service role)
drop policy if exists shops_select on public.shops;
create policy shops_select on public.shops for select using (public.is_member(id));

drop policy if exists shops_update_name on public.shops;
create policy shops_update_name on public.shops for update
  using (public.is_owner(id)) with check (public.is_owner(id));
-- Owner hanya boleh mengganti nama. plan & active_until tidak bisa diubah dari aplikasi.
revoke update on public.shops from authenticated, anon;
grant update (name) on public.shops to authenticated;

-- shop_members: anggota bisa melihat rekan satu percetakan; owner yang mengatur
drop policy if exists members_select on public.shop_members;
create policy members_select on public.shop_members for select using (public.is_member(shop_id));

drop policy if exists members_owner_write on public.shop_members;
create policy members_owner_write on public.shop_members for all
  using (public.is_owner(shop_id)) with check (public.is_owner(shop_id));

-- shop_data: semua anggota bisa membaca; menulis butuh percetakan yang masih aktif.
-- (Kalau nanti staf tidak boleh mengubah harga, ganti is_member → is_owner di policy tulis.)
drop policy if exists data_select on public.shop_data;
create policy data_select on public.shop_data for select using (public.is_member(shop_id));

drop policy if exists data_write on public.shop_data;
create policy data_write on public.shop_data for all
  using (public.is_member(shop_id) and public.is_active(shop_id))
  with check (public.is_member(shop_id) and public.is_active(shop_id));

-- products: semua anggota bisa baca & tulis selama percetakan aktif
drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (public.is_member(shop_id));

drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.is_member(shop_id) and public.is_active(shop_id))
  with check (public.is_member(shop_id) and public.is_active(shop_id));

-- ── Membuat percetakan baru ────────────────────────────────────────────────
-- Dipanggil dari aplikasi oleh user yang baru login pertama kali:
-- membuat shop, menjadikan pemanggil sebagai owner, dan baris shop_data kosong.
-- Data awal (contoh kertas, mesin, template) diisi oleh aplikasi dari kode.

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
  insert into shop_members (shop_id, user_id, role, display_name)
    values (v_shop, auth.uid(), 'owner', p_display_name);
  insert into shop_data (shop_id) values (v_shop);
  return v_shop;
end $$;

revoke all on function public.create_shop(text, text) from public;
grant execute on function public.create_shop(text, text) to authenticated;
