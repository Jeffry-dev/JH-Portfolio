"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, Info, LoaderCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactFormProps {
  /** Destination for the mailto fallback. */
  email: string;
  /** id of the visible heading that names this form. */
  labelledBy: string;
}

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; message: string }
  | { state: "handoff"; message: string }
  | { state: "error"; message: string };

/**
 * No backend required.
 * - If NEXT_PUBLIC_CONTACT_FORM_ENDPOINT is set (e.g. a Formspree form URL), messages are POSTed there.
 * - Otherwise the form opens the visitor's email app with the message pre-filled.
 */
const endpoint = process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT;

/** Keeps mailto: URLs under the ~2,000 character limit some mail handlers enforce. */
const MAILTO_LIMIT = 1900;
const MESSAGE_MAX = endpoint ? 5000 : 1200;

const fieldClass =
  "block w-full rounded-xl border border-field bg-bg/60 px-4 py-3 text-base text-fg placeholder:text-fg-subtle pointer-fine:text-[0.9375rem] transition-[border-color,background-color] duration-200 hover:border-fg-subtle focus:border-accent focus:bg-bg/80";

export function ContactForm({ email, labelledBy }: ContactFormProps) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const from = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!endpoint) {
      const subject = `Portfolio inquiry from ${name}`;
      const body = `${message}\n\nFrom: ${name}${from ? ` (${from})` : ""}`;
      const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (href.length > MAILTO_LIMIT) {
        setStatus({
          state: "error",
          message: `That message is too long to hand over to an email app. Please shorten it, or email me directly at ${email}.`,
        });
        return;
      }
      window.location.href = href;
      setStatus({
        state: "handoff",
        message: `Your email app should open with the message ready to send. If it didn't, email me directly at ${email}.`,
      });
      return;
    }

    setStatus({ state: "sending" });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email: from, message, _gotcha: data.get("_gotcha") ?? "" }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      form.reset();
      setStatus({ state: "sent", message: "Thanks, your message was sent." });
    } catch {
      setStatus({
        state: "error",
        message: `Something went wrong sending your message. Please email me directly at ${email}.`,
      });
    }
  };

  const sending = status.state === "sending";

  return (
    <form onSubmit={onSubmit} aria-labelledby={labelledBy} className="space-y-5">
      <p className="text-xs text-fg-subtle">All fields are required.</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-fg">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={120}
            autoComplete="name"
            placeholder="Your name"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-fg">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            placeholder="you@company.com"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-fg">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={MESSAGE_MAX}
          placeholder="What would you like to talk about?"
          className={cn(fieldClass, "min-h-32 resize-y")}
        />
      </div>

      {/* Spam honeypot for form services, hidden from people and assistive tech. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Leave this field empty
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p id="contact-form-hint" className="min-w-0 flex-1 text-xs text-fg-subtle">
          {endpoint ? "Sent straight to my inbox." : "Sending opens your email app with the message filled in."}
        </p>
        <button
          type="submit"
          disabled={sending}
          aria-describedby="contact-form-hint"
          className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 whitespace-nowrap text-[0.9375rem] font-medium text-accent-ink transition-[background-color,transform] duration-200 hover:bg-accent-strong active:scale-[0.97] disabled:cursor-progress disabled:opacity-70"
        >
          {sending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Send aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
          {sending ? "Sending…" : "Send message"}
        </button>
      </div>

      <div role="status" aria-live="polite">
        {status.state === "sent" || status.state === "handoff" || status.state === "error" ? (
          <p
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm text-fg",
              status.state === "sent" && "border-ok/25 bg-ok/[0.06]",
              status.state === "handoff" && "border-line-strong bg-tint/[0.03]",
              status.state === "error" && "border-danger/30 bg-danger/[0.06]",
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
