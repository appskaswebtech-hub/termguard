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
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "0 0 32px" }}>Last updated: September 2026</p>

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
                InstaGallery: Consent Check (&quot;InstaGallery&quot;, &quot;we&quot;, &quot;our&quot; or &quot;us&quot;) is a Shopify app developed by KasWebTech Solutions. The app has two features: a terms and conditions checkbox that shoppers must accept before checkout, and an Instagram and media gallery that displays your Instagram posts and your own photos and videos on your storefront. This Privacy Policy explains what information we collect when you install and use the app, how we use it and how you can have it deleted.
              </Section>
              <Divider />
              <Section title="Information We Collect">
                <p style={p}><strong>From your store (all plans):</strong></p>
                <ul style={ul}>
                  <li style={li}><strong>Shop details:</strong> your store domain and the access token Shopify issues so the app can work on your behalf.</li>
                  <li style={li}><strong>Plan information:</strong> your current plan and the ID of your Shopify subscription.</li>
                  <li style={li}><strong>Support messages:</strong> your name, email address and message if you contact us.</li>
                </ul>
                <p style={{ ...p, marginTop: 16 }}><strong>For the terms and conditions checkbox:</strong></p>
                <ul style={ul}>
                  <li style={li}><strong>Checkbox settings:</strong> agreement text, policy links, design options, placement and error messages.</li>
                  <li style={li}><strong>Consent analytics:</strong> anonymous counts of when the checkbox was accepted or when a checkout was blocked, with the page location and time. No names, email addresses, IP addresses or customer IDs are recorded.</li>
                </ul>
                <p style={{ ...p, marginTop: 16 }}><strong>For the Instagram and media gallery (only if you use it):</strong></p>
                <ul style={ul}>
                  <li style={li}><strong>Instagram account:</strong> if you connect an Instagram Business or Creator account, we store its user ID, username, account type and an access token issued by Instagram.</li>
                  <li style={li}><strong>Instagram posts:</strong> for your most recent posts and reels we store the media links, thumbnails, captions, post links and publish dates, plus your choices about which posts are shown or hidden.</li>
                  <li style={li}><strong>Your own media:</strong> photos and videos you upload or add by link, their captions and their order.</li>
                  <li style={li}><strong>Gallery settings:</strong> layout, design and display preferences.</li>
                </ul>
              </Section>
              <Divider />
              <Section title="How We Use Your Information">
                <ul style={ul}>
                  <li style={li}>To show the terms and conditions checkbox on your storefront and stop checkout until it is accepted</li>
                  <li style={li}>To show consent analytics in the app</li>
                  <li style={li}>To display your Instagram posts and your own media on your storefront, and to keep them up to date by syncing with Instagram every few hours</li>
                  <li style={li}>To check your plan and give access to the features it includes</li>
                  <li style={li}>To answer support requests</li>
                  <li style={li}>To keep the app secure and working correctly</li>
                </ul>
                <p style={{ ...p, marginTop: 12 }}>We do <strong>not</strong> sell, rent or share your data with third parties for advertising or marketing.</p>
              </Section>
              <Divider />
              <Section title="Your Customers' Data">
                <p style={p}>InstaGallery does not collect personal information about your store&apos;s shoppers. Consent analytics are anonymous counts only.</p>
                <p style={{ ...p, marginTop: 12 }}>The storefront script does not set cookies. It saves one small, non-personal display preference in the shopper&apos;s browser storage so the gallery loads smoothly on repeat visits. Instagram images and videos shown in the gallery are loaded from Instagram&apos;s servers.</p>
              </Section>
              <Divider />
              <Section title="Data Storage and Security">
                All data is stored on secure servers managed by KasWebTech Solutions. We use encrypted connections (HTTPS), access controls and signed requests between your store and our servers. Instagram access tokens are used only to read your own profile and posts, and are refreshed automatically before they expire. Data is kept while the app is installed on your store.
              </Section>
              <Divider />
              <Section title="Data Deletion">
                <ul style={ul}>
                  <li style={li}><strong>Disconnect Instagram:</strong> clicking &quot;Disconnect&quot; on the Instagram feed page immediately deletes your Instagram access token and all synced posts.</li>
                  <li style={li}><strong>Uninstall the app:</strong> your Shopify access token, Instagram access token and synced Instagram posts are deleted right away.</li>
                  <li style={li}><strong>Full deletion:</strong> 48 hours after you uninstall, Shopify asks us to erase your store&apos;s data, and we delete all remaining data automatically, including settings, analytics, uploaded media and support messages.</li>
                </ul>
                <p id="instagram-data-deletion" style={{ ...p, marginTop: 12 }}>
                  You can also request deletion at any time by emailing <a href="mailto:apps.kaswebtech@gmail.com" style={link}>apps.kaswebtech@gmail.com</a> with the subject &quot;Data Deletion Request&quot; and your shop domain. We complete requests within 30 days and confirm by email.
                </p>
              </Section>
              <Divider />
              <Section title="Third-Party Services">
                <p style={p}>InstaGallery uses the following services:</p>
                <ul style={ul}>
                  <li style={li}><strong>Shopify:</strong> store authentication, app embedding and the storefront app proxy</li>
                  <li style={li}><strong>Shopify Billing API:</strong> subscriptions and payments</li>
                  <li style={li}><strong>Instagram API by Meta:</strong> only if you connect an Instagram account, to read your profile and recent posts</li>
                </ul>
              </Section>
              <Divider />
              <Section title="Changes to This Policy">
                We may update this Privacy Policy from time to time. Changes will appear on this page with a new date. Continuing to use the app after a change means you accept the updated policy.
              </Section>
              <Divider />
              <ContactBox />
            </>
          ) : (
            <>
              <Section title="Acceptance of Terms">
                By installing or using InstaGallery: Consent Check (&quot;the App&quot;), you agree to these Terms and Conditions. If you do not agree, please uninstall the App.
              </Section>
              <Divider />
              <Section title="Description of Service">
                <p style={p}>The App provides two features for Shopify stores:</p>
                <ul style={ul}>
                  <li style={li}><strong>Terms and conditions checkbox:</strong> a customizable checkbox on the cart page, cart drawer, product pages or custom buttons that stops checkout, including express checkout, until the shopper accepts your terms. It includes consent analytics.</li>
                  <li style={li}><strong>Instagram and media gallery:</strong> displays posts and reels from your connected Instagram account and your own uploaded photos and videos on your storefront, with several layouts and a live preview.</li>
                </ul>
              </Section>
              <Divider />
              <Section title="Plans and Billing">
                <p style={p}>The App offers three plans:</p>
                <ul style={ul}>
                  <li style={li}><strong>Free:</strong> all features, available on Shopify development stores only</li>
                  <li style={li}><strong>Basic, $4.99 per month:</strong> the Instagram and media gallery</li>
                  <li style={li}><strong>Pro, $6.99 per month:</strong> the terms and conditions checkbox, consent analytics and the Instagram and media gallery</li>
                </ul>
                <ul style={{ ...ul, marginTop: 12 }}>
                  <li style={li}>All charges are processed through the <strong>Shopify Billing API</strong> and appear on your Shopify invoice</li>
                  <li style={li}>The Basic and Pro plans include a 7-day free trial</li>
                  <li style={li}>Subscriptions renew automatically every 30 days</li>
                  <li style={li}>You can switch plans or cancel at any time from the Billing page in the App. A new plan replaces the current one.</li>
                  <li style={li}>No refunds are given for partial billing periods</li>
                  <li style={li}>On a live store, the App&apos;s storefront features stay inactive until a paid plan is active</li>
                </ul>
              </Section>
              <Divider />
              <Section title="Your Responsibilities">
                <ul style={ul}>
                  <li style={li}>You are responsible for the content of your own terms and conditions and privacy policy, and for making sure your use of the checkbox meets the laws that apply to your store.</li>
                  <li style={li}>You must own, or have permission to use, every photo, video and caption you display through the gallery.</li>
                  <li style={li}>When you connect Instagram, you must follow Instagram&apos;s Terms of Use and Meta&apos;s Platform Terms.</li>
                  <li style={li}>You are responsible for keeping access to your Shopify and Instagram accounts secure.</li>
                </ul>
              </Section>
              <Divider />
              <Section title="Acceptable Use">
                <p style={p}>You agree not to use the App to:</p>
                <ul style={ul}>
                  <li style={li}>Mislead shoppers about the terms they are accepting</li>
                  <li style={li}>Display content that is illegal, infringing, offensive or that you do not have the rights to</li>
                  <li style={li}>Work around Shopify&apos;s or Instagram&apos;s platform policies</li>
                  <li style={li}>Collect shopper data beyond what is described in our Privacy Policy</li>
                  <li style={li}>Do anything unlawful</li>
                </ul>
              </Section>
              <Divider />
              <Section title="Third-Party Platforms">
                The Instagram gallery depends on the Instagram API provided by Meta. If Instagram changes or limits its API, removes access or your account becomes unavailable, some gallery features may stop working. Your own uploaded media is not affected. We are not responsible for changes made by Shopify or Meta.
              </Section>
              <Divider />
              <Section title="Intellectual Property">
                All code, design and content of the App belong to KasWebTech Solutions. You may not copy, modify, distribute or reverse engineer any part of the App without written permission. Your content, including your Instagram posts and uploaded media, remains yours.
              </Section>
              <Divider />
              <Section title="Disclaimer of Warranties">
                The App is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that it will be error free or uninterrupted, or that it will work with every theme or third-party app. Using the checkbox does not by itself make your store legally compliant, and we do not give legal advice.
              </Section>
              <Divider />
              <Section title="Limitation of Liability">
                KasWebTech Solutions is not liable for any indirect, incidental or consequential damages arising from the use of, or inability to use, the App. Our total liability will not exceed the amount you paid for the App in the 3 months before the claim.
              </Section>
              <Divider />
              <Section title="Termination">
                We may suspend or end access to the App if you break these Terms. You can stop using the App at any time by uninstalling it from your Shopify store. Your data is then deleted as described in our Privacy Policy.
              </Section>
              <Divider />
              <Section title="Changes to Terms">
                We may update these Terms from time to time. Changes will appear on this page with a new date. Continuing to use the App after a change means you accept the updated Terms.
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
