import { useState } from "react";
import { Modal, Text } from "@shopify/polaris";
import {
  SIZE_PX,
  SPACING_PX,
  type FeedPost,
  type FeedSettings,
} from "../../utils/instagram-feed-types";
import { useInstagramT } from "../../utils/instagram-i18n";

interface FeedPreviewProps {
  feed: FeedSettings;
  posts: FeedPost[];
  username: string | null;
  device: "desktop" | "mobile";
}

const PlayBadge = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.5))" }}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

const CarouselBadge = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.5))" }}>
    <rect x="7" y="7" width="13" height="13" rx="2" />
    <path d="M4 16V6a2 2 0 0 1 2-2h10" />
  </svg>
);

/**
 * Admin-side mirror of the storefront block
 * (extensions/terms-and-conditions/assets/instagram-feed.js), so merchants see
 * layout changes instantly before saving.
 */
export default function FeedPreview({ feed, posts, username, device }: FeedPreviewProps) {
  const t = useInstagramT();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const isMobile = device === "mobile";
  const cols = isMobile ? feed.colsMobile : feed.colsDesktop;
  const rows = isMobile ? feed.rowsMobile : feed.rowsDesktop;
  const gap = SPACING_PX[feed.postSpacing];
  const maxSize = SIZE_PX[feed.postSize];
  const circle = feed.postShape === "circle";
  const radius = circle ? 9999 : feed.cornerRadius;
  const ratio = circle ? "1 / 1" : feed.aspectRatio.replace(":", " / ");

  const frame: React.CSSProperties = {
    width: isMobile ? 375 : "100%",
    maxWidth: "100%",
    margin: "0 auto",
    minHeight: 220,
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: isMobile ? 24 : 12,
    padding: isMobile ? "24px 14px" : "28px 24px",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    transition: "width 0.25s ease",
  };

  if (posts.length === 0) {
    return (
      <div style={{ ...frame, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Text as="p" tone="subdued">{t.previewEmpty}</Text>
      </div>
    );
  }

  const tile = (post: FeedPost, index: number, style?: React.CSSProperties) => (
    <button
      key={post.id}
      type="button"
      onClick={() => setOpenIndex(index)}
      style={{
        position: "relative", display: "block", width: "100%", margin: "0 auto",
        padding: 0, border: 0, cursor: "pointer", background: "#F3F4F6",
        borderRadius: radius, overflow: "hidden", aspectRatio: ratio, ...style,
      }}
    >
      {post.mediaType === "VIDEO" ? (
        // Same as the storefront: videos autoplay muted in the feed.
        <video src={post.mediaUrl} poster={post.thumbnailUrl ?? undefined} autoPlay muted loop playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: feed.postFit, display: "block" }} />
      ) : (
        <img src={post.thumbnailUrl || post.mediaUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: feed.postFit, display: "block" }} />
      )}
      {(post.mediaType === "VIDEO" || post.mediaType === "CAROUSEL_ALBUM") && (
        <span style={{ position: "absolute", top: 6, right: 6 }}>
          {post.mediaType === "VIDEO" ? <PlayBadge /> : <CarouselBadge />}
        </span>
      )}
    </button>
  );

  const header = (feed.title || username) && feed.layout !== "floating" && (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      {feed.title ? <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 600, color: "#111827" }}>{feed.title}</div> : <span />}
      {username && <div style={{ fontSize: 13, color: "#6B7280" }}>@{username}</div>}
    </div>
  );

  const igRing = "linear-gradient(45deg,#feda75 0%,#fa7e1e 25%,#d62976 50%,#962fbf 75%,#4f5bd5 100%)";

  let body: React.ReactNode;
  if (feed.layout === "mosaic") {
    const mosaicCols = isMobile ? 2 : feed.colsDesktop;
    body = (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${mosaicCols}, minmax(0, 1fr))`, gridAutoFlow: "dense", gap }}>
        {posts.slice(0, Math.max(5, feed.rowsDesktop * feed.colsDesktop - 3)).map((post, i) =>
          tile(post, i, { aspectRatio: "1 / 1", height: "100%", ...(i === 0 ? { gridColumn: "span 2", gridRow: "span 2" } : {}) }),
        )}
      </div>
    );
  } else if (feed.layout === "masonry") {
    body = (
      <div style={{ columnCount: cols, columnGap: gap }}>
        {posts.slice(0, feed.rowsDesktop * feed.colsDesktop).map((post, i) => (
          <div key={post.id} style={{ breakInside: "avoid", marginBottom: gap }}>
            {tile(post, i, { aspectRatio: "auto" })}
          </div>
        ))}
      </div>
    );
  } else if (feed.layout === "reels") {
    const basis = `calc((100% - ${(cols - 1) * gap}px) / ${cols})`;
    body = (
      <div style={{ display: "flex", gap, overflowX: "auto", padding: feed.showSliderPreviews ? "0 8%" : 0, scrollbarWidth: "none" }}>
        {posts.map((post, i) => (
          <div key={post.id} style={{ flex: `0 0 ${basis}`, maxWidth: maxSize, position: "relative" }}>
            {tile(post, i, { aspectRatio: "9 / 16", borderRadius: Math.max(radius, 14) })}
            {post.caption && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "30px 10px 10px", borderRadius: `0 0 ${Math.max(radius, 14)}px ${Math.max(radius, 14)}px`, background: "linear-gradient(transparent, rgba(0,0,0,.75))", color: "#fff", fontSize: 12, lineHeight: 1.4, pointerEvents: "none", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {post.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } else if (feed.layout === "stories") {
    body = (
      <div style={{ display: "flex", gap: 16, overflowX: "auto", justifyContent: "safe center", paddingBottom: 6, scrollbarWidth: "none" }}>
        {posts.map((post, i) => (
          <button key={post.id} type="button" onClick={() => setOpenIndex(i)} style={{ flex: "0 0 auto", width: isMobile ? 72 : 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 0, border: 0, background: "none", cursor: "pointer" }}>
            <span style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "50%", padding: 3, background: igRing, display: "block" }}>
              <span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "3px solid #fff", display: "block", background: "#111" }}>
                {post.thumbnailUrl || post.mediaType !== "VIDEO" ? (
                  <img src={post.thumbnailUrl || post.mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <video src={post.mediaUrl} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                )}
              </span>
            </span>
            {post.caption && (
              <span style={{ fontSize: 11, color: "#374151", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {post.caption.split(/\s+/).slice(0, 2).join(" ")}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  } else if (feed.layout === "slider") {
    const basis = `calc((100% - ${(cols - 1) * gap}px) / ${cols})`;
    body = (
      <div style={{ display: "flex", gap, overflowX: "auto", padding: feed.showSliderPreviews ? "0 8%" : 0, scrollbarWidth: "none" }}>
        {posts.map((post, i) => (
          <div key={post.id} style={{ flex: `0 0 ${basis}`, maxWidth: maxSize }}>{tile(post, i)}</div>
        ))}
      </div>
    );
  } else if (feed.layout === "list") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap }}>
        {posts.slice(0, feed.rowsDesktop * feed.colsDesktop).map((post, i) => (
          <div key={post.id} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ flex: `0 0 ${Math.min(maxSize, isMobile ? 120 : maxSize)}px` }}>{tile(post, i)}</div>
            {post.caption && (
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {post.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } else if (feed.layout === "floating") {
    body = (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.5 }}>
          {[70, 90, 55, 80].map((w, i) => (
            <div key={i} style={{ height: 12, width: `${w}%`, background: "#E5E7EB", borderRadius: 6 }} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          style={{
            position: "absolute", right: 16, bottom: 16, width: 72, height: 72, borderRadius: "50%", padding: 3, border: 0, cursor: "pointer",
            background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", boxShadow: "0 6px 20px rgba(0,0,0,.25)",
          }}
        >
          <img src={posts[0].thumbnailUrl || posts[0].mediaUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", display: "block" }} />
        </button>
        <div style={{ marginTop: 28, marginRight: 90 }}>
          <Text as="p" variant="bodySm" tone="subdued">{t.floatingHint}</Text>
        </div>
      </>
    );
  } else {
    body = (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap, margin: "0 auto", maxWidth: isMobile ? undefined : cols * maxSize + (cols - 1) * gap }}>
        {posts.slice(0, rows * cols).map((post, i) => tile(post, i))}
      </div>
    );
  }

  const open = openIndex !== null ? posts[openIndex] : null;
  const slides = open?.carouselChildren?.length
    ? open.carouselChildren.map((c) => ({ type: c.media_type, url: c.media_url }))
    : open ? [{ type: open.mediaType, url: open.mediaUrl }] : [];

  return (
    <>
      <div style={frame}>
        {header}
        {body}
      </div>

      {open && (
        <Modal
          open
          onClose={() => setOpenIndex(null)}
          title={open.source === "instagram" && username ? `@${username}` : feed.title || t.previewTitle}
          secondaryActions={
            posts.length > 1
              ? [
                  { content: "‹", onAction: () => setOpenIndex((openIndex! - 1 + posts.length) % posts.length) },
                  { content: "›", onAction: () => setOpenIndex((openIndex! + 1) % posts.length) },
                ]
              : undefined
          }
        >
          <Modal.Section>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollSnapType: "x mandatory", background: "#000", borderRadius: 8 }}>
              {slides.map((slide, i) =>
                slide.type === "VIDEO" ? (
                  // Instagram media has no caption tracks to offer.
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video key={i} src={slide.url} controls playsInline style={{ maxHeight: 420, width: "100%", flex: "0 0 100%", scrollSnapAlign: "start" }} />
                ) : (
                  <img key={i} src={slide.url} alt="" style={{ maxHeight: 420, width: "100%", objectFit: "contain", flex: "0 0 100%", scrollSnapAlign: "start" }} />
                ),
              )}
            </div>
            {open.caption && (
              <div style={{ marginTop: 12, whiteSpace: "pre-line" }}>
                <Text as="p">{open.caption}</Text>
              </div>
            )}
            {feed.linkToOriginalPost && open.source === "instagram" && (
              <div style={{ marginTop: 12 }}>
                <a href={open.permalink} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "#111827" }}>
                  {t.viewOnInstagram} →
                </a>
              </div>
            )}
          </Modal.Section>
        </Modal>
      )}
    </>
  );
}
