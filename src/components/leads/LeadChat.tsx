"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Message {
  _id: string;
  userName: string;
  message: string;
  createdAt: string;
}

interface LeadChatProps {
  leadId: string;
  messages: Message[];
  currentUserName?: string;
}

export default function LeadChat({ leadId, messages, currentUserName }: LeadChatProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!text.trim()) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to send");
        return;
      }
      setText("");
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #d0d7de",
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      display: "flex", flexDirection: "column",
      height: "440px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "12px 20px",
        borderBottom: "1px solid #d0d7de",
        background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)",
        flexShrink: 0,
      }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>Lead Notes</p>
          <p style={{ fontSize: "11px", color: "#8c959f" }}>{messages.length} message{messages.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "16px 20px",
        display: "flex", flexDirection: "column", gap: "12px",
        background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
      }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "10px",
              background: "#f6f8fa", border: "1px solid #d0d7de",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "12px",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8c959f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#656d76" }}>No messages yet</p>
            <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "3px" }}>Start the conversation below</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.userName === currentUserName;
          return (
            <div key={msg._id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start", maxWidth: "72%" }}>
                {!isOwn && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%",
                      background: "#d0d7de",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "8px", fontWeight: 700, color: "#656d76",
                    }}>
                      {msg.userName[0]}
                    </div>
                    <span style={{ fontSize: "11px", color: "#8c959f", fontWeight: 500 }}>{msg.userName}</span>
                  </div>
                )}
                <div style={{
                  padding: "9px 14px",
                  borderRadius: isOwn ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  fontSize: "13px", lineHeight: 1.5,
                  background: isOwn ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#ffffff",
                  color: isOwn ? "white" : "#1f2328",
                  border: isOwn ? "none" : "1px solid #d0d7de",
                  boxShadow: isOwn ? "0 2px 8px rgba(37,99,235,0.25)" : "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  {msg.message}
                </div>
                <span style={{ fontSize: "10px", color: "#8c959f", marginTop: "4px", padding: "0 2px" }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #d0d7de", background: "#ffffff", flexShrink: 0 }}>
        {error && <p style={{ fontSize: "11px", color: "#cf222e", marginBottom: "8px" }}>{error}</p>}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Write a note… (Enter to send)"
            maxLength={1000}
            style={{
              flex: 1, padding: "9px 14px",
              border: "1px solid #d0d7de", borderRadius: "10px",
              fontSize: "13px", color: "#1f2328",
              resize: "none", outline: "none",
              transition: "border-color 150ms, box-shadow 150ms",
              fontFamily: "inherit",
            }}
            onFocus={e => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
            onBlur={e => { e.target.style.borderColor = "#d0d7de"; e.target.style.boxShadow = "none"; }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            style={{
              flexShrink: 0,
              width: "38px", height: "38px",
              background: sending || !text.trim() ? "#d0d7de" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "none", borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: sending || !text.trim() ? "not-allowed" : "pointer",
              boxShadow: sending || !text.trim() ? "none" : "0 2px 8px rgba(37,99,235,0.3)",
              transition: "all 150ms",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
