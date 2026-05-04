import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: object | object[];
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    if (selector.startsWith('link')) {
      el = document.createElement('link');
      const rel = selector.match(/rel="([^"]+)"/)?.[1];
      if (rel) (el as HTMLLinkElement).rel = rel;
    } else {
      el = document.createElement('meta');
      const name = selector.match(/name="([^"]+)"/)?.[1];
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (name) (el as HTMLMetaElement).name = name;
      if (prop) (el as HTMLMetaElement).setAttribute('property', prop);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/**
 * Sets document SEO tags imperatively. Single page use; restores previous title on unmount.
 */
export function SEO({ title, description, canonical, ogImage, jsonLd }: SEOProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    setMeta('meta[name="description"]', 'content', description);
    if (canonical) setMeta('link[rel="canonical"]', 'href', canonical);

    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:type"]', 'content', 'website');
    if (canonical) setMeta('meta[property="og:url"]', 'content', canonical);
    if (ogImage) setMeta('meta[property="og:image"]', 'content', ogImage);

    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
    if (ogImage) setMeta('meta[name="twitter:image"]', 'content', ogImage);

    document.documentElement.lang = 'nl-BE';

    let scriptEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.text = JSON.stringify(jsonLd);
      scriptEl.dataset.seo = 'beta';
      document.head.appendChild(scriptEl);
    }

    return () => {
      document.title = prevTitle;
      if (scriptEl) scriptEl.remove();
    };
  }, [title, description, canonical, ogImage, jsonLd]);

  return null;
}
