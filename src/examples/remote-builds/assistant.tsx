import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  CornerDownLeft,
  FileText,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  respond,
  suggestionsFor,
  type ActionId,
  type AssistantContext,
  type Block,
  type Reply,
} from "./assistant-engine";
import type { LogEntry, Role } from "./model";
import "./assistant.css";

export type ChatMessage = {
  id: number;
  author: "user" | "assistant" | "system";
  text?: string;
  reply?: Reply;
  /** Number of reply blocks shown so far, for the streaming reveal. */
  shown?: number;
  thinking?: boolean;
};

const confirmFirst: Partial<Record<ActionId, string>> = {
  "rerun-failed": "Rerun payments-core/test for 9c41e2a on Acme on-prem? It creates a new attempt of the same check; the commit and command don't change.",
  rerun: "Rerun the whole check for this commit?",
  "drain-manager": "Drain mgr-onprem-02? It stops claiming new jobs; jobs already running finish.",
  "rotate-secret": "Generate a new webhook secret for github-acme-legacy? The current one keeps working for 24 hours.",
};

let nextId = 1;

export function useAssistant(context: AssistantContext, role: Role) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const ask = useCallback(
    (text: string, line?: LogEntry) => {
      const reply = respond(text, context, role, line);
      const id = nextId++;
      setMessages((current) => [
        ...current,
        { id: nextId++, author: "user", text },
        { id, author: "assistant", reply, shown: 0, thinking: true },
      ]);
      const reveal = (count: number) =>
        setMessages((current) =>
          current.map((message) => (message.id === id ? { ...message, shown: count, thinking: false } : message)),
        );
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        reveal(reply.blocks.length);
        return;
      }
      timers.current.push(window.setTimeout(() => reveal(1), 900));
      reply.blocks.forEach((_, index) => {
        if (index > 0) timers.current.push(window.setTimeout(() => reveal(index + 1), 900 + index * 380));
      });
    },
    [context, role],
  );
  const note = useCallback((text: string) => {
    setMessages((current) => [...current, { id: nextId++, author: "system", text }]);
  }, []);
  const reset = useCallback(() => setMessages([]), []);
  return { messages, ask, note, reset, suggestions: suggestionsFor(context, role) };
}

/** Light markdown: **bold** and `code` only. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, index) =>
        part.startsWith("**") ? (
          <strong key={index}>{part.slice(2, -2)}</strong>
        ) : part.startsWith("`") ? (
          <code key={index}>{part.slice(1, -1)}</code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function Typed({ text, animate }: { text: string; animate: boolean }) {
  const [length, setLength] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) return;
    const timer = window.setInterval(() => {
      setLength((current) => {
        if (current >= text.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 7;
      });
    }, 16);
    return () => window.clearInterval(timer);
  }, [text, animate]);
  // Reveal whole words only so markdown markers never split mid-token.
  const cut = !animate || length >= text.length ? text : text.slice(0, text.lastIndexOf(" ", length) + 1);
  const balanced = (cut.match(/\*\*/g)?.length ?? 0) % 2 ? cut + "**" : cut;
  return <Rich text={(balanced.match(/`/g)?.length ?? 0) % 2 ? balanced + "`" : balanced} />;
}

function CopyCommand({ command, note }: { command: string; note?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="as-command">
      <code>{command}</code>
      <button
        type="button"
        aria-label="Copy command"
        onClick={() => {
          navigator.clipboard?.writeText(command).catch(() => undefined);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {note && <small>{note}</small>}
    </div>
  );
}

function Actions({
  actions,
  onAction,
}: {
  actions: Extract<Block, { type: "actions" }>["actions"];
  onAction: (id: ActionId, target?: string) => void;
}) {
  const [pending, setPending] = useState<ActionId>();
  const [done, setDone] = useState<ActionId[]>([]);
  const run = (id: ActionId, target?: string) => {
    setPending(undefined);
    setDone((current) => [...current, id]);
    onAction(id, target);
  };
  return (
    <div className="as-actions">
      <div className="as-action-row">
        {actions.map((action) => (
          <Button
            key={action.id + (action.target ?? "")}
            size="sm"
            variant={action.primary ? "default" : "outline"}
            disabled={done.includes(action.id) && Boolean(confirmFirst[action.id])}
            onClick={() => (confirmFirst[action.id] ? setPending(action.id) : run(action.id, action.target))}
          >
            {done.includes(action.id) && confirmFirst[action.id] ? <Check /> : null}
            {action.label}
          </Button>
        ))}
      </div>
      {pending && (
        <div className="as-confirm" role="group" aria-label="Confirm action">
          <p>{confirmFirst[pending]}</p>
          <div>
            <Button size="sm" onClick={() => run(pending, actions.find((a) => a.id === pending)?.target)}>
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(undefined)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BlockView({
  block,
  animate,
  onCite,
  onAction,
}: {
  block: Block;
  animate: boolean;
  onCite: (runId: string, attempt: number, seq: number) => void;
  onAction: (id: ActionId, target?: string) => void;
}) {
  switch (block.type) {
    case "text":
      return (
        <p className="as-text">
          <Typed text={block.text} animate={animate} />
        </p>
      );
    case "cite":
      return (
        <button type="button" className="as-cite" onClick={() => onCite(block.runId, block.attempt, block.seq)}>
          <span>
            <FileText size={12} aria-hidden="true" /> {block.label} · line {block.seq}
          </span>
          <code>{block.excerpt}</code>
        </button>
      );
    case "command":
      return <CopyCommand command={block.command} note={block.note} />;
    case "facts":
      return (
        <dl className="as-facts">
          {block.rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      );
    case "verdicts":
      return (
        <ul className="as-verdicts">
          {block.rows.map((row) => (
            <li key={row.name} data-matched={row.matched}>
              {row.matched ? <CheckCircle2 size={14} aria-label="Matched" /> : <XCircle size={14} aria-label="Not matched" />}
              <span>
                <strong>{row.name}</strong>
                <small>{row.reason}</small>
              </span>
            </li>
          ))}
        </ul>
      );
    case "diff":
      return (
        <figure className="as-diff">
          <figcaption>{block.file}</figcaption>
          <pre>
            {block.lines.map((line, index) => (
              <span key={index} data-kind={line.kind}>
                {line.kind} {line.text}
                {"\n"}
              </span>
            ))}
          </pre>
        </figure>
      );
    case "actions":
      return <Actions actions={block.actions} onAction={onAction} />;
  }
}

function Sources({ sources }: { sources: string[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div className="as-sources">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Read {sources.length} {sources.length === 1 ? "source" : "sources"} <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <ul>
          {sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AssistantMessages({
  messages,
  onCite,
  onAction,
  empty,
}: {
  messages: ChatMessage[];
  onCite: (runId: string, attempt: number, seq: number) => void;
  onAction: (id: ActionId, target?: string) => void;
  empty?: ReactNode;
}) {
  const end = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages.length, last?.shown]);
  if (!messages.length) return <>{empty}</>;
  return (
    <div className="as-messages">
      {messages.map((message) => {
        if (message.author === "user")
          return (
            <div key={message.id} className="as-user">
              <p>{message.text}</p>
            </div>
          );
        if (message.author === "system")
          return (
            <p key={message.id} className="as-system">
              <CheckCircle2 size={13} aria-hidden="true" /> {message.text}
            </p>
          );
        const reply = message.reply!;
        const shown = message.shown ?? reply.blocks.length;
        return (
          <article key={message.id} className="as-reply" aria-busy={message.thinking}>
            <span className="as-avatar" aria-hidden="true">
              <Sparkles size={13} />
            </span>
            <div className="as-body">
              {message.thinking ? (
                <p className="as-thinking">
                  <span className="as-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  Reading {reply.sources[0]?.toLowerCase() ?? "the run"}…
                </p>
              ) : (
                <>
                  {reply.blocks.slice(0, shown).map((block, index) => (
                    <BlockView
                      key={index}
                      block={block}
                      animate={message === last && index === shown - 1}
                      onCite={onCite}
                      onAction={onAction}
                    />
                  ))}
                  {shown >= reply.blocks.length && <Sources sources={reply.sources} />}
                </>
              )}
            </div>
          </article>
        );
      })}
      <div ref={end} />
    </div>
  );
}

export function AssistantComposer({
  onSend,
  suggestions,
  placeholder = "Ask about this run…",
  autoFocus,
}: {
  onSend: (text: string) => void;
  suggestions: string[];
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const draftId = useId();
  const send = (text: string) => {
    if (!text.trim()) return;
    onSend(text.trim());
    setDraft("");
  };
  return (
    <div className="as-composer">
      {suggestions.length > 0 && (
        <div className="as-suggestions" aria-label="Suggested questions">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => send(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <textarea
          id={draftId}
          rows={1}
          value={draft}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Message the assistant"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(draft);
            }
          }}
        />
        <Button type="submit" size="icon-sm" aria-label="Send" disabled={!draft.trim()}>
          <ArrowUp />
        </Button>
      </form>
      <p className="as-hint">
        <CornerDownLeft size={11} aria-hidden="true" /> Answers come from this project's runs, deliveries and logs. Masked
        values stay masked. Actions always ask first.
      </p>
    </div>
  );
}

/** Docked troubleshooting panel: context chip, thread, composer. */
export function AssistantPanel({
  title = "Ask Oyzu",
  contextLabel,
  assistant,
  onCite,
  onAction,
  onClose,
}: {
  title?: string;
  contextLabel: string;
  assistant: ReturnType<typeof useAssistant>;
  onCite: (runId: string, attempt: number, seq: number) => void;
  onAction: (id: ActionId, target?: string) => void;
  onClose?: () => void;
}) {
  return (
    <section className="assistant-panel" aria-label={title}>
      <header>
        <span className="as-avatar" aria-hidden="true">
          <Sparkles size={13} />
        </span>
        <div>
          <strong>{title}</strong>
          <small>About: {contextLabel}</small>
        </div>
        {assistant.messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={assistant.reset}>
            New chat
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" size="icon-sm" aria-label="Close assistant" onClick={onClose}>
            <X />
          </Button>
        )}
      </header>
      <div className="as-scroll">
        <AssistantMessages
          messages={assistant.messages}
          onCite={onCite}
          onAction={onAction}
          empty={
            <div className="as-empty">
              <Sparkles size={18} aria-hidden="true" />
              <p>
                I can read this {contextLabel.toLowerCase().startsWith("run") ? "run's logs and attempts" : "page's records"},
                find the first error, and propose a next step. Pick a question or type your own.
              </p>
            </div>
          }
        />
      </div>
      <AssistantComposer onSend={(text) => assistant.ask(text)} suggestions={assistant.suggestions} />
    </section>
  );
}
