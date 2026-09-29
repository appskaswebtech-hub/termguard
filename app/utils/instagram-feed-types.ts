export interface FeedSettings {
  postsToShow: "all" | "instagram" | "reels" | "custom";
  layout: "grid" | "mosaic" | "masonry" | "slider" | "reels" | "stories" | "list" | "floating";
  title: string;
  onPostClick: "popup" | "redirect";
  postSpacing: "none" | "small" | "medium" | "large";
  aspectRatio: "1:1" | "3:4" | "4:5" | "9:16" | "16:9";
  postFit: "cover" | "contain";
  postShape: "rectangle" | "circle";
  cornerRadius: number;
  postSize: "small" | "medium" | "large" | "xlarge";
  rowsDesktop: number;
  colsDesktop: number;
  rowsMobile: number;
  colsMobile: number;
  showLoadingAnimation: boolean;
  linkToOriginalPost: boolean;
  showSliderPreviews: boolean;
}

/** A post as the storefront block and the admin preview render it. */
export interface FeedPost {
  id: string;
  source: "instagram" | "custom";
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  mediaUrl: string;
  thumbnailUrl: string | null;
  permalink: string;
  caption: string | null;
  carouselChildren: { media_type: string; media_url: string; thumbnail_url?: string }[] | null;
}

export const DEFAULT_FEED: FeedSettings = {
  postsToShow: "all",
  layout: "grid",
  title: "",
  onPostClick: "popup",
  postSpacing: "small",
  aspectRatio: "3:4",
  postFit: "cover",
  postShape: "rectangle",
  cornerRadius: 0,
  postSize: "medium",
  rowsDesktop: 2,
  colsDesktop: 4,
  rowsMobile: 2,
  colsMobile: 2,
  showLoadingAnimation: false,
  linkToOriginalPost: false,
  showSliderPreviews: false,
};

// Pixel values shared by the admin preview and the storefront script
// (extensions/terms-and-conditions/assets/instagram-feed.js) — keep in sync.
export const SPACING_PX: Record<FeedSettings["postSpacing"], number> = { none: 0, small: 8, medium: 16, large: 24 };
export const SIZE_PX: Record<FeedSettings["postSize"], number> = { small: 180, medium: 260, large: 340, xlarge: 420 };

const ENUMS: { [K in keyof FeedSettings]?: readonly string[] } = {
  postsToShow: ["all", "instagram", "reels", "custom"],
  layout: ["grid", "mosaic", "masonry", "slider", "reels", "stories", "list", "floating"],
  onPostClick: ["popup", "redirect"],
  postSpacing: ["none", "small", "medium", "large"],
  aspectRatio: ["1:1", "3:4", "4:5", "9:16", "16:9"],
  postFit: ["cover", "contain"],
  postShape: ["rectangle", "circle"],
  postSize: ["small", "medium", "large", "xlarge"],
};

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const pickEnum = <K extends keyof FeedSettings>(key: K, value: unknown): FeedSettings[K] =>
  (ENUMS[key]?.includes(String(value)) ? value : DEFAULT_FEED[key]) as FeedSettings[K];

/** Coerce untrusted input (a request body or an old DB row) into valid feed settings. */
export function normalizeFeed(input: Partial<Record<keyof FeedSettings, unknown>> | null | undefined): FeedSettings {
  const src = input ?? {};
  return {
    postsToShow: pickEnum("postsToShow", src.postsToShow),
    layout: pickEnum("layout", src.layout),
    title: String(src.title ?? "").slice(0, 120),
    onPostClick: pickEnum("onPostClick", src.onPostClick),
    postSpacing: pickEnum("postSpacing", src.postSpacing),
    aspectRatio: pickEnum("aspectRatio", src.aspectRatio),
    postFit: pickEnum("postFit", src.postFit),
    postShape: pickEnum("postShape", src.postShape),
    cornerRadius: clampInt(src.cornerRadius, 0, 50, DEFAULT_FEED.cornerRadius),
    postSize: pickEnum("postSize", src.postSize),
    rowsDesktop: clampInt(src.rowsDesktop, 1, 10, DEFAULT_FEED.rowsDesktop),
    colsDesktop: clampInt(src.colsDesktop, 1, 8, DEFAULT_FEED.colsDesktop),
    rowsMobile: clampInt(src.rowsMobile, 1, 10, DEFAULT_FEED.rowsMobile),
    colsMobile: clampInt(src.colsMobile, 1, 4, DEFAULT_FEED.colsMobile),
    showLoadingAnimation: src.showLoadingAnimation === true,
    linkToOriginalPost: src.linkToOriginalPost === true,
    showSliderPreviews: src.showSliderPreviews === true,
  };
}

/** Apply the "posts to show" filter — shared so the preview matches the storefront. */
export function filterPosts<T extends FeedPost>(posts: T[], postsToShow: FeedSettings["postsToShow"]): T[] {
  if (postsToShow === "instagram") return posts.filter((p) => p.source === "instagram");
  if (postsToShow === "custom") return posts.filter((p) => p.source === "custom");
  if (postsToShow === "reels") return posts.filter((p) => p.mediaType === "VIDEO");
  return posts;
}
