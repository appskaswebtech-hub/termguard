import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { Pagination, Select } from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useT } from "../utils/i18n";

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
    const cart = evts.filter((e) => e.checked && e.location === "cart").length;
    const blocked = evts.filter((e) => e.blocked).length;
    // Share of checkout attempts where the shopper accepted the terms.
    const rate = total + blocked > 0 ? Math.round((total / (total + blocked)) * 100) : 0;
    return { total, cart, blocked, rate };
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
    blocked: trend(stats.blocked, prevStats.blocked),
    rate: stats.rate - prevStats.rate, // percentage points
  };

  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    dates.push(dateKey(d));
  }

  const series = new Map(dates.map((d) => [d, { date: d, checks: 0, blocked: 0 }]));
  for (const e of events) {
    const row = series.get(dateKey(e.createdAt));
    if (!row) continue;
    if (e.checked) row.checks += 1;
    if (e.blocked) row.blocked += 1;
  }
  const dailySeries = Array.from(series.values());

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
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
  </svg>
);
const IconPercent = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
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
function StatCard({ icon, gradient, shadow, label, value, trend, suffix = "", trendUnit = "%", upIsGood = true }: {
  icon: React.ReactNode; gradient: string; shadow: string; label: string; value: number; trend: number;
  suffix?: string; trendUnit?: string; upIsGood?: boolean;
}) {
  const isUp = trend >= 0;
  const good = isUp === upIsGood;
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", flex: "1 1 200px", minWidth: 180 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: gradient, boxShadow: shadow, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{value}{suffix}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 600, color: good ? "#10B981" : "#EF4444", background: good ? "#ECFDF5" : "#FEF2F2", padding: "3px 8px", borderRadius: 20 }}>
          {isUp ? <IconTrendUp /> : <IconTrendDown />}
          {Math.abs(trend)}{trendUnit}
        </span>
      </div>
    </div>
  );
}

// ── Smooth line chart: accepted vs blocked ─────────────────────────────────
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.4;
    const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) * 0.4;
    d += ` C${cp1x},${pts[i].y} ${cp2x},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

type Point = { date: string; checks: number; blocked: number };

function LineChart({ data, series }: { data: Point[]; series: { key: "checks" | "blocked"; color: string; label: string }[] }) {
  if (!data.length) return null;
  const W = 900; const H = 220; const PL = 32; const PR = 12; const PT = 12; const PB = 32;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;
  const max = Math.max(1, ...data.flatMap((d) => [d.checks, d.blocked]));
  const labelStep = Math.ceil(data.length / 8);
  const yTicks = Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max))));

  const getPts = (key: "checks" | "blocked") =>
    data.map((d, i) => ({ x: PL + i * stepX, y: PT + chartH - (d[key] / max) * chartH }));

  return (
    <div>
      <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
        {series.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280" }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: s.color, display: "inline-block" }} />
            {s.label}
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>
        {yTicks.map((v) => {
          const y = PT + chartH - (v / max) * chartH;
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#F3F4F6" strokeWidth="1" />
              <text x={PL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">{v}</text>
            </g>
          );
        })}
        {series.map((s) => {
          const pts = getPts(s.key);
          const linePath = smoothPath(pts);
          const areaPath = `${linePath} L${pts[pts.length - 1].x},${PT + chartH} L${pts[0].x},${PT + chartH} Z`;
          return (
            <g key={s.key}>
              <path d={areaPath} fill={`url(#grad-${s.key})`} />
              <path d={linePath} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
        {data.map((d, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <text key={d.date} x={PL + i * stepX} y={H - 4} textAnchor="middle" fontSize="10" fill="#9CA3AF">
              {d.date.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

const LOCATION_LABELS: Record<string, string> = {
  cart: "Cart page",
  checkout: "Checkout buttons",
  product: "Product page",
  collection: "Collection page",
  custom: "Custom placement",
};

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

  const hasData = stats.total + stats.blocked > 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{t.analytics.title}</div>
        <div style={{ width: 160 }}>
          <Select label="" labelHidden options={RANGE_OPTIONS} value={String(days)} onChange={(v) => updateParam("range", v)} />
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon={<IconBarChart />} gradient="linear-gradient(135deg,#3B82F6,#6366F1)" shadow="0 4px 12px rgba(99,102,241,0.35)"
          label={t.analytics.totalChecks} value={stats.total} trend={trends.total} />
        <StatCard icon={<IconCart />} gradient="linear-gradient(135deg,#06B6D4,#3B82F6)" shadow="0 4px 12px rgba(59,130,246,0.35)"
          label={t.analytics.cartChecks} value={stats.cart} trend={trends.cart} />
        <StatCard icon={<IconShield />} gradient="linear-gradient(135deg,#F97316,#EF4444)" shadow="0 4px 12px rgba(249,115,22,0.35)"
          label={t.analytics.blocked} value={stats.blocked} trend={trends.blocked} upIsGood={false} />
        <StatCard icon={<IconPercent />} gradient="linear-gradient(135deg,#10B981,#059669)" shadow="0 4px 12px rgba(16,185,129,0.35)"
          label={t.analytics.conversion} value={stats.rate} suffix="%" trend={trends.rate} trendUnit=" pts" />
      </div>

      {/* Chart */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 16 }}>{t.analytics.checksOverTime}</div>
        {hasData ? (
          <LineChart
            data={dailySeries}
            series={[
              { key: "checks", color: "#3B82F6", label: t.analytics.checks },
              { key: "blocked", color: "#EF4444", label: t.analytics.blocks },
            ]}
          />
        ) : (
          <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 14 }}>
            {t.analytics.noData}
          </div>
        )}
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
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #F9FAFB" }}>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#374151" }}>{row.date}</td>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#374151" }}>{LOCATION_LABELS[row.location] || row.location}</td>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#374151", fontWeight: 600 }}>{row.checks}</td>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#374151" }}>{row.blocked}</td>
                      <td style={{ padding: "12px 12px", fontSize: 14 }}>
                        <span style={{ color: "#10B981", fontWeight: 600 }}>{rate}%</span>
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
