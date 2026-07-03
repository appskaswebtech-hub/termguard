import { useT } from "../utils/i18n";

interface SetupGuideProps {
  shop: string;
  appEmbedUuid: string;
  step1Done: boolean;
  step2Done: boolean;
  step3Done: boolean;
  dismissed: boolean;
  onDismiss: () => void;
  onPreview: () => void;
}

export default function SetupGuide({ step1Done, step2Done, step3Done, dismissed, onDismiss }: SetupGuideProps) {
  const t = useT();
  if (dismissed) return null;

  const steps = [
    { title: t.dashboard.step1Title, desc: t.dashboard.step1Desc, done: step1Done },
    { title: t.dashboard.step2Title, desc: t.dashboard.step2Desc, done: step2Done },
    { title: t.dashboard.step3Title, desc: t.dashboard.step3Desc, done: step3Done },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{t.dashboard.setupTitle}</div>
          <div style={{ fontSize: 13, color: "#6B7280" }}>{completedCount} of {steps.length} steps completed</div>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4, lineHeight: 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "#3B82F6", borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: step.done ? "#3B82F6" : "#F3F4F6",
              color: step.done ? "#fff" : "#9CA3AF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>
              {step.done ? (
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: step.done ? "#6B7280" : "#111827", textDecoration: step.done ? "line-through" : "none" }}>{step.title}</div>
              <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
