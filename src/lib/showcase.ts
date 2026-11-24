import slideLeadership from "../assets/images/slide_leadership_seminar_1795421934895.jpg";
import slideComputer from "../assets/images/slide_computer_academy_1795421934691.jpg";
import slideBible from "../assets/images/slide_bible_school_1795421934851.jpg";
import slideBooks from "../assets/images/slide_bookstore_volumes_1795421934714.jpg";
import slideVideos from "../assets/images/slide_sermon_media_1795421934360.jpg";
import heroCreamSpine from "../assets/images/hero_cream_spine_1795421934538.jpg";
import { secureApiFetch } from "./aiClient";

export type ShowcaseTargetView =
  | "store"
  | "school"
  | "devotional"
  | "sermons-motivation"
  | "community"
  | "dashboard";

export interface ShowcaseSlide {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  imageUrl: string;
  ctaLabel: string;
  targetView: ShowcaseTargetView;
}

export interface SiteShowcaseConfig {
  heroBackdropUrl: string;
  heroEyebrow: string;
  heroTitleLead: string;
  heroTitleAccent: string;
  heroDescription: string;
  vision: string;
  mission: string;
  slogan: string;
  tagline: string;
  intervalMs: number;
  slides: ShowcaseSlide[];
  updatedAt: string;
}

export const HERO_BACKDROP_IMAGE = heroCreamSpine;
export const BOOKS_DEFAULT_COVER = slideBooks;

export const DEFAULT_SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    id: "slide-leadership",
    title: "Step up and lead where you are",
    subtitle: "Practical executive leadership training, ethics, and governance cohorts for emerging leaders.",
    category: "Leadership School",
    imageUrl: slideLeadership,
    ctaLabel: "Enter Leadership School",
    targetView: "school",
  },
  {
    id: "slide-bible",
    title: "Rooted in Scripture & Sound Doctrine",
    subtitle: "Full 66-book NIV Bible study companions, seminary notes, and ministry certificates.",
    category: "Bible School",
    imageUrl: slideBible,
    ctaLabel: "Open Bible & School",
    targetView: "devotional",
  },
  {
    id: "slide-computer",
    title: "Build Software & Digital Fluency",
    subtitle: "Hands-on programming, AI literacy, graphic design, and IT systems mastery.",
    category: "Computer Academy",
    imageUrl: slideComputer,
    ctaLabel: "Explore Computer Track",
    targetView: "school",
  },
  {
    id: "slide-books",
    title: "Curated E-Books & Author Library",
    subtitle: "Read original leadership volumes, theology guides, and devotional books in offline-ready comfort.",
    category: "Digital Bookstore",
    imageUrl: slideBooks,
    ctaLabel: "Browse Bookstore",
    targetView: "store",
  },
  {
    id: "slide-videos",
    title: "Watch Sermons, Worship & Teaching Videos",
    subtitle: "Stream and save uplifting gospel sermons, choral worship, and conference sessions anytime.",
    category: "Video & Music Hub",
    imageUrl: slideVideos,
    ctaLabel: "Watch Media Library",
    targetView: "sermons-motivation",
  },
];

export const DEFAULT_SHOWCASE_CONFIG: SiteShowcaseConfig = {
  heroBackdropUrl: heroCreamSpine,
  heroEyebrow: "ZION DIGITAL · LEADERSHIP & BIBLE SCHOOL",
  heroTitleLead: "Lead With Faith.",
  heroTitleAccent: "Transform With Wisdom.",
  heroDescription:
    "A leadership and Bible school platform by Kelvin Opara Wafula — watch video sermons, study curated digital books, and earn accredited academy diplomas.",
  vision:
    "To be Africa's leading digital knowledge platform, empowering every reader to grow, lead, and transform their world.",
  mission:
    "To provide accessible, premium digital books, media, and leadership education that inspire action, wisdom, and lasting impact.",
  slogan: "Read. Lead. Transform.",
  tagline: "Knowledge That Transforms You",
  intervalMs: 2000,
  slides: DEFAULT_SHOWCASE_SLIDES,
  updatedAt: "2026-11-21T00:00:00.000Z",
};

const STORAGE_KEY = "ZION_SITE_SHOWCASE_V1";
export const SHOWCASE_EVENT = "ZION_SHOWCASE_UPDATED";

export function loadShowcaseLocal(): SiteShowcaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHOWCASE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<SiteShowcaseConfig>;
    const slides =
      Array.isArray(parsed.slides) && parsed.slides.length > 0
        ? parsed.slides.map((s, i) => ({
            id: s.id || `slide_${i}`,
            title: s.title || DEFAULT_SHOWCASE_SLIDES[i % DEFAULT_SHOWCASE_SLIDES.length].title,
            subtitle: s.subtitle || "",
            category: s.category || "Highlight",
            imageUrl: s.imageUrl || DEFAULT_SHOWCASE_SLIDES[i % DEFAULT_SHOWCASE_SLIDES.length].imageUrl,
            ctaLabel: s.ctaLabel || "Explore Now",
            targetView: (s.targetView as ShowcaseTargetView) || "store",
          }))
        : DEFAULT_SHOWCASE_SLIDES;

    return {
      ...DEFAULT_SHOWCASE_CONFIG,
      ...parsed,
      intervalMs: Math.max(1500, Number(parsed.intervalMs) || 2000),
      slides,
    };
  } catch {
    return DEFAULT_SHOWCASE_CONFIG;
  }
}

export function persistShowcaseLocal(config: SiteShowcaseConfig): SiteShowcaseConfig {
  const normalized: SiteShowcaseConfig = {
    ...DEFAULT_SHOWCASE_CONFIG,
    ...config,
    intervalMs: Math.max(1500, Number(config.intervalMs) || 2000),
    slides: config.slides.length > 0 ? config.slides : DEFAULT_SHOWCASE_SLIDES,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(SHOWCASE_EVENT, { detail: normalized }));
  } catch (err) {
    console.warn("Could not save showcase config to localStorage:", err);
  }
  return normalized;
}

export async function fetchShowcaseFromServer(): Promise<SiteShowcaseConfig> {
  const local = loadShowcaseLocal();
  try {
    const res = await fetch("/api/site/showcase");
    if (!res.ok) return local;
    const data = await res.json();
    if (data?.success && data?.showcase) {
      const merged: SiteShowcaseConfig = {
        ...DEFAULT_SHOWCASE_CONFIG,
        ...data.showcase,
        intervalMs: Math.max(1500, Number(data.showcase.intervalMs) || 2000),
        slides:
          Array.isArray(data.showcase.slides) && data.showcase.slides.length > 0
            ? data.showcase.slides
            : local.slides,
      };
      persistShowcaseLocal(merged);
      return merged;
    }
  } catch {
    // Offline or standalone preview fallback
  }
  return local;
}

export async function saveShowcaseRemote(
  config: SiteShowcaseConfig
): Promise<{ success: boolean; config: SiteShowcaseConfig; error?: string }> {
  const savedLocal = persistShowcaseLocal(config);
  try {
    const res = await secureApiFetch("/api/site/showcase", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savedLocal),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return {
        success: false,
        config: savedLocal,
        error: data?.error || "Saved locally; server sync requires verified manager session.",
      };
    }
    return { success: true, config: persistShowcaseLocal(data.showcase || savedLocal) };
  } catch (err: any) {
    return {
      success: false,
      config: savedLocal,
      error: err?.message || "Saved locally in browser.",
    };
  }
}

export function subscribeShowcaseUpdates(cb: (config: SiteShowcaseConfig) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<SiteShowcaseConfig>;
    cb(custom.detail || loadShowcaseLocal());
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cb(loadShowcaseLocal());
    }
  };
  window.addEventListener(SHOWCASE_EVENT, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(SHOWCASE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
