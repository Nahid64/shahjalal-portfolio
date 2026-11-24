import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase as sb } from '../lib/supabase';

type Row = Record<string, any>;
type T = 'text' | 'area' | 'num' | 'date' | 'select' | 'tags' | 'img' | 'bool' | 'ing' | 'lines' | 'links' | 'media';
type F = { k: string; label: string; t: T; opts?: string[]; help?: string; big?: boolean; keep?: boolean };
type Res = { label: string; table: string; where?: Row; folder: string; title: (r: Row) => string; sub?: (r: Row) => string;
  fields: F[]; sortable?: boolean; single?: boolean; multi?: boolean };

const tx = (k: string, label: string, t: T = 'text', more: Partial<F> = {}): F => ({ k, label, t, ...more });
const S = tx('status', 'Status', 'select', { opts: ['draft', 'published'], help: 'Draft stays hidden from visitors.' });
const SLUG = tx('slug', 'Slug (English letters, numbers, hyphens; leave empty to make it from the title)');

const post = (label: string, section: string, kinds: string[]): Res => ({
  label, table: 'posts', where: { section }, folder: section, title: r => r.title_en || r.title_bn || '(untitled)', sub: r => String(r.kind).replace('_', ' '),
  fields: [tx('kind', 'Type', 'select', { opts: kinds }), SLUG, tx('title_en', 'Title (English)'), tx('title_bn', 'Title (বাংলা)'),
    tx('excerpt', 'Short summary', 'area'), tx('body_md', 'Text (Markdown works)', 'area', { big: true, keep: true }),
    tx('tags', 'Tags (comma separated)', 'tags'), tx('cover_url', 'Cover image', 'img'), tx('seo_description', 'Search engine description', 'area'), S],
});
const photo = (label: string, collection: string, extra: F[]): Res => ({
  label, table: 'gallery_items', where: { collection }, folder: collection, multi: true, sortable: true,
  title: r => r.title || r.caption || r.alt_text || 'Photo', sub: r => r.group_key || '',
  fields: [tx('image_url', 'Photo', 'img'), ...extra, tx('alt_text', 'Describe the photo (for screen readers and search)'), tx('visible', 'Show on site', 'bool')],
});

const RES: Record<string, Res> = {
  hero: photo('Home photos', 'hero_highlights', [tx('caption', 'Caption')]),
  writing: post('Writing', 'writing', ['poem', 'story', 'novel', 'journal']),
  thoughts: post('Political thoughts', 'thoughts', ['essay', 'journal']),
  security: post('Security notes', 'security', ['security_note', 'thesis']),
  tools: { label: 'Security tools', table: 'security_tools', folder: 'tools', sortable: true, title: r => r.name, sub: r => `${r.category}, ${r.level}`,
    fields: [tx('name', 'Tool name'), tx('category', 'Category', 'select', { opts: ['siem', 'edr', 'network', 'forensics', 'vuln', 'osint', 'scripting', 'other'] }),
      tx('level', 'Level', 'select', { opts: ['learning', 'practiced', 'comfortable'] }), tx('description', 'What I use it for', 'area'),
      tx('url', 'Link'), tx('learned_on', 'Started learning', 'date'), tx('visible', 'Show on site', 'bool')] },
  volunteer: { label: 'Volunteer work', table: 'volunteer_entries', folder: 'volunteer', sortable: true, title: r => r.title, sub: r => r.organization,
    fields: [SLUG, tx('title', 'Title'), tx('organization', 'Organization or club'), tx('role', 'Your role'), tx('location', 'Location'),
      tx('start_date', 'Start date', 'date'), tx('end_date', 'End date (empty if ongoing)', 'date'), tx('summary', 'Short summary', 'area'),
      tx('story_md', 'Story (Markdown works)', 'area', { big: true, keep: true }), tx('media', 'Photos, videos, awards and certificates', 'media'), S] },
  recipes: { label: 'Recipes', table: 'recipes', folder: 'recipes', title: r => r.title_en || r.title_bn, sub: r => r.summary || '',
    fields: [SLUG, tx('title_en', 'Title (English)'), tx('title_bn', 'Title (বাংলা)'), tx('summary', 'Short summary', 'area'), tx('cover_url', 'Photo', 'img'),
      tx('prep_minutes', 'Prep minutes', 'num'), tx('cook_minutes', 'Cook minutes', 'num'), tx('servings', 'Servings', 'num'),
      tx('ingredients', 'Ingredients', 'ing', { big: true }), tx('steps', 'Method steps', 'lines', { big: true }), tx('tags', 'Tags (comma separated)', 'tags'), S] },
  log: { label: 'Cooking log', table: 'cooking_log', folder: 'cooking', title: r => r.dish, sub: r => r.cooked_on,
    fields: [SLUG, tx('cooked_on', 'Date cooked', 'date'), tx('dish', 'Dish'), tx('occasion', 'Occasion'), tx('location', 'Where'),
      tx('notes', 'Notes (Markdown works)', 'area', { big: true }), tx('photo_url', 'Photo (optional)', 'img'), S] },
  minis: photo('Miniatures', 'miniatures', [tx('title', 'Name of the creation'), tx('description', 'Short description', 'area'),
    tx('group_key', 'Group name', 'text', { help: 'Photos with the same group name are shown as angles of one creation.' })]),
  settings: { label: 'Settings', table: 'site_settings', folder: 'site', single: true, title: () => 'Settings',
    fields: [tx('hero_intro_en', 'Home intro (English)', 'area'), tx('hero_intro_bn', 'Home intro (বাংলা)', 'area'),
      tx('about_en', 'About me (English, Markdown works)', 'area', { big: true }), tx('about_bn', 'About me (বাংলা)', 'area', { big: true }),
      tx('contact_email', 'Contact email'), tx('links', 'Profile links', 'links')] },
};

const HINT: Record<string, string> = { ing: 'One per line. Quantity first if you like:\n2 cups | Rice', lines: 'One step per line', links: 'One per line:\nGitHub | https://github.com/you' };
const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function toForm(f: F, v: any): any {
  switch (f.t) {
    case 'tags': return (v ?? []).join(', ');
    case 'ing': return (v ?? []).map((i: Row) => (i.qty ? `${i.qty} | ${i.item}` : i.item)).join('\n');
    case 'lines': return (v ?? []).map((s: Row) => s.text).join('\n');
    case 'links': return (v ?? []).map((l: Row) => `${l.label} | ${l.url}`).join('\n');
    case 'media': return v ?? [];
    case 'bool': return v ?? true;
    case 'select': return v ?? f.opts![0];
    default: return v ?? '';
  }
}
function toRow(f: F, v: any): any {
  switch (f.t) {
    case 'tags': return String(v).split(',').map(x => x.trim()).filter(Boolean);
    case 'ing': return lines(v).map(l => { const [a, ...b] = l.split('|'); return b.length ? { qty: a.trim(), item: b.join('|').trim() } : { item: a.trim() }; });
    case 'lines': return lines(v).map(text => ({ text }));
    case 'links': return lines(v).map(l => { const [label, ...u] = l.split('|'); return { label: label.trim(), url: u.join('|').trim() }; }).filter(l => l.url);
    case 'media': return (v as Row[]).filter(m => m.url);
    case 'num': return v === '' ? null : Number(v);
    case 'bool': return !!v;
    default: return v === '' && !f.keep ? null : v;
  }
}

async function shrink(f: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('x'))), 'image/webp', 0.85));
  } catch { return f; }
}
async function upload(f: File, folder: string): Promise<string> {
  const blob = await shrink(f);
  const ext = blob.type === 'image/webp' ? 'webp' : (f.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, blob, { cacheControl: '31536000', contentType: blob.type });
  if (error) throw error;
  return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
}

function ImageField({ value, onChange, folder }: { value: string; onChange: (v: string) => void; folder: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); setErr('');
    try { onChange(await upload(f, folder)); } catch (x: any) { setErr(x.message); }
    setBusy(false);
  }
  return (
    <div>
      {value && <img className="adm-thumb" src={value} alt="" />}
      <input type="file" accept="image/*" onChange={pick} />
      {busy && <span> Uploading...</span>}
      {value && <button type="button" className="btn-sm" onClick={() => onChange('')}>Remove photo</button>}
      {err && <p className="adm-err">{err}</p>}
    </div>
  );
}

function MediaEditor({ value, onChange }: { value: Row[]; onChange: (v: Row[]) => void }) {
  const set = (i: number, p: Row) => onChange(value.map((m, j) => (j === i ? { ...m, ...p } : m)));
  return (
    <div>
      {value.map((m, i) => {
        const cap = m.type === 'photo' || m.type === 'video';
        return (
          <div className="adm-media" key={i}>
            <select value={m.type} onChange={e => set(i, { type: e.target.value })}>
              {['photo', 'video', 'award', 'certificate'].map(o => <option key={o}>{o}</option>)}
            </select>
            {m.type === 'video'
              ? <input placeholder="YouTube or Vimeo link" value={m.url ?? ''} onChange={e => set(i, { url: e.target.value })} />
              : <ImageField value={m.url ?? ''} onChange={url => set(i, { url })} folder="volunteer" />}
            <input placeholder={cap ? 'Caption' : 'Title'} value={(cap ? m.caption : m.title) ?? ''} onChange={e => set(i, cap ? { caption: e.target.value } : { title: e.target.value })} />
            {!cap && <input placeholder="Issued by" value={m.issuer ?? ''} onChange={e => set(i, { issuer: e.target.value })} />}
            <button type="button" className="btn-sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button>
          </div>
        );
      })}
      <button type="button" className="btn-sm" onClick={() => onChange([...value, { type: 'photo', url: '' }])}>Add item</button>
    </div>
  );
}

function Field({ f, v, set, folder }: { f: F; v: any; set: (v: any) => void; folder: string }) {
  const id = 'f-' + f.k;
  const on = (e: { target: { value: string } }) => set(e.target.value);
  let input;
  if (f.t === 'select') input = <select id={id} value={v} onChange={on}>{f.opts!.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}</select>;
  else if (f.t === 'bool') input = <input id={id} type="checkbox" checked={!!v} onChange={e => set(e.target.checked)} />;
  else if (f.t === 'img') input = <ImageField value={v} onChange={set} folder={folder} />;
  else if (f.t === 'media') input = <MediaEditor value={v} onChange={set} />;
  else if (['area', 'ing', 'lines', 'links'].includes(f.t)) input = <textarea id={id} rows={f.big ? 16 : 5} value={v} onChange={on} placeholder={HINT[f.t]} />;
  else input = <input id={id} type={f.t === 'num' ? 'number' : f.t === 'date' ? 'date' : 'text'} value={v} onChange={on} />;
  return <div className="adm-field"><label htmlFor={id}>{f.label}</label>{input}{f.help && <small>{f.help}</small>}</div>;
}

function Manager({ rk }: { rk: string }) {
  const r = RES[rk];
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [msg, setMsg] = useState('');
  const toEdit = (row: Row) => ({ id: row.id, ...Object.fromEntries(r.fields.map(f => [f.k, toForm(f, row[f.k])])) });

  async function load() {
    if (r.single) {
      const { data, error } = await sb.from(r.table).select('*').eq('id', 1).single();
      if (error) setMsg(error.message); else setEdit({ ...toEdit(data), id: 1 });
      return;
    }
    let q = sb.from(r.table).select('*');
    for (const [k, v] of Object.entries(r.where ?? {})) q = q.eq(k, v as string);
    const { data, error } = await q.order(r.sortable ? 'sort_order' : 'created_at', { ascending: !!r.sortable }).limit(300);
    if (error) setMsg(error.message);
    setRows(data ?? []);
  }
  useEffect(() => { setEdit(null); setMsg(''); setRows([]); load(); }, [rk]);

  async function save() {
    if (!edit) return;
    const p: Row = { ...(r.where ?? {}) };
    for (const f of r.fields) p[f.k] = toRow(f, edit[f.k]);
    if (r.fields.some(f => f.k === 'slug') && !p.slug) {
      p.slug = slugify(p.title_en || p.dish || p.title || p.organization || '');
      if (!p.slug) { setMsg('Add a slug: English letters, numbers and hyphens.'); return; }
    }
    if (r.sortable && !edit.id) p.sort_order = rows.length;
    const t = sb.from(r.table);
    const { error } = edit.id ? await t.update(p).eq('id', edit.id) : await t.insert(p);
    if (error) { setMsg(error.message); return; }
    setMsg('Saved. The public site refreshes in a minute or two.');
    if (r.single) return;
    setEdit(null); load();
  }
  async function toggle(row: Row) {
    const patch = 'status' in row ? { status: row.status === 'published' ? 'draft' : 'published' } : { visible: !row.visible };
    const { error } = await sb.from(r.table).update(patch).eq('id', row.id);
    if (error) setMsg(error.message); else load();
  }
  async function remove(row: Row) {
    if (!confirm(`Delete "${r.title(row)}"? This cannot be undone.`)) return;
    const { error } = await sb.from(r.table).delete().eq('id', row.id);
    if (error) setMsg(error.message); else { setMsg('Deleted.'); load(); }
  }
  async function move(i: number, d: number) {
    const j = i + d; if (j < 0 || j >= rows.length) return;
    const next = [...rows]; [next[i], next[j]] = [next[j], next[i]];
    await Promise.all(next.map((row, k) => sb.from(r.table).update({ sort_order: k }).eq('id', row.id)));
    load();
  }
  async function addPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]; if (!files.length) return;
    setMsg(`Uploading ${files.length} photo(s)...`);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await upload(f, r.folder));
      const { error } = await sb.from(r.table).insert(urls.map((image_url, i) => ({ ...r.where, image_url, sort_order: rows.length + i })));
      if (error) throw error;
      setMsg('Photos added. Open each one to add a caption or description.'); load();
    } catch (x: any) { setMsg(x.message); }
  }
  const blank = () => Object.fromEntries(r.fields.map(f => [f.k, toForm(f, undefined)]));

  return (
    <div>
      {msg && <p className="adm-msg" role="status">{msg}</p>}
      {edit ? (
        <div className="adm-form">
          <h2>{r.single ? r.label : `${edit.id ? 'Edit' : 'New'}: ${r.label.toLowerCase()}`}</h2>
          {r.fields.map(f => <Field key={f.k} f={f} v={edit[f.k]} folder={r.folder} set={v => setEdit({ ...edit, [f.k]: v })} />)}
          <div className="adm-bar">
            <button className="btn primary" onClick={save}>Save</button>
            {!r.single && <button className="btn" onClick={() => setEdit(null)}>Cancel</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="adm-bar">
            <button className="btn primary" onClick={() => setEdit(blank())}>New</button>
            {r.multi && <label className="btn">Add photos<input type="file" accept="image/*" multiple hidden onChange={addPhotos} /></label>}
          </div>
          {rows.length === 0 && <p className="muted">Nothing here yet.</p>}
          <ul className="rows adm-list">
            {rows.map((row, i) => (
              <li key={row.id}>
                <span className="when">{'status' in row ? (row.status === 'published' ? 'Published' : 'Draft') : row.visible ? 'Shown' : 'Hidden'}</span>
                <div>
                  {(row.image_url || row.cover_url || row.photo_url) && <img className="adm-thumb" src={row.image_url || row.cover_url || row.photo_url} alt="" />}
                  <strong>{r.title(row)}</strong>{r.sub && r.sub(row) ? <p>{r.sub(row)}</p> : null}
                </div>
                <div className="adm-actions">
                  {r.sortable && <><button className="btn-sm" aria-label="Move up" onClick={() => move(i, -1)}>Up</button><button className="btn-sm" aria-label="Move down" onClick={() => move(i, 1)}>Down</button></>}
                  <button className="btn-sm" onClick={() => toggle(row)}>{'status' in row ? (row.status === 'published' ? 'Unpublish' : 'Publish') : row.visible ? 'Hide' : 'Show'}</button>
                  <button className="btn-sm" onClick={() => setEdit(toEdit(row))}>Edit</button>
                  <button className="btn-sm" onClick={() => remove(row)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  async function go(e: FormEvent) {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) setErr(error.message);
  }
  return (
    <form className="adm-login" onSubmit={go}>
      <h1 className="art-title" style={{ fontSize: '2.2rem' }}>Dashboard login</h1>
      <input type="email" placeholder="Email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} required />
      <button className="btn primary" type="submit">Log in</button>
      {err && <p className="adm-err">{err}</p>}
    </form>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState('hero');
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setOk(null); return; }
    sb.rpc('is_admin').then(({ data }) => setOk(!!data));
  }, [session]);

  if (session === undefined) return <p>Loading...</p>;
  if (!session) return <Login />;
  if (ok === null) return <p>Checking access...</p>;
  if (!ok) return <div><p>This account is not an admin. Add it to the admin list in Supabase first.</p><button className="btn" onClick={() => sb.auth.signOut()}>Log out</button></div>;
  return (
    <div>
      <div className="adm-top">
        <h1 className="art-title" style={{ fontSize: '2.2rem' }}>Dashboard</h1>
        <button className="btn-sm" onClick={() => sb.auth.signOut()}>Log out</button>
      </div>
      <nav className="adm-tabs" aria-label="Content">
        {Object.entries(RES).map(([k, v]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{v.label}</button>)}
      </nav>
      <Manager key={tab} rk={tab} />
    </div>
  );
}
