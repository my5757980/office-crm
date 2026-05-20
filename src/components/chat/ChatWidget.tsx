"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ChatUser {
  _id: string; name: string; role: string; online: boolean; unread: number;
}
interface Msg {
  _id: string; from: string; to: string; text: string; createdAt: string;
}

const roleLabel: Record<string, string> = {
  user: "Agent", manager: "Manager", super_admin: "Supervisor", admin: "Admin",
};
const roleColor: Record<string, string> = {
  user: "#388bfd", manager: "#3fb950", super_admin: "#e3b341", admin: "#a371f7",
};

export default function ChatWidget({ myId }: { myId: string }) {
  const [open, setOpen]         = useState(false);
  const [users, setUsers]       = useState<ChatUser[]>([]);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [text, setText]         = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/users");
      if (!r.ok) return;
      const data: ChatUser[] = await r.json();
      setUsers(data);
      setTotalUnread(data.reduce((s, u) => s + u.unread, 0));
    } catch { /* ignore */ }
  }, []);

  const fetchMsgs = useCallback(async (uid: string) => {
    try {
      const r = await fetch(`/api/chat/messages?with=${uid}`);
      if (!r.ok) return;
      const data: Msg[] = await r.json();
      setMsgs(data);
      // clear unread for this user
      setUsers(prev => prev.map(u => u._id === uid ? { ...u, unread: 0 } : u));
      setTotalUnread(prev => Math.max(0, prev - (users.find(u => u._id === uid)?.unread ?? 0)));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat — update lastSeen every 30s while widget is mounted
  useEffect(() => {
    const beat = () => fetch("/api/chat/heartbeat", { method: "POST" }).catch(() => {});
    beat();
    heartRef.current = setInterval(beat, 30_000);
    return () => { if (heartRef.current) clearInterval(heartRef.current); };
  }, []);

  // Poll users every 10s (for unread badge + online status)
  useEffect(() => {
    fetchUsers();
    const id = setInterval(fetchUsers, 10_000);
    return () => clearInterval(id);
  }, [fetchUsers]);

  // Poll messages every 3s when conversation is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeUser) return;
    fetchMsgs(activeUser._id);
    pollRef.current = setInterval(() => fetchMsgs(activeUser._id), 3_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeUser, fetchMsgs]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const openChat = (u: ChatUser) => {
    setActiveUser(u);
    setMsgs([]);
    setText("");
  };

  const send = async () => {
    if (!text.trim() || !activeUser || sending) return;
    setSending(true);
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: activeUser._id, text: text.trim() }),
      });
      setText("");
      await fetchMsgs(activeUser._id);
    } finally { setSending(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 900,
          width: "52px", height: "52px", borderRadius: "50%",
          background: open ? "#1f2328" : "#c0272d",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          transition: "all 200ms",
        }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
        {!open && totalUnread > 0 && (
          <span style={{
            position: "absolute", top: "-4px", right: "-4px",
            background: "#e3b341", color: "#1f2328",
            borderRadius: "10px", padding: "1px 6px",
            fontSize: "11px", fontWeight: 700, minWidth: "18px", textAlign: "center",
          }}>
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: "88px", right: "24px", zIndex: 900,
          width: "360px", height: "500px",
          background: "#ffffff", borderRadius: "14px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          border: "1px solid #d0d7de",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 16px", background: "#1f2328", display: "flex", alignItems: "center", gap: "10px" }}>
            {activeUser && (
              <button onClick={() => { setActiveUser(null); setMsgs([]); }} style={{
                background: "none", border: "none", cursor: "pointer", color: "#8c959f",
                padding: "2px", display: "flex", alignItems: "center",
              }}>
                <BackIcon />
              </button>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3", margin: 0 }}>
                {activeUser ? activeUser.name : "Team Chat"}
              </p>
              {activeUser && (
                <p style={{ fontSize: "11px", color: roleColor[activeUser.role] ?? "#8c959f", margin: 0 }}>
                  {roleLabel[activeUser.role] ?? activeUser.role}
                  {" · "}
                  <span style={{ color: activeUser.online ? "#3fb950" : "#656d76" }}>
                    {activeUser.online ? "● Online" : "○ Offline"}
                  </span>
                </p>
              )}
              {!activeUser && (
                <p style={{ fontSize: "11px", color: "#656d76", margin: 0 }}>
                  {users.filter(u => u.online).length} online
                </p>
              )}
            </div>
          </div>

          {/* User list */}
          {!activeUser && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {users.length === 0 && (
                <div style={{ padding: "32px", textAlign: "center", color: "#8c959f", fontSize: "13px" }}>
                  No users available
                </div>
              )}
              {users.map(u => (
                <div
                  key={u._id}
                  onClick={() => openChat(u)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 16px", cursor: "pointer",
                    borderBottom: "1px solid #f0f2f4",
                    background: "#ffffff", transition: "background 120ms",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f6f8fa")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}
                >
                  {/* Avatar */}
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      background: `linear-gradient(135deg, ${roleColor[u.role] ?? "#8c959f"}, ${roleColor[u.role] ?? "#8c959f"}88)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "14px", fontWeight: 700, color: "white", flexShrink: 0,
                    }}>
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <span style={{
                      position: "absolute", bottom: 0, right: 0,
                      width: "10px", height: "10px", borderRadius: "50%",
                      background: u.online ? "#3fb950" : "#656d76",
                      border: "2px solid #ffffff",
                    }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328", margin: 0 }}>{u.name}</p>
                    <p style={{ fontSize: "11px", color: roleColor[u.role] ?? "#8c959f", margin: 0, fontWeight: 500 }}>
                      {roleLabel[u.role] ?? u.role}
                    </p>
                  </div>

                  {u.unread > 0 && (
                    <span style={{
                      background: "#c0272d", color: "white",
                      borderRadius: "10px", padding: "1px 7px",
                      fontSize: "11px", fontWeight: 700, minWidth: "20px", textAlign: "center",
                    }}>
                      {u.unread}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Conversation */}
          {activeUser && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {msgs.length === 0 && (
                  <div style={{ textAlign: "center", color: "#8c959f", fontSize: "12px", marginTop: "24px" }}>
                    Start the conversation
                  </div>
                )}
                {msgs.map(m => {
                  const isMine = m.from === myId;
                  return (
                    <div key={m._id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "75%", padding: "8px 12px", borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: isMine ? "#c0272d" : "#f0f2f4",
                        color: isMine ? "#ffffff" : "#1f2328",
                        fontSize: "13px", lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}>
                        {m.text}
                      </div>
                      <span style={{ fontSize: "10px", color: "#8c959f", marginTop: "2px", paddingLeft: "4px", paddingRight: "4px" }}>
                        {fmtTime(m.createdAt)}
                      </span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "10px 12px", borderTop: "1px solid #d0d7de", display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message…"
                  rows={1}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: "8px",
                    border: "1px solid #d0d7de", fontSize: "13px",
                    resize: "none", outline: "none",
                    fontFamily: "inherit", lineHeight: 1.4,
                    maxHeight: "80px", overflowY: "auto",
                  }}
                />
                <button
                  onClick={send}
                  disabled={!text.trim() || sending}
                  style={{
                    width: "36px", height: "36px", borderRadius: "8px",
                    background: text.trim() ? "#c0272d" : "#d0d7de",
                    border: "none", cursor: text.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "background 150ms",
                  }}
                >
                  <SendIcon />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function ChatIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
}
function CloseIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function SendIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
