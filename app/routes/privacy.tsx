import { useState } from "react";

export default function PrivacyPolicy() {
  const [tab, setTab] = useState<"privacy" | "terms">("privacy");

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827", background: "#F9FAFB", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)", padding: "72px 24px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", top: 20, right: 80, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>InstaGallery</span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>Privacy & Terms</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "0 0 32px" }}>Last updated: July 2026</p>

        {/* Tabs */}
        <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 4, gap: 4 }}>
          {([["privacy", "Privacy Policy"], ["terms", "Terms & Conditions"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                background: tab === key ? "#fff" : "transparent",
                color: tab === key ? "#3B82F6" : "rgba(255,255,255,0.85)",
                border: "none", borderRadius: 9, padding: "10px 24px",
                fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "40px 48px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 32 }}>

          {tab === "privacy" ? (
            <>
              <Section title="Overview">
                InstaGallery ("we", "our", or "us") is a Shopify app developed by KasWebTech Solutions. This Privacy Policy explains how we collect, use, and protect information when you install and use the InstaGallery app on your Shopify store.
              </Section>
              <Divider />
              <Section title="Information We Collect">
                <p style={p}>When you install InstaGallery, we collect and store the following:</p>
                <ul style={ul}>
                  <li style={li}><strong>Shop domain</strong> — your Shopify store URL (e.g. yourstore.myshopify.com)</li>
                  <li style={li}><strong>Access token</strong> — a Shopify-issued token to authenticate API requests on your behalf</li>
                  <li style={li}><strong>App settings</strong> — your checkbox configuration, design preferences, agreement text, and link URLs</li>
                  <li style={li}><strong>Analytics events</strong> — anonymous checkbox interaction data (checked/unchecked, location, timestamp) with no personally identifiable customer information</li>
                  <li style={li}><strong>Monthly order count</strong> — used only to enforce free plan limits</li>
                  <li style={li}><strong>Support messages</strong> — name, email, and message content when you contact us through the app</li>
                  <li style={li}><strong>Instagram feed (optional)</strong> — if you connect an Instagram Business or Creator account: your Instagram user ID, username, account type, an Instagram access token, and your recent posts' media URLs, captions, permalinks and timestamps. Photos and videos you upload for the feed are stored on our servers.</li>
                </ul>
              </Section>
              <Divider />
              <Section title="How We Use Your Information">
                <ul style={ul}>
                  <li style={li}>To display and operate the terms &amp; conditions checkbox on your storefront</li>
                  <li style={li}>To provide analytics on customer acceptance rates</li>
                  <li style={li}>To enforce plan limits (free vs. Pro)</li>
                  <li style={li}>To respond to support requests</li>
                  <li style={li}>To improve the app based on usage patterns</li>
                </ul>
                <p style={{ ...p, marginTop: 12 }}>We do <strong>not</strong> sell, rent, or share your data with third parties for marketing purposes.</p>
              </Section>
              <Divider />
              <Section title="Customer Data">
                InstaGallery does not collect or store any personally identifiable information (PII) about your store's customers. Analytics events are recorded at the session level without names, emails, or customer IDs.
              </Section>
              <Divider />
              <Section title="Data Storage & Security">
                All data is stored on secure servers managed by KasWebTech Solutions. We use industry-standard practices including encrypted connections (HTTPS) and access controls. Data is retained for as long as the app is installed on your store.
              </Section>
              <Divider />
              <Section title="Data Deletion">
                When you uninstall InstaGallery, you may request full deletion of your store's data by contacting us at <a href="mailto:apps.kaswebtech@gmail.com" style={link}>apps.kaswebtech@gmail.com</a>. We will process deletion requests within 30 days.
                <p id="instagram-data-deletion" style={{ ...p, marginTop: 12 }}>
                  <strong>Instagram data:</strong> clicking "Disconnect" on the Instagram feed page immediately deletes your Instagram access token and all synced posts. Uninstalling the app also deletes your Instagram access token and synced posts. All remaining feed data, including uploaded media, is erased automatically 48 hours after uninstalling, or sooner on request by email to the address above with the subject "Data Deletion Request" and your shop domain.
                </p>
              </Section>
              <Divider />
              <Section title="Third-Party Services">
                <p style={p}>InstaGallery uses the following third-party services:</p>
                <ul style={ul}>
                  <li style={li}><strong>Shopify</strong> — for store authentication and app embedding</li>
                  <li style={li}><strong>Shopify Billing API</strong> — for subscription and payment management</li>
                  <li style={li}><strong>Instagram API (Meta)</strong> — only if you connect an Instagram account, to read your profile and recent posts for display in your storefront feed</li>
                </ul>
              </Section>
              <Divider />
              <Section title="Changes to This Policy">
                We may update this Privacy Policy from time to time. Changes will be reflected on this page with an updated date. Continued use of the app after changes constitutes acceptance of the updated policy.
              </Section>
              <Divider />
              <ContactBox />
            </>
          ) : (
            <>
              <Section title="Acceptance of Terms">
                By installing or using InstaGallery ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree, please uninstall the App.
              </Section>
              <Divider />
              <Section title="Description of Service">
                InstaGallery is a Shopify app that adds a customizable terms and conditions checkbox to your storefront and an optional Instagram and media gallery. It allows merchants to require customer acceptance before checkout, track acceptance analytics, and display their Instagram posts and own photos and videos.
              </Section>
              <Divider />
              <Section title="Billing & Payments">
                <p style={p}>InstaGallery offers a free plan and a Pro plan at $6.99/month:</p>
                <ul style={ul}>
                  <li style={li}>All billing is processed exclusively through the <strong>Shopify Billing API</strong> in compliance with Shopify's Partner Program Agreement</li>
                  <li style={li}>The Pro plan includes a 7-day free trial</li>
                  <li style={li}>Subscriptions renew automatically every 30 days</li>
                  <li style={li}>You may cancel your subscription at any time from within the app</li>
                  <li style={li}>No refunds are issued for partial billing periods</li>
                </ul>
              </Section>
              <Divider />
              <Section title="Free Plan Limitations">
                The free plan is limited to 10 orders per month. If your store exceeds this limit, the checkbox may stop displaying until you upgrade to the Pro plan or the monthly count resets.
              </Section>
              <Divider />
              <Section title="Acceptable Use">
                <p style={p}>You agree not to use InstaGallery to:</p>
                <ul style={ul}>
                  <li style={li}>Deceive or mislead customers about the nature of the terms they are accepting</li>
                  <li style={li}>Circumvent Shopify's platform policies or checkout functionality</li>
                  <li style={li}>Collect customer data beyond what is described in our Privacy Policy</li>
                  <li style={li}>Use the app for any unlawful purpose</li>
                </ul>
              </Section>
              <Divider />
              <Section title="Intellectual Property">
                All code, design, and content within InstaGallery is owned by KasWebTech Solutions. You may not copy, modify, distribute, or reverse-engineer any part of the app without written permission.
              </Section>
              <Divider />
              <Section title="Disclaimer of Warranties">
                InstaGallery is provided "as is" without warranties of any kind. We do not guarantee that the app will be error-free or uninterrupted. We are not responsible for any legal compliance requirements in your jurisdiction regarding terms and conditions acceptance.
              </Section>
              <Divider />
              <Section title="Limitation of Liability">
                KasWebTech Solutions shall not be liable for any indirect, incidental, or consequential damages arising from the use or inability to use InstaGallery. Our total liability shall not exceed the amount paid by you in the 3 months prior to the claim.
              </Section>
              <Divider />
              <Section title="Termination">
                We reserve the right to suspend or terminate access to InstaGallery at any time if you violate these Terms. You may terminate your use of the app at any time by uninstalling it from your Shopify store.
              </Section>
              <Divider />
              <Section title="Changes to Terms">
                We may update these Terms from time to time. Changes will be posted on this page with an updated date. Continued use of the app after changes constitutes your acceptance.
              </Section>
              <Divider />
              <ContactBox />
            </>
          )}

        </div>
      </div>

      <div style={{ textAlign: "center", padding: "24px", fontSize: 13, color: "#9CA3AF" }}>
        © {new Date().getFullYear()} KasWebTech Solutions. All rights reserved.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={h2}>{title}</h2>
      {typeof children === "string" ? <p style={p}>{children}</p> : children}
    </section>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#F3F4F6" }} />;
}

function ContactBox() {
  return (
    <Section title="Contact Us">
      <p style={p}>If you have any questions, please contact us:</p>
      <div style={{ background: "#F3F4F6", borderRadius: 10, padding: "16px 20px", fontSize: 14, color: "#374151", lineHeight: 1.8, marginTop: 12 }}>
        <strong>KasWebTech Solutions</strong><br />
        Email: <a href="mailto:apps.kaswebtech@gmail.com" style={link}>apps.kaswebtech@gmail.com</a><br />
        App: InstaGallery: Consent Check
      </div>
    </Section>
  );
}

const h2: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 12px" };
const p: React.CSSProperties = { fontSize: 14, color: "#4B5563", lineHeight: 1.8, margin: 0 };
const ul: React.CSSProperties = { margin: "8px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 };
const li: React.CSSProperties = { fontSize: 14, color: "#4B5563", lineHeight: 1.7 };
const link: React.CSSProperties = { color: "#3B82F6", textDecoration: "none" };
