import type { APIRoute } from 'astro';
import { SECTIONS, u } from '../lib/site';
import { getPosts, getRecipes, getCookingLog, getVolunteer } from '../lib/data';

export const GET: APIRoute = async ({ site }) => {
  const [w, s, t, r, l, v] = await Promise.all([getPosts('writing'), getPosts('security'), getPosts('thoughts'), getRecipes(), getCookingLog(), getVolunteer()]);
  const item = (path: string, at?: string) => ({ path, at });
  const urls = [
    item('/'), item('/about'), ...SECTIONS.map(x => item('/' + x.slug)),
    ...w.map(x => item(`/writing/${x.slug}`, x.updated_at)),
    ...s.map(x => item(`/security/${x.slug}`, x.updated_at)),
    ...t.map(x => item(`/thoughts/${x.slug}`, x.updated_at)),
    ...r.map(x => item(`/kitchen/recipes/${x.slug}`, x.updated_at)),
    ...l.map(x => item(`/kitchen/log/${x.slug}`, x.updated_at)),
    ...v.map(x => item(`/volunteer/${x.slug}`, x.updated_at)),
  ];
  const body = urls.map(x => `<url><loc>${new URL(u(x.path), site).href}</loc>${x.at ? `<lastmod>${x.at.slice(0, 10)}</lastmod>` : ''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } });
};
