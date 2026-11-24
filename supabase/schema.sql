-- =====================================================================
-- Portfolio schema. Run once in Supabase: SQL Editor > New query > Run.
-- =====================================================================

-- ---------- 1. Admin gate -------------------------------------------
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;  -- no policies: invisible to the API

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

-- ---------- 2. Helper functions -------------------------------------
create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create function public.set_published_at() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then new.published_at = now(); end if;
  return new;
end $$;

-- media = [{"type":"photo|video|award|certificate","url":"...","caption":"...","title":"...","issuer":"...","date":"2026-01-31"}]
create function public.valid_media(m jsonb) returns boolean language sql immutable as $$
  select case when jsonb_typeof(m) <> 'array' then false else not exists (
    select 1 from jsonb_array_elements(m) e
    where jsonb_typeof(e) <> 'object'
       or e->>'type' not in ('photo','video','award','certificate')
       or coalesce(e->>'url','') = ''
  ) end
$$;

-- ---------- 3. Tables -----------------------------------------------
create table public.site_settings (
  id int primary key default 1 check (id = 1),           -- exactly one row
  hero_intro_en text, hero_intro_bn text,
  about_en text, about_bn text,
  contact_email text,
  links jsonb not null default '[]',                     -- [{"label":"GitHub","url":"..."}]
  adsense_client text,                                   -- e.g. ca-pub-xxxxxxxx (public by design)
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1);

-- Writing, Security notes, Political thoughts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('writing','security','thoughts')),
  kind text not null check (kind in ('poem','story','novel','journal','essay','security_note','thesis')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_en text, title_bn text,
  body_md text not null default '',
  excerpt text, seo_description text, cover_url text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (section, slug),
  check (title_en is not null or title_bn is not null)
);
create index posts_list_idx on public.posts (section, status, published_at desc);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_en text, title_bn text, summary text, cover_url text,
  ingredients jsonb not null default '[]',               -- [{"item":"Rice","qty":"2 cups"}]
  steps jsonb not null default '[]',                     -- [{"text":"Rinse the rice."}]
  prep_minutes int, cook_minutes int, servings int,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (title_en is not null or title_bn is not null)
);

-- Cooking log: text-only entries are valid and indexable; photo is optional
create table public.cooking_log (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  cooked_on date not null,
  dish text not null, occasion text, location text, notes text,
  photo_url text,
  recipe_id uuid references public.recipes(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.volunteer_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  organization text not null,                            -- e.g. Palpara club
  title text not null, role text, location text,
  start_date date, end_date date,                        -- end_date null = ongoing
  summary text, story_md text not null default '',
  media jsonb not null default '[]' check (public.valid_media(media)),
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.security_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('siem','edr','network','forensics','vuln','osint','scripting','other')),
  level text not null default 'learning' check (level in ('learning','practiced','comfortable')),
  description text, url text, learned_on date,
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- hero_highlights (Home strip), miniatures (carousel + gallery), work (extra photos)
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  collection text not null check (collection in ('hero_highlights','miniatures','work')),
  group_key text,                                        -- groups angles of one miniature
  title text, description text, caption text,
  image_url text not null, alt_text text,
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index gallery_idx on public.gallery_items (collection, visible, sort_order);

-- ---------- 4. Triggers + RLS ---------------------------------------
do $$
declare t text;
begin
  -- content tables with draft/published status
  foreach t in array array['posts','recipes','cooking_log','volunteer_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "public reads published" on public.%I for select to anon, authenticated
                     using (status = 'published' and published_at <= now())$p$, t);
    execute format($p$create policy "admin full access" on public.%I for all to authenticated
                     using (public.is_admin()) with check (public.is_admin())$p$, t);
    execute format('create trigger trg_published before insert or update on public.%I for each row execute function public.set_published_at()', t);
    execute format('create trigger trg_updated before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;

  -- tables with a visible flag
  foreach t in array array['security_tools','gallery_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "public reads visible" on public.%I for select to anon, authenticated
                     using (visible)$p$, t);
    execute format($p$create policy "admin full access" on public.%I for all to authenticated
                     using (public.is_admin()) with check (public.is_admin())$p$, t);
    execute format('create trigger trg_updated before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

alter table public.site_settings enable row level security;
create policy "public reads settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admin updates settings" on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create trigger trg_updated before update on public.site_settings for each row execute function public.set_updated_at();

-- ---------- 5. Storage (images) -------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

create policy "admin lists media"   on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "admin uploads media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "admin edits media"   on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "admin deletes media" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ---------- 6. Make yourself admin (do AFTER creating your login) ---
-- Authentication > Users > Add user. Then run, with your email:
-- insert into public.admin_users select id from auth.users where email = 'YOU@EXAMPLE.COM';
