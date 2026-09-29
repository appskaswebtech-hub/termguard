import { useInstagramT } from "../../utils/instagram-i18n";

interface InstagramHomeCardProps {
  username: string | null;
  postCount: number;
  thumbnails: string[];
  isPro: boolean;
}

export default function InstagramHomeCard({ username, postCount, thumbnails, isPro }: InstagramHomeCardProps) {
  const t = useInstagramT();
  const configured = Boolean(username) || postCount > 0;

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(214,36,159,0.3)" }}>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.8" fill="#fff" />
        </svg>
      </div>

      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{t.homeTitle}</span>
          {!configured && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#BE185D", background: "#FCE7F3", borderRadius: 99, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {t.newBadge}
            </span>
          )}
          {!isPro && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", borderRadius: 99, padding: "2px 8px", letterSpacing: "0.04em" }}>
              PRO
            </span>
          )}
          {username && <span style={{ fontSize: 13, color: "#6B7280" }}>@{username}</span>}
        </div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>{t.homeDesc}</div>
      </div>

      {thumbnails.length > 0 && (
        <div style={{ display: "flex" }}>
          {thumbnails.slice(0, 4).map((src, i) => (
            <img key={src} src={src} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", border: "2px solid #fff", marginLeft: i ? -10 : 0, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
          ))}
        </div>
      )}

      <a
        href={isPro ? "/app/instagram" : "/app/billing"}
        style={{ background: configured ? "#fff" : "linear-gradient(135deg,#3B82F6,#6366F1)", color: configured ? "#3B82F6" : "#fff", border: configured ? "1.5px solid #BFDBFE" : "none", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
      >
        {!isPro ? t.proCta : configured ? t.homeManage : t.homeCta}
      </a>
    </div>
  );
}
