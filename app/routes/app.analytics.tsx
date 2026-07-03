import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { Pagination, Select } from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useT } from "../utils/i18n";

const LOCATIONS = ["cart", "product", "collection", "custom"] as const;
const PAGE_SIZE = 10;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("range") || "30");
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));

  const since = startOfDay(new Date());
  since.setDate(since.getDate() - (days - 1));

  const prevSince = startOfDay(new Date(since));
  prevSince.setDate(prevSince.getDate() - days);

  const [events, prevEvents] = await Promise.all([
    db.analyticsEvent.findMany({ where: { shop, createdAt: { gte: since } }, orderBy: { createdAt: "asc" } }),
    db.analyticsEvent.findMany({ where: { shop, createdAt: { gte: prevSince, lt: since } } }),
  ]);

  const calcStats = (evts: typeof events) => {
    const total = evts.filter((e) => e.checked).length;
    const byLoc: Record<string, number> = { cart: 0, product: 0, collection: 0, custom: 0 };
    for (const e of evts) {
      if (e.checked && byLoc[e.location] !== undefined) byLoc[e.location] += 1;
    }
    return { total, ...byLoc };
  };

  const stats = calcStats(events);
  const prevStats = calcStats(prevEvents);

  const trend = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const trends = {
    total: trend(stats.total, prevStats.total),
    cart: trend(stats.cart, prevStats.cart),
    product: trend(stats.product, prevStats.product),
    collection: trend(stats.collection, prevStats.collection),
    custom: trend(stats.custom, prevStats.custom),
  };

  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    dates.push(dateKey(d));
  }

  const locMaps: Record<string, Map<string, number>> = {
    cart: new Map(dates.map((d) => [d, 0])),
    product: new Map(dates.map((d) => [d, 0])),
    collection: new Map(dates.map((d) => [d, 0])),
    custom: new Map(dates.map((d) => [d, 0])),
  };
  for (const e of events) {
    if (e.checked && locMaps[e.location]) {
      const key = dateKey(e.createdAt);
      if (locMaps[e.location].has(key)) locMaps[e.location].set(key, (locMaps[e.location].get(key) || 0) + 1);
    }
  }

  const dailySeries = dates.map((date) => ({
    date,
    cart: locMaps.cart.get(date) || 0,
    product: locMaps.product.get(date) || 0,
    collection: locMaps.collection.get(date) || 0,
    custom: locMaps.custom.get(date) || 0,
  }));

  const activityMap = new Map<string, { date: string; location: string; checks: number; blocked: number }>();
  for (const e of events) {
    const key = `${dateKey(e.createdAt)}|${e.location}`;
    if (!activityMap.has(key)) activityMap.set(key, { date: dateKey(e.createdAt), location: e.location, checks: 0, blocked: 0 });
    const row = activityMap.get(key)!;
    if (e.checked) row.checks += 1;
    if (e.blocked) row.blocked += 1;
  }
  const allActivity = Array.from(activityMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalPages = Math.max(1, Math.ceil(allActivity.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const activity = allActivity.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return { stats, trends, dailySeries, activity, page: currentPage, totalPages, days };
};

// ── Icons ──────────────────────────────────────────────────────────────────
const IconBarChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/>
  </svg>
);
const IconCart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IconBox = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconDoc = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconTarget = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconTrendUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconTrendDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
  </svg>
);

// ── Stat Card ──────────────────────────────────────────────────────────────
const STAT_CONFIGS = [
  { key: "total",      icon: <IconBarChart />, gradient: "linear-gradient(135deg,#3B82F6,#6366F1)", shadow: "0 4px 12px rgba(99,102,241,0.35)",  label: "totalChecks" },
  { key: "cart",       icon: <IconCart />,     gradient: "linear-gradient(135deg,#06B6D4,#3B82F6)", shadow: "0 4px 12px rgba(59,130,246,0.35)",   label: "cartChecks" },
  { key: "product",    icon: <IconBox />,      gradient: "linear-gradient(135deg,#F97316,#EF4444)", shadow: "0 4px 12px rgba(249,115,22,0.35)",   label: "productChecks" },
  { key: "collection", icon: <IconDoc />,      gradient: "linear-gradient(135deg,#8B5CF6,#A855F7)", shadow: "0 4px 12px rgba(139,92,246,0.35)",   label: "collectionPage" },
  { key: "custom",     icon: <IconTarget />,   gradient: "linear-gradient(135deg,#EC4899,#F43F5E)", shadow: "0 4px 12px rgba(236,72,153,0.35)",   label: "customPlacement" },
] as const;

const LOCATION_CONFIGS = [
  { key: "cart",       icon: <IconCart />,   gradient: "linear-gradient(135deg,#06B6D4,#3B82F6)", shadow: "0 4px 12px rgba(59,130,246,0.30)",  color: "#fff", label: "Cart page" },
  { key: "product",    icon: <IconBox />,    gradient: "linear-gradient(135deg,#10B981,#059669)", shadow: "0 4px 12px rgba(16,185,129,0.30)",  color: "#fff", label: "Product page" },
  { key: "collection", icon: <IconDoc />,    gradient: "linear-gradient(135deg,#F59E0B,#F97316)", shadow: "0 4px 12px rgba(245,158,11,0.30)",  color: "#fff", label: "Collection page" },
  { key: "custom",     icon: <IconTarget />, gradient: "linear-gradient(135deg,#EC4899,#F43F5E)", shadow: "0 4px 12px rgba(236,72,153,0.30)",  color: "#fff", label: "Custom placement" },
];

function StatCard({ icon, gradient, shadow, label, value, trend }: { icon: React.ReactNode; gradient: string; shadow: string; label: string; value: number; trend: number }) {
  const isUp = trend >= 0;
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", flex: 1, minWidth: 160 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: gradient, boxShadow: shadow, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{value}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 600, color: isUp ? "#10B981" : "#EF4444", background: isUp ? "#ECFDF5" : "#FEF2F2", padding: "3px 8px", borderRadius: 20 }}>
          {isUp ? <IconTrendUp /> : <IconTrendDown />}
          {Math.abs(trend)}%
        </span>
      </div>
    </div>
  );
}

// ── Multi-Series Smooth Line Chart ────────────────────────────────────────
const SERIES = [
  { key: "cart",       color: "#3B82F6", label: "Cart" },
  { key: "product",    color: "#10B981", label: "Product" },
  { key: "collection", color: "#F59E0B", label: "Collection" },
  { key: "custom",     color: "#EC4899", label: "Custom" },
] as const;

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.4;
    const cp1y = pts[i].y;
    const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) * 0.4;
    const cp2y = pts[i + 1].y;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

function LineChart({ data }: { data: { date: string; cart: number; product: number; collection: number; custom: number }[] }) {
  if (!data.length) return null;
  const W = 580; const H = 200; const PL = 36; const PR = 12; const PT = 12; const PB = 32;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;
  const allVals = data.flatMap((d) => [d.cart, d.product, d.collection, d.custom]);
  const max = Math.max(1, ...allVals);
  const labelStep = Math.ceil(data.length / 7);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));

  const getPts = (key: string) =>
    data.map((d, i) => ({
      x: PL + i * stepX,
      y: PT + chartH - ((d as Record<string, number>)[key] / max) * chartH,
    }));

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
        {SERIES.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280" }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: s.color, display: "inline-block" }} />
            {s.label}
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
        <defs>
          {SERIES.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>
        {/* Grid */}
        {yTicks.map((v) => {
          const y = PT + chartH - (v / max) * chartH;
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#F3F4F6" strokeWidth="1" />
              <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">{v.toFixed(2)}</text>
            </g>
          );
        })}
        {/* Area fills */}
        {SERIES.map((s) => {
          const pts = getPts(s.key);
          const linePath = smoothPath(pts);
          const areaPath = `${linePath} L${pts[pts.length - 1].x},${PT + chartH} L${pts[0].x},${PT + chartH} Z`;
          return <path key={s.key + "-area"} d={areaPath} fill={`url(#grad-${s.key})`} />;
        })}
        {/* Lines */}
        {SERIES.map((s) => {
          const pts = getPts(s.key);
          return (
            <path key={s.key + "-line"} d={smoothPath(pts)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          );
        })}
        {/* X labels */}
        {data.filter((_, i) => i % labelStep === 0 || i === data.length - 1).map((d, _, arr) => {
          const i = data.indexOf(d);
          return (
            <text key={d.date} x={PL + i * stepX} y={H - 4} textAnchor="middle" fontSize="10" fill="#9CA3AF">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Location Row ───────────────────────────────────────────────────────────
function LocationRow({ icon, gradient, shadow, label, value, total }: { icon: React.ReactNode; gradient: string; shadow: string; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: gradient, boxShadow: shadow, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{pct}%</div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Analytics() {
  const { stats, trends, dailySeries, activity, page, totalPages, days } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const t = useT();

  const RANGE_OPTIONS = [
    { label: t.analytics.last7, value: "7" },
    { label: t.analytics.last30, value: "30" },
    { label: t.analytics.last90, value: "90" },
  ];

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  };

  const statLabels: Record<string, string> = {
    totalChecks: t.analytics.totalChecks,
    cartChecks: t.analytics.cartChecks,
    productChecks: t.analytics.productChecks,
    collectionPage: t.settings?.collection || "Collection page",
    customPlacement: t.settings?.custom || "Custom placement",
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{t.analytics.title}</div>
        </div>
        <div style={{ width: 160 }}>
          <Select label="" labelHidden options={RANGE_OPTIONS} value={String(days)} onChange={(v) => updateParam("range", v)} />
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {STAT_CONFIGS.map((cfg) => (
          <StatCard
            key={cfg.key}
            icon={cfg.icon}
            gradient={cfg.gradient}
            shadow={cfg.shadow}
            label={statLabels[cfg.label]}
            value={(stats as Record<string, number>)[cfg.key]}
            trend={(trends as Record<string, number>)[cfg.key]}
          />
        ))}
      </div>

      {/* Chart + Location */}
      <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 55%", background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>{t.analytics.checksOverTime}</div>
          {stats.total > 0 ? (
            <LineChart data={dailySeries} />
          ) : (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 14 }}>
              {t.analytics.noData}
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 30%", background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>{t.analytics.checksByLocation}</div>
          {LOCATION_CONFIGS.map((cfg) => (
            <LocationRow
              key={cfg.key}
              icon={cfg.icon}
              gradient={cfg.gradient}
              shadow={cfg.shadow}
              label={cfg.label}
              value={(stats as Record<string, number>)[cfg.key]}
              total={stats.total}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>{t.analytics.recentActivity}</div>
        {activity.length > 0 ? (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
                  {[t.analytics.date, t.analytics.location, t.analytics.checks, t.analytics.blocks, t.analytics.conversion].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#6B7280" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.map((row, i) => {
                  const denom = row.checks + row.blocked;
                  const rate = denom > 0 ? ((row.checks / denom) * 100).toFixed(1) : "0.0";
                  const locCfg = LOCATION_CONFIGS.find((l) => l.key === row.location);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #F9FAFB" }}>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#374151" }}>{row.date}</td>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#374151" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {locCfg && (
                            <span style={{ width: 22, height: 22, borderRadius: 5, background: locCfg.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ color: "#fff", display: "flex", transform: "scale(0.75)" }}>{locCfg.icon}</span>
                            </span>
                          )}
                          {locCfg?.label || row.location}
                        </div>
                      </td>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#374151", fontWeight: 600 }}>{row.checks}</td>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#374151" }}>{row.blocked}</td>
                      <td style={{ padding: "12px 12px", fontSize: 14 }}>
                        <span style={{ color: "#10B981", fontWeight: 600 }}>{rate}%</span>
                        <span style={{ display: "inline-block", marginLeft: 8 }}>
                          <svg width="32" height="16" viewBox="0 0 32 16"><path d="M2 8 Q8 4 16 8 Q24 12 30 8" fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <Pagination
                hasPrevious={page > 1}
                hasNext={page < totalPages}
                onPrevious={() => updateParam("page", String(page - 1))}
                onNext={() => updateParam("page", String(page + 1))}
              />
            </div>
          </>
        ) : (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
            {t.analytics.noActivity}
          </div>
        )}
      </div>
    </div>
  );
}
