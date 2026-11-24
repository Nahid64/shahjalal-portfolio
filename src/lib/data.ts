import { marked } from 'marked';
import { supabase } from './supabase';

export type Row = Record<string, any>;
async function run(p: PromiseLike<{ data: any; error: { message: string } | null }>): Promise<Row[]> {
  const { data, error } = await p;
  if (error) throw new Error('Supabase: ' + error.message);
  return data ?? [];
}
// The anon key + RLS means these only ever return published / visible rows.
const sel = (t: string) => supabase.from(t).select('*');
export const getPosts = (section: string) => run(sel('posts').eq('section', section).order('published_at', { ascending: false }));
export const getAllPosts = () => run(sel('posts').order('published_at', { ascending: false }).limit(8));
export const getRecipes = () => run(sel('recipes').order('published_at', { ascending: false }));
export const getCookingLog = () => run(sel('cooking_log').order('cooked_on', { ascending: false }));
export const getVolunteer = () => run(sel('volunteer_entries').order('sort_order').order('start_date', { ascending: false }));
export const getTools = () => run(sel('security_tools').order('category').order('sort_order'));
export const getGallery = (c: string) => run(sel('gallery_items').eq('collection', c).order('sort_order'));

export const md = (s = '') => marked.parse(s, { async: false, breaks: true }) as string;
export const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const titleOf = (r: Row): string => r.title_en || r.title_bn || r.title || r.dish || '';
export const iso = (min?: number) => (min ? `PT${min}M` : undefined);
export function embedUrl(url: string) {
  const y = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (y) return `https://www.youtube-nocookie.com/embed/${y[1]}`;
  const v = url.match(/vimeo\.com\/(\d+)/);
  return v ? `https://player.vimeo.com/video/${v[1]}` : null;
}
export const getSettings = async (): Promise<Row> => (await run(sel('site_settings').eq('id', 1)))[0] ?? {};
