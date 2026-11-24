export const SITE = {
  name: 'MD Shahjalal Nahid',
  nameBn: 'মো. শাহজালাল নাহিদ',
  description: 'Writer, volunteer, cook, maker and aspiring SOC analyst from Bangladesh. Poetry, stories, recipes, security notes and more.',
};

// Prefixes every internal link with the GitHub Pages base path.
export const u = (p: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + p;

export const SECTIONS = [
  { slug: 'writing', label: 'Writing', bn: 'লেখালেখি', blurb: 'Poetry, short stories, longer fiction and journal reflections.' },
  { slug: 'volunteer', label: 'Volunteer work', bn: 'স্বেচ্ছাসেবা', blurb: 'Humanitarian and community work, with roles, places and recognition.' },
  { slug: 'kitchen', label: 'Kitchen', bn: 'রান্নাঘর', blurb: 'Step-by-step recipes and a log of what I cooked and for whom.' },
  { slug: 'security', label: 'Security', bn: 'সাইবার নিরাপত্তা', blurb: 'Blue team and SOC learning: tools, notes and write-ups.' },
  { slug: 'miniatures', label: 'Miniatures', bn: 'মিনিয়েচার', blurb: 'Miniature crafts and dry-material creations, from every angle.' },
  { slug: 'thoughts', label: 'Political thoughts', bn: 'রাজনৈতিক ভাবনা', blurb: 'Essays and opinions on politics and public life.' },
] as const;

export const NAV = [...SECTIONS.map(s => ({ href: u('/' + s.slug), label: s.label })), { href: u('/about'), label: 'About' }];
