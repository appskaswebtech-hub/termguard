import { useT } from "../utils/i18n";

interface AnalyticsOverviewProps {
  totalChecks: number;
  cartChecks: number;
  productChecks: number;
}

const tiles = [
  {
    key: "totalChecks",
    gradient: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
    shadow: "0 4px 12px rgba(99,102,241,0.35)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <rect x="18" y="3" width="4" height="18" rx="1"/>
        <rect x="10" y="8" width="4" height="13" rx="1"/>
        <rect x="2" y="13" width="4" height="8" rx="1"/>
      </svg>
    ),
  },
  {
    key: "cartChecks",
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    shadow: "0 4px 12px rgba(16,185,129,0.35)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <circle cx="9" cy="21" r="1"/>
        <circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
    ),
  },
  {
    key: "productChecks",
    gradient: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
    shadow: "0 4px 12px rgba(249,115,22,0.35)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
] as const;

export default function AnalyticsOverview({ totalChecks, cartChecks, productChecks }: AnalyticsOverviewProps) {
  const t = useT();
  const values: Record<string, number> = { totalChecks, cartChecks, productChecks };
  const labels: Record<string, string> = {
    totalChecks: t.dashboard.totalChecks,
    cartChecks: t.dashboard.cartChecks,
    productChecks: t.dashboard.productChecks,
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{t.dashboard.analyticsTitle}</div>
        <a href="/app/analytics" style={{ fontSize: 13, color: "#3B82F6", textDecoration: "none", fontWeight: 500 }}>
          {t.dashboard.viewAll} →
        </a>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {tiles.map((tile) => (
          <div
            key={tile.key}
            style={{
              flex: "1 1 140px",
              background: "#FAFAFA",
              borderRadius: 10,
              padding: "16px 20px",
              border: "1px solid #F3F4F6",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: tile.gradient,
                boxShadow: tile.shadow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              {tile.icon}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>
              {values[tile.key].toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {labels[tile.key]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
