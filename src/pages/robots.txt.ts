import type { APIRoute } from 'astro';
import { u } from '../lib/site';
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: ${u('/admin')}\nSitemap: ${new URL(u('/sitemap.xml'), site).href}\n`);
