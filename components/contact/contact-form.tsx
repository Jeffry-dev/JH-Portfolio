"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Check, CircleAlert, CircleCheck, Info, LoaderCircle, Send, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

interface ContactFormProps {
  /** Destination for the mailto fallback. */
  email: string;
  /** id of the visible heading that names this form. */
  labelledBy: string;
  /**
   * First stagger index (`--i`) for the form's blocks, when the surrounding reveal carries the
   * `stagger` class and other blocks (a heading) come before the form. Default 0.
   */
  staggerFrom?: number;
}

/** Inline custom properties (the stagger order `--i`). */
type StyleVars = CSSProperties & Record<`--${string}`, number | string>;

/** How long the submit button stays green with its tick after a successful send. */
const CELEBRATE_MS = 1200;

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; message: string }
  | { state: "handoff"; message: string }
  | { state: "error"; message: string };

type FieldName = "name" | "email" | "message";
type FieldElement = HTMLInputElement | HTMLTextAreaElement;
type FieldErrors = Partial<Record<FieldName, string>>;

/**
 * No backend required.
 * - If NEXT_PUBLIC_CONTACT_FORM_ENDPOINT is set (e.g. a Formspree form URL), messages are POSTed there.
 * - Otherwise the form opens the visitor's email app with the message pre-filled.
 * Without JavaScript the form keeps the browser's own validation and posts to a mailto: action.
 */
const endpoint = process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT;

/** Keeps mailto: URLs under the ~2,000 character limit some mail handlers enforce. */
const MAILTO_LIMIT = 1900;
const MESSAGE_MAX = endpoint ? 5000 : 1200;

const FIELDS: FieldName[] = ["name", "email", "message"];

const REQUIRED_MESSAGE: Record<FieldName, string> = {
  name: "Please enter your name.",
  email: "Please enter your email address.",
  message: "Please write a message.",
};

/** The visible error for a field, or undefined when it is valid. Blank (spaces only) counts as empty. */
function validate(field: FieldElement): string | undefined {
  const name = field.name as FieldName;
  if (field.value.trim() === "") return REQUIRED_MESSAGE[name];
  if (field.validity.typeMismatch) return "Please enter a valid email address, like you@company.com.";
  if (!field.validity.valid) return field.validationMessage;
  return undefined;
}

const errorId = (name: FieldName) => `contact-${name}-error`;

// Focus: the border lifts a step and the accent line under the field grows (FieldShell); the
// 2px accent ring comes from the global :focus-visible rule.
// Invalid fields: `user-invalid` covers browsers without JavaScript (after interaction only);
// `aria-invalid` is set together with the visible error text, and wins over hover and focus.
const fieldClass =
  "block w-full rounded-xl border border-field bg-bg/60 px-4 py-3 text-base text-fg placeholder:text-fg-subtle pointer-fine:text-[0.9375rem] transition-[border-color,background-color,opacity] duration-200 hover:border-fg-subtle focus:border-fg-subtle focus:bg-bg/80 user-invalid:border-danger/70 read-only:opacity-70 aria-[invalid=true]:border-danger/70";

/**
 * Wraps a field so an accent line can grow from the centre of its bottom edge while the field
 * has focus (320 ms; red for an invalid field). Transform only, inside the field's radius.
 */
function FieldShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-[320ms] after:ease-out-quart focus-within:after:scale-x-100 has-[[aria-invalid=true]]:after:bg-danger has-[:user-invalid]:after:bg-danger">
      {children}
    </div>
  );
}

function FieldError({ name, message }: { name: FieldName; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={errorId(name)}
      className="mt-2 flex items-start gap-1.5 text-sm text-danger transition-opacity duration-200 starting:opacity-0"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

export function ContactForm({ email, labelledBy, staggerFrom = 0 }: ContactFormProps) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const sending = status.state === "sending";
  /** True for a moment after a successful send: the button turns green and shows a tick. */
  const [celebrating, setCelebrating] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Set by an "Ask me about <project>" link (a[data-ask]); added to the subject and the payload. */
  const [topic, setTopic] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  /** Fields the visitor has typed in. Errors show on blur only for these, never while tabbing past. */
  const edited = useRef(new Set<FieldName>());

  useEffect(() => {
    // With JavaScript the form shows its own inline errors instead of the browser's bubbles.
    if (formRef.current) formRef.current.noValidate = true;

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const title = event.target.closest<HTMLElement>("a[data-ask]")?.dataset.ask?.trim();
      if (title) setTopic(title);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), CELEBRATE_MS);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  const onFieldChange = (event: ChangeEvent<FieldElement>) => {
    const field = event.currentTarget;
    const name = field.name as FieldName;
    edited.current.add(name);
    // An error already on screen updates as the visitor types, so it clears as soon as it is fixed.
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: validate(field) }));
  };

  const onFieldBlur = (event: FocusEvent<FieldElement>) => {
    const field = event.currentTarget;
    const name = field.name as FieldName;
    if (!edited.current.has(name)) return;
    setErrors((prev) => ({ ...prev, [name]: validate(field) }));
  };

  /** Invalid state and error link for a field; the error text renders right under it. */
  const invalidProps = (name: FieldName) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? errorId(name) : undefined,
  });

  const removeTopic = () => {
    setTopic(null);
    messageRef.current?.focus();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    const found: FieldErrors = {};
    let firstInvalid: FieldElement | null = null;
    for (const name of FIELDS) {
      const field = form.elements.namedItem(name) as FieldElement | null;
      const error = field ? validate(field) : undefined;
      if (field && error) {
        found[name] = error;
        firstInvalid ??= field;
      }
    }
    setErrors(found);
    if (firstInvalid) {
      setStatus({ state: "idle" });
      firstInvalid.focus();
      return;
    }

    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const from = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const subject = topic ? `Portfolio inquiry about ${topic} from ${name}` : `Portfolio inquiry from ${name}`;

    if (!endpoint) {
      const body = `${message}\n\nFrom: ${name}${from ? ` (${from})` : ""}`;
      const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (href.length > MAILTO_LIMIT) {
        // Encoding can triple non-Latin text, so this can happen well under the field's own limit.
        setErrors({
          message: `This message is too long to hand over to an email app. Please shorten it, or email me directly at ${email}.`,
        });
        setStatus({ state: "idle" });
        messageRef.current?.focus();
        return;
      }
      window.location.href = href;
      setStatus({
        state: "handoff",
        message: `Your email app should open with the message ready to send. If it didn’t, email me directly at ${email}.`,
      });
      return;
    }

    setStatus({ state: "sending" });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name,
          email: from,
          message,
          ...(topic ? { topic } : {}),
          _gotcha: data.get("_gotcha") ?? "",
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      form.reset();
      edited.current.clear();
      setTopic(null);
      setStatus({ state: "sent", message: "Thanks, your message was sent." });
      setCelebrating(true);
    } catch {
      setStatus({
        state: "error",
        message: `Something went wrong sending your message. Please email me directly at ${email}.`,
      });
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      action={`mailto:${email}`}
      method="post"
      encType="text/plain"
      aria-labelledby={labelledBy}
      aria-busy={sending}
      className="space-y-5"
    >
      {/* Blocks stagger in after the card reveals (`.stagger` on the reveal, `--i` from staggerFrom). */}
      <p data-reveal-item="" style={{ "--i": staggerFrom } as StyleVars} className="text-xs text-fg-subtle">
        All fields are required.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div data-reveal-item="" style={{ "--i": staggerFrom + 1 } as StyleVars}>
          <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-fg">
            Name
          </label>
          <FieldShell>
            <input
              id="contact-name"
              type="text"
              required
              maxLength={120}
              autoComplete="name"
              placeholder="Your name"
              name="name"
              readOnly={sending}
              onChange={onFieldChange}
              onBlur={onFieldBlur}
              className={fieldClass}
              {...invalidProps("name")}
            />
          </FieldShell>
          <FieldError name="name" message={errors.name} />
        </div>
        <div data-reveal-item="" style={{ "--i": staggerFrom + 2 } as StyleVars}>
          <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-fg">
            Email
          </label>
          <FieldShell>
            <input
              id="contact-email"
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              placeholder="you@company.com"
              name="email"
              readOnly={sending}
              onChange={onFieldChange}
              onBlur={onFieldBlur}
              className={fieldClass}
              {...invalidProps("email")}
            />
          </FieldShell>
          <FieldError name="email" message={errors.email} />
        </div>
      </div>

      <div data-reveal-item="" style={{ "--i": staggerFrom + 3 } as StyleVars}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <label htmlFor="contact-message" className="block text-sm font-medium text-fg">
            Message
          </label>
          {topic ? (
            <p className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent/30 bg-accent/[0.06] py-0.5 pr-0.5 pl-3 font-mono text-xs text-fg transition-opacity duration-200 starting:opacity-0">
              <span id="contact-topic" className="truncate">
                <span className="text-fg-muted">About:</span> {topic}
              </span>
              <button
                type="button"
                onClick={removeTopic}
                disabled={sending}
                aria-label={`Remove the topic ${topic}`}
                className="grid size-7 shrink-0 place-items-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-tint/[0.08] hover:text-fg focus-visible:bg-tint/[0.08] focus-visible:text-fg active:bg-tint/[0.12] disabled:opacity-60 pointer-coarse:size-11"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </p>
          ) : null}
        </div>
        <FieldShell>
          <textarea
            ref={messageRef}
            id="contact-message"
            required
            rows={5}
            maxLength={MESSAGE_MAX}
            placeholder="What would you like to talk about?"
            name="message"
            readOnly={sending}
            onChange={onFieldChange}
            onBlur={onFieldBlur}
            className={cn(fieldClass, "min-h-32 resize-y")}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={
              [topic ? "contact-topic" : null, errors.message ? errorId("message") : null].filter(Boolean).join(" ") ||
              undefined
            }
          />
        </FieldShell>
        <FieldError name="message" message={errors.message} />
      </div>

      {/* Spam honeypot for form services, hidden from people and assistive tech. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Leave this field empty
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div
        data-reveal-item=""
        style={{ "--i": staggerFrom + 4 } as StyleVars}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p id="contact-form-hint" className="min-w-0 flex-1 text-xs text-fg-subtle">
          {endpoint ? "Sent straight to my inbox." : "Sending opens your email app with the message filled in."}
        </p>
        {/* After a successful send the button goes green for 1.2 s with a tick that pops in: the primary
            style reads its colours from --color-accent, so swapping the variables recolours fill, hover
            and ring together. The three labels share one grid cell, so the button never changes width. */}
        <button
          type="submit"
          disabled={sending}
          aria-describedby="contact-form-hint"
          className={buttonClass(
            "primary",
            cn(
              "shrink-0 whitespace-nowrap disabled:cursor-progress disabled:opacity-70",
              celebrating &&
                "[--color-accent:var(--color-ok)] [--color-accent-strong:var(--color-ok)] [--shadow-accent:0_8px_30px_-8px_color-mix(in_srgb,var(--color-ok)_50%,transparent)]",
            ),
          )}
        >
          {sending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : celebrating ? (
            <Check
              aria-hidden="true"
              className="size-4 transition-[opacity,scale] duration-[420ms] ease-out-expo starting:scale-50 starting:opacity-0"
            />
          ) : (
            <Send
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-active:translate-x-0.5 group-active:-translate-y-0.5"
            />
          )}
          <span
            key={sending ? "sending" : celebrating ? "sent" : "idle"}
            className={cn(
              "grid justify-items-center",
              celebrating && "transition-[opacity,scale] duration-300 ease-out-expo starting:scale-90 starting:opacity-0",
            )}
          >
            <span className={cn("col-start-1 row-start-1", (sending || celebrating) && "invisible")}>Send message</span>
            <span className={cn("col-start-1 row-start-1", !sending && "invisible")}>Sending…</span>
            <span className={cn("col-start-1 row-start-1", !celebrating && "invisible")}>Sent</span>
          </span>
        </button>
      </div>

      <div role="status" aria-live="polite">
        {/* The error alert also shakes once as it lands (keyframe `shake` in app/globals.css: 3px, 300 ms). */}
        {status.state === "sent" || status.state === "handoff" || status.state === "error" ? (
          <p
            key={status.state}
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm text-fg",
              "transition-[opacity,translate] duration-300 ease-out-quart starting:translate-y-1 starting:opacity-0",
              status.state === "sent" && "border-ok/25 bg-ok/[0.06]",
              status.state === "handoff" && "border-line-strong bg-tint/[0.03]",
              status.state === "error" && "animate-[shake_300ms_var(--ease-out-quart)] border-danger/30 bg-danger/[0.06]",
            )}
          >
            {status.state === "sent" ? (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ok" />
            ) : status.state === "handoff" ? (
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-muted" />
            ) : (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
            )}
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
