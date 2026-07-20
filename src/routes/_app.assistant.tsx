import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Sparkles, Send, User as UserIcon, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/assistant")({
  ssr: false,
  component: AssistantPage,
});

type ChatRole = "user" | "assistant";
interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

function extractReply(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const k of ["reply", "message", "response", "answer", "content", "text"]) {
      const v = d[k];
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && "content" in (v as object)) {
        const c = (v as { content?: unknown }).content;
        if (typeof c === "string") return c;
      }
    }
  }
  return "";
}

function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your MediSync assistant. Ask me about your medications, schedule, adherence, or general health questions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setSending(true);
    try {
      const payload = {
        message: text,
        messages: history
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content })),
      };
      const data = await api.post<unknown>("/ai/chat", payload);
      const reply = extractReply(data) || "I couldn't generate a response.";
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: reply },
      ]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to reach the assistant.";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ ${msg}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your medications, schedule, or health."
      />

      <Card className="flex-1 flex flex-col rounded-2xl overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
          {sending && (
            <div className="flex items-start gap-3">
              <Avatar role="assistant" />
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm flex items-center gap-2 text-muted-foreground">
                <span className="typing-dot" />
                <span className="typing-dot" style={{ animationDelay: "150ms" }} />
                <span className="typing-dot" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className="border-t bg-background/60 backdrop-blur px-3 md:px-4 py-3"
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message the assistant..."
              rows={1}
              className="min-h-[44px] max-h-40 resize-none rounded-2xl"
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full h-11 w-11 shrink-0"
              disabled={sending || !input.trim()}
              aria-label="Send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground px-1">
            Press Enter to send · Shift+Enter for a new line
          </p>
        </form>
      </Card>

      <style>{`
        .typing-dot {
          display:inline-block;width:6px;height:6px;border-radius:9999px;
          background:currentColor;opacity:.5;animation:medisync-bounce 1s infinite ease-in-out;
        }
        @keyframes medisync-bounce {
          0%,80%,100%{transform:translateY(0);opacity:.3}
          40%{transform:translateY(-4px);opacity:.9}
        }
      `}</style>
    </div>
  );
}

function Avatar({ role }: { role: ChatRole }) {
  if (role === "assistant") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
      <UserIcon className="h-4 w-4" />
    </div>
  );
}

function MessageBubble({ role, content }: { role: ChatRole; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <Avatar role={role} />
      <div
        className={cn(
          "max-w-[85%] md:max-w-[75%] px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
            : "bg-muted text-foreground rounded-2xl rounded-tl-sm",
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{content}</div>
        ) : (
          <div
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none",
              "prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2",
              "prose-headings:mt-3 prose-headings:mb-2",
              "prose-code:before:content-none prose-code:after:content-none",
              "prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
