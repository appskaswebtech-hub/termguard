import { useEffect, useRef, useState } from "react";
import { useFetcher, useLocation } from "react-router";

interface Attachment {
  url: string;
  filename: string;
  type: "image" | "file";
}

interface Reply {
  adminName: string;
  body: string;
  createdAt: string;
  sender?: string;
  attachments?: Attachment[];
}

interface OriginalMessage {
  body: string;
  createdAt: string;
}

interface StoredThread {
  messageId: number;
  name: string;
  email: string;
}

const STORAGE_KEY = "termguard_support_thread";

function AttachmentView({ attachment }: { attachment: Attachment }) {
  if (attachment.type === "image") {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer">
        <img
          src={attachment.url}
          alt={attachment.filename}
          style={{ maxWidth: 180, maxHeight: 180, borderRadius: 10, display: "block" }}
        />
      </a>
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      style={{ fontSize: 12, color: "#3B82F6", display: "flex", alignItems: "center", gap: 4, textDecoration: "underline" }}
    >
      📎 {attachment.filename}
    </a>
  );
}

export default function ChatWidget() {
  const location = useLocation();
  const fetcher = useFetcher();
  const pollFetcher = useFetcher();
  const followUpFetcher = useFetcher();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [followUp, setFollowUp] = useState("");

  const [phase, setPhase] = useState<"form" | "conversation" | "ended">("form");
  const [messageId, setMessageId] = useState<number | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [originalMessage, setOriginalMessage] = useState<OriginalMessage | null>(null);
  const [assignedAdmin, setAssignedAdmin] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [shopTyping, setShopTyping] = useState(false);
  const lastTypingPingRef = useRef(0);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = (value: string) => EMAIL_RE.test(value.trim());

  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = fetcher.state !== "idle";

  // Restore an in-progress conversation after a reload — without this, any
  // page reload (or the embedded admin frame refreshing) wiped all local
  // state and the next message sent was treated as a brand-new conversation
  // instead of a continuation, orphaning it from the original thread.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredThread;
        if (stored?.messageId) {
          setMessageId(stored.messageId);
          setPhase("conversation");
          setName(stored.name || "");
          setEmail(stored.email || "");
        }
      }
    } catch {
      // ignore malformed storage
    } finally {
      setHydrated(true);
    }
  }, []);

  // After first message sent
  useEffect(() => {
    const data = fetcher.data as { ok?: boolean; messageId?: number } | undefined;
    if (fetcher.state === "idle" && data?.ok && data.messageId) {
      setMessageId(data.messageId);
      setMessage("");
      setPhase("conversation");
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messageId: data.messageId, name, email }),
      );
    }
  }, [fetcher.state, fetcher.data]);

  // After a follow-up is sent, refresh immediately instead of waiting for
  // the next 10s poll tick
  useEffect(() => {
    const data = followUpFetcher.data as { ok?: boolean } | undefined;
    if (followUpFetcher.state === "idle" && data?.ok && messageId) {
      pollFetcher.load(`/app/chat?messageId=${messageId}`);
    }
  }, [followUpFetcher.state, followUpFetcher.data]);

  // Poll for the full conversation (original message + all replies) every 10s
  useEffect(() => {
    if (!hydrated || !messageId || phase !== "conversation") return;
    const poll = () => {
      pollFetcher.load(`/app/chat?messageId=${messageId}`);
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [hydrated, messageId, phase]);

  // Update conversation from poll
  useEffect(() => {
    const data = pollFetcher.data as
      | { replies?: Reply[]; assignedAdmin?: string | null; shopTyping?: boolean; originalMessage?: OriginalMessage | null }
      | undefined;
    if (data?.replies) setReplies(data.replies);
    if (data?.assignedAdmin !== undefined) setAssignedAdmin(data.assignedAdmin ?? null);
    if (data?.originalMessage) setOriginalMessage(data.originalMessage);
    setShopTyping(!!data?.shopTyping);
  }, [pollFetcher.data]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies, originalMessage]);

  const handleSend = () => {
    if (!message.trim()) return;
    if (!isValidEmail(email)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    fetcher.submit(
      { name, email, message },
      { method: "POST", action: "/app/chat", encType: "application/json" },
    );
  };

  const handleFollowUp = () => {
    if ((!followUp.trim() && !attachedFile) || !messageId) return;

    const form = new FormData();
    form.set("name", name);
    form.set("email", email);
    form.set("message", followUp);
    form.set("parentId", String(messageId));
    if (attachedFile) form.set("file", attachedFile);

    followUpFetcher.submit(form, { method: "POST", action: "/app/chat", encType: "multipart/form-data" });
    setFollowUp("");
    setAttachedFile(null);
  };

  // File picker / paste-image / drag-drop handlers removed for now —
  // attach UI is disabled until uploads move to cloud storage.

  const handleEndChat = () => {
    if (!messageId) return;
    // Notify dashboard that customer ended the chat
    followUpFetcher.submit(
      { name, email, message: "🔴 Customer ended the chat.", parentId: messageId, isSystem: true },
      { method: "POST", action: "/app/chat", encType: "application/json" },
    );
    setPhase("ended");
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const handleNewChat = () => {
    setPhase("form");
    setMessageId(null);
    setReplies([]);
    setOriginalMessage(null);
    setAssignedAdmin(null);
    setMessage("");
    setFollowUp("");
    setName("");
    setEmail("");
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8,
    padding: "9px 12px", fontSize: 13, color: "#111827", outline: "none",
    background: "#fff", boxSizing: "border-box", fontFamily: "inherit",
  };

  const focusBlue = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = "#3B82F6"; };
  const blurGray = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = "#E5E7EB"; };

  // The whole conversation, driven entirely by the server, oldest first:
  // the original message, then every reply (admin or the shop's own
  // follow-ups) in order. Nothing here depends on client-only state, so a
  // reload always reconstructs the same thread.
  const timeline: { key: string; kind: "customer" | "admin"; body: string; label?: string; attachments?: Attachment[] }[] = [];
  if (originalMessage) {
    timeline.push({ key: "original", kind: "customer", body: originalMessage.body });
  }
  replies.forEach((reply, i) => {
    timeline.push({
      key: `reply-${i}`,
      kind: reply.sender === "shop" ? "customer" : "admin",
      body: reply.body,
      label: reply.adminName,
      attachments: reply.attachments,
    });
  });

  if (location.pathname === "/app/settings") return null;

  return (
    <>
      <style>{"@keyframes tgTypingBounce{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-4px);opacity:1;}}"}</style>
      {/* Floating button */}
      <button
        onClick={open ? handleClose : handleOpen}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 52, height: 52, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg,#3B82F6,#6366F1)",
          boxShadow: "0 6px 20px rgba(99,102,241,0.45)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Backdrop when maximized */}
      {open && maximized && (
        <button
          type="button"
          aria-label="Exit maximized view"
          onClick={() => setMaximized(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 9997, border: "none", cursor: "default", padding: 0 }}
        />
      )}

      {/* Chat window */}
      {open && (
        <div style={
          maximized
            ? {
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9998,
                width: "min(520px, 92vw)", height: "min(720px, 88vh)", background: "#fff", borderRadius: 20,
                boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
                display: "flex", flexDirection: "column",
              }
            : {
                position: "fixed", bottom: 86, right: 24, zIndex: 9998,
                width: 340, background: "#fff", borderRadius: 16,
                boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
                display: "flex", flexDirection: "column", maxHeight: 520,
              }
        }>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)", padding: "14px 18px", borderRadius: maximized ? "20px 20px 0 0" : "16px 16px 0 0", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                {assignedAdmin ? `${assignedAdmin} is helping you` : "Chat with InstaGallery"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }} />
                {assignedAdmin ? "Support agent online" : "We reply within a few hours"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {phase === "conversation" && (
                <button
                  onClick={handleEndChat}
                  style={{ background: "none", border: "none", fontSize: 12, color: "rgba(255,255,255,0.85)", cursor: "pointer", padding: "2px 0", textDecoration: "underline" }}
                >
                  End chat
                </button>
              )}
              <button
                onClick={() => setMaximized((m) => !m)}
                aria-label={maximized ? "Minimize" : "Maximize"}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "#fff", opacity: 0.85 }}
              >
                {maximized ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>
                  </svg>
                )}
              </button>
              <button
                onClick={handleClose}
                aria-label="Minimize chat"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "#fff", opacity: 0.85 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          {phase === "form" ? (
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Name</div>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} onFocus={focusBlue} onBlur={blurGray} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Email</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                  placeholder="your@email.com"
                  style={inputStyle}
                  onFocus={focusBlue}
                  onBlur={blurGray}
                />
                {emailError && (
                  <div style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>
                    Please enter a valid email address.
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Message <span style={{ color: "#EF4444" }}>*</span></div>
                <textarea ref={messageRef} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" rows={4} style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} onFocus={focusBlue} onBlur={blurGray} />
              </div>
              <button
                onClick={handleSend}
                disabled={isBusy || !message.trim() || !isValidEmail(email)}
                style={{
                  background: isBusy || !message.trim() || !isValidEmail(email) ? "#E5E7EB" : "linear-gradient(135deg,#3B82F6,#6366F1)",
                  color: isBusy || !message.trim() || !isValidEmail(email) ? "#9CA3AF" : "#fff",
                  border: "none", borderRadius: 9, padding: "11px 0", fontSize: 14, fontWeight: 700,
                  cursor: isBusy || !message.trim() || !isValidEmail(email) ? "not-allowed" : "pointer",
                  boxShadow: isBusy || !message.trim() || !isValidEmail(email) ? "none" : "0 4px 12px rgba(99,102,241,0.3)",
                }}
              >
                {isBusy ? "Sending…" : "Send message"}
              </button>
            </div>
          ) : (
            <>
              {/* Conversation thread */}
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* User's original message */}
                {timeline[0] && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {timeline[0].body && (
                      <div style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", borderRadius: "14px 4px 14px 14px", padding: "9px 13px", fontSize: 13, color: "#fff", maxWidth: "80%", lineHeight: 1.55, letterSpacing: 0.1 }}>
                        {timeline[0].body}
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-reply (Navi's greeting) */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#6366F1)", boxShadow: "0 2px 6px rgba(59,130,246,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #EEF0F3", boxShadow: "0 1px 3px rgba(15,23,42,0.05)", borderRadius: "4px 14px 14px 14px", padding: "9px 13px", fontSize: 13, color: "#374151", maxWidth: "80%", lineHeight: 1.55 }}>
                    Hello{name ? `, ${name}` : ""}, I am Navi, how may I assist you today?
                  </div>
                </div>

                {timeline.slice(1).map((item) =>
                  item.kind === "customer" ? (
                    <div key={item.key} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {item.body && (
                        <div style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", borderRadius: "14px 4px 14px 14px", padding: "9px 13px", fontSize: 13, color: "#fff", maxWidth: "80%", lineHeight: 1.55, letterSpacing: 0.1 }}>
                          {item.body}
                        </div>
                      )}
                      {item.attachments?.map((a, i) => (
                        <AttachmentView key={i} attachment={a} />
                      ))}
                    </div>
                  ) : (
                    <div key={item.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#4F46E5" }}>
                        {item.label?.[0]?.toUpperCase() || "S"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 3 }}>{item.label}</div>
                        {item.body && (
                          <div style={{ background: "#fff", border: "1px solid #EEF0F3", boxShadow: "0 1px 3px rgba(15,23,42,0.05)", borderRadius: "4px 14px 14px 14px", padding: "9px 13px", fontSize: 13, color: "#374151", maxWidth: "80%", lineHeight: 1.55 }}>
                            {item.body}
                          </div>
                        )}
                        {item.attachments?.map((a, i) => (
                          <AttachmentView key={i} attachment={a} />
                        ))}
                      </div>
                    </div>
                  )
                )}

                {shopTyping && (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#4F46E5" }}>
                      {name?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div style={{ background: "#fff", border: "1px solid #EEF0F3", boxShadow: "0 1px 3px rgba(15,23,42,0.05)", borderRadius: "4px 14px 14px 14px", padding: "10px 13px", display: "flex", gap: 4 }}>
                      <span className="tg-typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF", display: "inline-block", animation: "tgTypingBounce 1.2s infinite ease-in-out" }} />
                      <span className="tg-typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF", display: "inline-block", animation: "tgTypingBounce 1.2s infinite ease-in-out 0.2s" }} />
                      <span className="tg-typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF", display: "inline-block", animation: "tgTypingBounce 1.2s infinite ease-in-out 0.4s" }} />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Follow-up input */}
              {/* Attach/drag-drop UI disabled for now — local-disk storage on the
                  backend doesn't survive on most production hosts. */}
              <div style={{ borderTop: "1px solid #F3F4F6", flexShrink: 0 }}>
                <div style={{ padding: "10px 14px 14px", display: "flex", gap: 8 }}>
                  <input
                    value={followUp}
                    onChange={(e) => {
                      setFollowUp(e.target.value);
                      const now = Date.now();
                      if (messageId && now - lastTypingPingRef.current > 2000) {
                        lastTypingPingRef.current = now;
                        pollFetcher.load(`/app/chat?messageId=${messageId}&typing=admin`);
                      }
                    }}
                    placeholder="Type a message…"
                    style={{ ...inputStyle, flex: 1, padding: "8px 12px" }}
                    onFocus={focusBlue}
                    onBlur={blurGray}
                    onKeyDown={(e) => { if (e.key === "Enter") handleFollowUp(); }}
                  />
                  <button
                    onClick={handleFollowUp}
                    disabled={!followUp.trim() || followUpFetcher.state !== "idle"}
                    style={{
                      background: "linear-gradient(135deg,#3B82F6,#6366F1)", border: "none",
                      borderRadius: 8, width: 36, height: 36, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      opacity: !followUp.trim() && !attachedFile ? 0.5 : 1,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Ended phase */}
          {phase === "ended" && (
            <div style={{ padding: "32px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Chat ended</div>
              <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
                Your chat session has been closed. Start a new one anytime.
              </div>
              <button
                onClick={handleNewChat}
                style={{ marginTop: 4, background: "linear-gradient(135deg,#3B82F6,#6366F1)", color: "#fff", border: "none", borderRadius: 9, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
              >
                Start new chat
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
