-- Rebuilds the GitHub Pages site automatically whenever you change content.
-- 1) Replace OWNER/REPO and PASTE_GITHUB_TOKEN below, then run.
-- Token: GitHub > Settings > Developer settings > Fine-grained tokens > only this repo > Contents: Read and write.
create extension if not exists pg_net with schema extensions;
create schema if not exists private;
create table if not exists private.config (key text primary key, value text not null);
alter table private.config enable row level security;

insert into private.config (key, value) values
  ('github_repo',  'OWNER/REPO'),
  ('github_token', 'PASTE_GITHUB_TOKEN')
on conflict (key) do update set value = excluded.value;

create or replace function private.trigger_deploy() returns trigger
language plpgsql security definer set search_path = '' as $$
declare repo text; tok text;
begin
  select value into repo from private.config where key = 'github_repo';
  select value into tok  from private.config where key = 'github_token';
  if repo is null or tok is null or tok = 'PASTE_GITHUB_TOKEN' then return null; end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/' || repo || '/dispatches',
    headers := jsonb_build_object('Accept','application/vnd.github+json','Authorization','Bearer ' || tok,
                                  'User-Agent','supabase-deploy-hook','Content-Type','application/json'),
    body := '{"event_type":"content-published"}'::jsonb);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['posts','recipes','cooking_log','volunteer_entries','security_tools','gallery_items','site_settings'] loop
    execute format('drop trigger if exists trg_deploy on public.%I', t);
    execute format('create trigger trg_deploy after insert or update or delete on public.%I for each statement execute function private.trigger_deploy()', t);
  end loop;
end $$;
