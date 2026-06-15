"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Megaphone,
  MessageSquare,
  X,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useChat, Message } from "@/hooks/useChat";
import MessageBubble from "@/components/chat/MessageBubble";

const TZ = "Africa/Nairobi";

interface CommunityPageProps {
  user: User | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function CommunityPage({ user }: CommunityPageProps) {
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "announcements">("chat");
  const [communityConvId, setCommunityConvId] = useState<string | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [expandedAnn, setExpandedAnn] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editingAnnouncementTitle, setEditingAnnouncementTitle] = useState("");
  const [editingAnnouncementContent, setEditingAnnouncementContent] = useState("");
  const [deleteAnnouncementConfirm, setDeleteAnnouncementConfirm] = useState<{
    show: boolean;
    announcementId: string | null;
  }>({ show: false, announcementId: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    messageId: string;
  }>({ show: false, messageId: "" });
  const [deleteError, setDeleteError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    sendMessage,
    editMessage,
    toggleReaction,
    markAsSeen,
    deleteMessage,
  } = useChat(communityConvId, user);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!messages.length || !user) return;
    const unseenIds = messages
      .filter(
        (m) =>
          m.status !== "deleted" &&
          m.sender_id !== user.id &&
          !m.reads.find((r) => r.user_id === user.id),
      )
      .map((m) => m.id);
    if (unseenIds.length) markAsSeen(unseenIds);
  }, [messages, user]);

  const reactToMessage = (messageId: string, emoji: string) => {
    toggleReaction(messageId, emoji);
  };

  const handleDeleteMessage = (messageId: string) => {
    setDeleteError("");
    setDeleteConfirm({ show: true, messageId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.messageId) {
      setDeleteConfirm({ show: false, messageId: "" });
      return;
    }
    setDeleteError("");
    const err = await deleteMessage(deleteConfirm.messageId);
    if (err) {
      setDeleteError(err);
      return;
    }
    setDeleteConfirm({ show: false, messageId: "" });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, messageId: "" });
  };

  useEffect(() => {
  if (!user) return;
  initCommunity();
  fetchAnnouncements();

  const interval = setInterval(fetchAnnouncements, 60000);
  return () => clearInterval(interval);
}, [user]);

  const findOrCreateBlockGroupConversation = async (
    blockId: string,
    blockUserIds: string[],
    currentUserId: string,
  ) => {
    const blockUserIdSet = new Set(blockUserIds);

    const { data: myParticipations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId);

    const myConvIds =
      myParticipations?.map((p: any) => p.conversation_id) || [];

    if (myConvIds.length) {
      const { data: groupConversations } = await supabase
        .from("conversations")
        .select("id")
        .in("id", myConvIds)
        .eq("type", "group");

      const groupConvIds = (groupConversations || []).map((c: any) => c.id);

      if (groupConvIds.length) {
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", groupConvIds);

        if (participants?.length) {
          for (const convId of groupConvIds) {
            const participantIds = participants
              .filter((p: any) => p.conversation_id === convId)
              .map((p: any) => p.user_id);

            const allSameBlock = participantIds.every((id) =>
              blockUserIdSet.has(id),
            );
            if (allSameBlock) {
              return convId;
            }
          }
        }
      }
    }

    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({ type: "group", landlord_id: blockId })
      .select()
      .single();

    if (convError || !newConv) {
      console.error("Failed to create block group conversation:", convError);
      return null;
    }

    const participantPayload = blockUserIds.map((id) => ({
      conversation_id: newConv.id,
      user_id: id,
    }));

    const { error: participantsError } = await supabase
      .from("conversation_participants")
      .insert(participantPayload);

    if (participantsError) {
      console.error(
        "Failed to add block group participants:",
        participantsError,
      );
      return null;
    }

    return newConv.id;
  };

  const initCommunity = async () => {
  if (!user) return;
  setInitLoading(true);

  const userId = user.id;

  try {
    // 1. Fetch profile — we need role AND landlord_block_id for everyone
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, landlord_block_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('[Community] Failed to fetch profile:', profileError);
      setInitLoading(false);
      return;
    }

    const userRole = (profile.role || 'tenant').toLowerCase();
    setRole(userRole);

    // 2. CRITICAL FIX: Both landlords and tenants use landlord_block_id
    //    as the room isolation key — this is the UUID stored in conversations.landlord_id
    const targetLandlordBlockId = profile.landlord_block_id;

    if (!targetLandlordBlockId) {
      console.error('[Community] No landlord_block_id found for user:', userId);
      setInitLoading(false);
      return;
    }

    // 3. Find the ONE canonical group conversation for this block
    const { data: groupConversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'group')
      .eq('landlord_id', targetLandlordBlockId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (convError) throw convError;

    let convId: string | null = null;

    if (groupConversations && groupConversations.length > 0) {
      convId = groupConversations[0].id;
      console.log('[Community] Found existing room:', convId);
    } else {
      // 4. Only create if truly none exists
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({ type: 'group', landlord_id: targetLandlordBlockId })
        .select()
        .single();

      if (createError || !newConv) {
        console.error('[Community] Failed to create group conversation:', createError);
        setInitLoading(false);
        return;
      }
      convId = newConv.id;
      console.log('[Community] Created new room:', convId);
    }

    // 5. Ensure this user is a participant
    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', convId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!participation) {
      await supabase
        .from('conversation_participants')
        .insert({ conversation_id: convId, user_id: userId });
    }

    setCommunityConvId(convId);

  } catch (err) {
    console.error('[Community] Unexpected error:', err);
  } finally {
    setInitLoading(false);
  }
};

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch("/api/community/announcements");
      const result = await response.json();
      if (!response.ok) {
        console.error("Failed to fetch announcements", result.error);
        setAnnouncements([]);
        return;
      }
      setAnnouncements(result.announcements || []);
    } catch (err) {
      console.error("Failed to fetch announcements", err);
      setAnnouncements([]);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const content = newMessage;
    const replyId = replyingTo?.id;
    setNewMessage("");
    setReplyingTo(null);
    inputRef.current?.focus();
    await sendMessage(content, replyId);
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/community/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: annTitle, content: annContent }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("Failed to create announcement", result.error);
      }
    } catch (err) {
      console.error("Failed to create announcement", err);
    }
    setAnnTitle("");
    setAnnContent("");
    setIsSubmitting(false);
    setShowPostForm(false);
    fetchAnnouncements();
  };

  const startEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncementId(ann.id);
    setEditingAnnouncementTitle(ann.title);
    setEditingAnnouncementContent(ann.content);
    setExpandedAnn(ann.id);
  };

  const cancelEditAnnouncement = () => {
    setEditingAnnouncementId(null);
    setEditingAnnouncementTitle("");
    setEditingAnnouncementContent("");
  };

  const saveAnnouncementEdit = async () => {
    if (!editingAnnouncementId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/community/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAnnouncementId,
          title: editingAnnouncementTitle,
          content: editingAnnouncementContent,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("Failed to update announcement", result.error);
      } else {
        cancelEditAnnouncement();
        fetchAnnouncements();
      }
    } catch (err) {
      console.error("Failed to update announcement", err);
    }
    setIsSubmitting(false);
  };

  const requestDeleteAnnouncement = (announcementId: string) => {
    setDeleteAnnouncementConfirm({ show: true, announcementId });
  };

  const cancelDeleteAnnouncement = () => {
    setDeleteAnnouncementConfirm({ show: false, announcementId: null });
  };

  const confirmDeleteAnnouncement = async () => {
    if (!deleteAnnouncementConfirm.announcementId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/community/announcements?id=${deleteAnnouncementConfirm.announcementId}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok) {
        console.error("Failed to delete announcement", result.error);
      } else {
        cancelDeleteAnnouncement();
        fetchAnnouncements();
      }
    } catch (err) {
      console.error("Failed to delete announcement", err);
    }
    setIsSubmitting(false);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: TZ,
    });

  if (initLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-accent border-t-transparent" />
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="flex border-b border-border bg-card shrink-0">
        {[
          { id: "chat", label: "Group Chat", icon: MessageSquare },
          { id: "announcements", label: "Announcements", icon: Megaphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex-1 py-3.5 px-4 flex items-center justify-center gap-2
                text-sm font-medium transition-all relative
                ${isActive ? "text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Group Chat ───────────────────────────────── */}
      {activeTab === "chat" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Chat subheader */}
          <div className="px-5 py-3 border-b border-border bg-card shrink-0 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                LEA Community Chat
              </p>
              <p className="text-xs text-muted-foreground">
                {messages.length} message{messages.length !== 1 ? "s" : ""} ·
                All residents
              </p>
              {/* {blockId && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Landlord ID: {blockId.slice(0, 8)}...
                </p>
              )} */}
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3"
            style={{
              backgroundImage: `url('/images/best.jpg')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "local",
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center mb-3 shadow-sm">
                  <span className="text-2xl">👥</span>
                </div>
                <p className="text-sm font-semibold bg-white/70 backdrop-blur px-3 py-1 rounded-full text-foreground">
                  No messages yet — start the conversation! 👋
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMe={msg.sender_id === user?.id}
                  currentUserId={user?.id || ""}
                  onReact={reactToMessage}
                  onReply={setReplyingTo}
                  onEdit={editMessage}
                  onDelete={handleDeleteMessage}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply bar */}
          {replyingTo && (
            <div className="px-4 sm:px-5 py-2.5 border-t border-border bg-secondary/50 flex items-center gap-3 shrink-0">
              <div className="w-0.5 h-9 bg-accent rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-accent">
                  Replying to {replyingTo.profiles?.full_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {replyingTo.content}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-4 sm:px-5 py-3.5 border-t border-border flex gap-3 items-center shrink-0 bg-card">
            <Input
              ref={inputRef}
              placeholder="Message the community..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-secondary border-border text-foreground h-11 text-sm rounded-xl"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="bg-accent hover:bg-accent/90 text-white h-11 w-11 p-0 shrink-0 rounded-xl shadow-md shadow-accent/25"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Announcements ────────────────────────────── */}
      {activeTab === "announcements" && (
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="p-5 sm:p-8 space-y-4 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-lg">
                  Announcements
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {announcements.length} announcement
                  {announcements.length !== 1 ? "s" : ""}
                </p>
              </div>
              {role === "landlord" && (
                <Button
                  onClick={() => setShowPostForm(!showPostForm)}
                  className="bg-accent hover:bg-accent/90 text-white gap-2 rounded-xl shadow-md shadow-accent/20"
                >
                  <Megaphone className="w-4 h-4" />
                  Post
                </Button>
              )}
            </div>

            {/* Post form — landlord only */}
            {role === "landlord" && showPostForm && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Megaphone className="w-4 h-4 text-accent" />
                    </div>
                    <h4 className="font-semibold text-foreground">
                      New Announcement
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowPostForm(false)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handlePostAnnouncement} className="space-y-3">
                  <Input
                    placeholder="Announcement title..."
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                  <textarea
                    placeholder="Write your announcement here..."
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    required
                    rows={4}
                    className="w-full rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPostForm(false)}
                      className="flex-1 rounded-xl border-border"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-accent hover:bg-accent/90 text-white rounded-xl shadow-sm shadow-accent/20"
                    >
                      {isSubmitting ? "Posting..." : "Post Announcement"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Announcements list */}
            {announcements.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Megaphone className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="font-semibold text-foreground">
                  No announcements yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {role === "landlord"
                    ? 'Tap "Post" to create one'
                    : "Check back later for updates"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann, index) => {
                  const isExpanded = expandedAnn === ann.id;
                  return (
                    <div
                      key={ann.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-sm transition-shadow"
                    >
                      {/* Announcement header — always visible, clickable */}
                      <div
                        className="p-5 cursor-pointer"
                        onClick={() =>
                          setExpandedAnn(isExpanded ? null : ann.id)
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`
                            w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5
                            ${index === 0 ? "bg-accent/10" : "bg-secondary"}
                          `}
                          >
                            <Megaphone
                              className={`w-4 h-4 ${index === 0 ? "text-accent" : "text-muted-foreground"}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-foreground text-sm sm:text-base leading-snug">
                                {ann.title}
                              </h4>
                              <div className="flex items-center gap-2 shrink-0">
                                {index === 0 && (
                                  <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20">
                                    NEW
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              📅 {formatDate(ann.created_at)}
                            </p>
                            {/* Preview when collapsed */}
                            {!isExpanded && (
                              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1">
                                {ann.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-border">
                          {/* Full content */}
                          <div className="px-5 py-4">
                            {editingAnnouncementId === ann.id ? (
                              <div className="space-y-3">
                                <Input
                                  value={editingAnnouncementTitle}
                                  onChange={(e) => setEditingAnnouncementTitle(e.target.value)}
                                  className="bg-secondary border-border text-foreground rounded-xl"
                                />
                                <textarea
                                  value={editingAnnouncementContent}
                                  onChange={(e) => setEditingAnnouncementContent(e.target.value)}
                                  rows={4}
                                  className="w-full rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelEditAnnouncement}
                                    className="rounded-xl"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={saveAnnouncementEdit}
                                    disabled={!editingAnnouncementTitle.trim() || !editingAnnouncementContent.trim() || isSubmitting}
                                    className="bg-accent hover:bg-accent/90 text-white rounded-xl"
                                  >
                                    {isSubmitting ? "Saving..." : "Save"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                {ann.content}
                              </p>
                            )}
                          </div>

                          {role === "landlord" && editingAnnouncementId !== ann.id && (
                            <div className="px-5 py-3 border-t border-border bg-secondary/30 flex flex-wrap gap-2 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => startEditAnnouncement(ann)}
                                className="rounded-xl"
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => requestDeleteAnnouncement(ann.id)}
                                className="rounded-xl"
                              >
                                Delete
                              </Button>
                            </div>
                          )}

                          {/* Comment section */}
                          <div className="border-t border-border px-5 py-4 bg-secondary/30">
                            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                              Leave a comment
                            </p>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Write a comment..."
                                value={newComment[ann.id] || ""}
                                onChange={(e) =>
                                  setNewComment((prev) => ({
                                    ...prev,
                                    [ann.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey)
                                    e.preventDefault();
                                }}
                                className="flex-1 bg-card border-border text-foreground text-sm h-10 rounded-xl"
                              />
                              <Button
                                disabled={!newComment[ann.id]?.trim()}
                                className="bg-accent hover:bg-accent/90 text-white h-10 w-10 p-0 shrink-0 rounded-xl"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Delete for everyone?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              This message will be removed for everyone in the group. You can
              only delete messages within 24 hours of sending.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                onClick={cancelDelete}
                variant="outline"
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
              >
                Delete for everyone
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete announcement confirmation modal */}
      {deleteAnnouncementConfirm.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Delete Announcement
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete this announcement? This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={cancelDeleteAnnouncement}
                variant="outline"
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteAnnouncement}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
