import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { Toast } from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useT } from "../utils/i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  const response = await admin.graphql(`#graphql
    query SupportShopInfo {
      shop {
        name
        email
      }
    }
  `);
  const { data } = await response.json();

  return {
    shop: session.shop,
    defaultName: data?.shop?.name || "",
    defaultEmail: data?.shop?.email || "",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  await db.supportMessage.create({
    data: {
      shop: session.shop,
      name: body.name || "",
      email: body.email || "",
      collaboratorCode: body.collaboratorCode || null,
      subject: body.subject || "",
      storePassword: body.storePassword || null,
      pageInformation: body.pageInformation || null,
      message: body.message || "",
    },
  });

  return { ok: true };
};

function Field({
  label, value, onChange, type = "text", multiline = 0, helpText,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; multiline?: number; helpText?: string;
}) {
  const base: React.CSSProperties = {
    width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "10px 13px",
    fontSize: 14, color: "#111827", outline: "none", background: "#fff",
    boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
      {multiline > 0 ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={multiline}
          style={{ ...base, resize: "vertical", lineHeight: 1.6 }}
          onFocus={(e) => { e.target.style.borderColor = "#3B82F6"; }}
          onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={base}
          onFocus={(e) => { e.target.style.borderColor = "#3B82F6"; }}
          onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; }}
        />
      )}
      {helpText && <div style={{ fontSize: 12, color: "#9CA3AF" }}>{helpText}</div>}
    </div>
  );
}

export default function Support() {
  const { defaultName, defaultEmail } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const t = useT();

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [collaboratorCode, setCollaboratorCode] = useState("");
  const [subject, setSubject] = useState("");
  const [storePassword, setStorePassword] = useState("");
  const [pageInformation, setPageInformation] = useState("");
  const [message, setMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setShowToast(true);
      setSubject("");
      setStorePassword("");
      setPageInformation("");
      setMessage("");
      setCollaboratorCode("");
    }
  }, [fetcher.state, fetcher.data]);

  const handleSubmit = () => {
    fetcher.submit(
      { name, email, collaboratorCode, subject, storePassword, pageInformation, message },
      { method: "POST", encType: "application/json" },
    );
  };

  return (
    <div style={{ padding: "0 0 40px", maxWidth: 800, margin: "0 auto" }}>

      {/* Hero banner */}
      <div style={{ background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)", borderRadius: "0 0 20px 20px", padding: "28px 32px 32px", marginBottom: 28, position: "relative", overflow: "hidden" }}>
        {/* decorative circles */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: -20, right: 80, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <a href="/app" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </a>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{t.support.title}</div>
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", maxWidth: 420 }}>
          We typically respond within 24 hours. Fill in as much detail as possible to help us resolve your issue quickly.
        </div>

        {/* Quick info pills */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          {[
            { icon: "⚡", text: "Fast response" },
            { icon: "🔒", text: "Secure & private" },
            { icon: "💬", text: "Expert support" },
          ].map((pill) => (
            <div key={pill.text} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", fontSize: 13, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{pill.icon}</span> {pill.text}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 28px" }}>
        {/* Form card */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Section: Contact info */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Contact Information</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}><Field label={t.support.name} value={name} onChange={setName} /></div>
              <div style={{ flex: 1 }}><Field label={t.support.email} value={email} onChange={setEmail} type="email" /></div>
            </div>
          </div>

          <div style={{ height: 1, background: "#F3F4F6" }} />

          {/* Section: Issue details */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Issue Details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label={t.support.subject} value={subject} onChange={setSubject} />
              <Field label={t.support.message} value={message} onChange={setMessage} multiline={5} />
            </div>
          </div>

          <div style={{ height: 1, background: "#F3F4F6" }} />

          {/* Section: Optional */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Optional — helps us debug faster</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>You can skip these if they don't apply.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label={t.support.code} value={collaboratorCode} onChange={setCollaboratorCode} helpText={t.support.codeHelp} />
              <Field label={t.support.password} value={storePassword} onChange={setStorePassword} helpText={t.support.passwordHelp} />
              <Field label={t.support.pageInfo} value={pageInformation} onChange={setPageInformation} multiline={3} helpText={t.support.pageInfoHelp} />
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
            <button
              onClick={handleSubmit}
              disabled={fetcher.state !== "idle"}
              style={{
                background: fetcher.state !== "idle" ? "#93C5FD" : "linear-gradient(135deg,#3B82F6,#6366F1)",
                color: "#fff", border: "none", borderRadius: 9, padding: "12px 32px",
                fontSize: 14, fontWeight: 700, cursor: fetcher.state !== "idle" ? "not-allowed" : "pointer",
                boxShadow: fetcher.state !== "idle" ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
                transition: "opacity 0.15s",
              }}
            >
              {fetcher.state !== "idle" ? "Sending…" : t.support.send}
            </button>
          </div>
        </div>
      </div>

      {showToast && <Toast content={t.support.sent} onDismiss={() => setShowToast(false)} />}
    </div>
  );
}
