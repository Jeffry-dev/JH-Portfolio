import type { CSSProperties } from "react";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { profile } from "@/data/profile";
import { getSection } from "@/data/navigation";
import { Reveal } from "@/components/motion/reveal";
import { SectionEyebrow } from "@/components/ui/section-heading";
import { SplitWords } from "@/components/ui/split-words";
import { CopyButton } from "@/components/contact/copy-button";
import { ContactForm } from "@/components/contact/contact-form";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/brand-icons";
import { cn, toTelHref } from "@/lib/utils";

/** Inline custom properties (the stagger order `--i`). */
type StyleVars = CSSProperties & Record<`--${string}`, number | string>;

/**
 * Motion: the statement rises word by word; then the email row, the phone and location rows
 * and the social pills stagger in, and the amber mail circle sends out one soft ring
 * (`.mail-pulse` in app/globals.css, 1.2 s, once per reveal). The form card reveals on its own
 * beat and its heading, note, fields and footer follow in sequence. Everything replays with the
 * reveal system and is the same on touch screens (press states mirror hover).
 */
export function Contact() {
  const { email, phone } = profile.contact;
  const { index, label } = getSection("contact");

  const socials = [
    { key: "linkedin", label: "LinkedIn", href: profile.socials.linkedin, Icon: LinkedInIcon },
    { key: "github", label: "GitHub", href: profile.socials.github, Icon: GitHubIcon },
  ].filter((social) => social.href);

  return (
    <section
      id="contact"
      aria-labelledby="contact-label contact-title"
      className="section-y relative overflow-hidden border-t border-line"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 left-1/2 -z-10 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-glow)_8%,transparent),transparent)]"
      />

      <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <Reveal y={12}>
            <SectionEyebrow index={index} label={label} labelId="contact-label" />
            {/* aria-label keeps the heading one phrase for screen readers (the words are split for the reveal). */}
            <h2
              id="contact-title"
              aria-label="Let’s talk."
              className="mt-5 text-[clamp(2.75rem,7vw,5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-fg"
            >
              <SplitWords text="Let’s talk." />
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-fg-muted">
              Whether it’s a project, a question about something on this page or just to connect, email or phone,
              whichever suits you.
            </p>
          </Reveal>

          <Reveal stagger delay={0.08}>
            <div
              data-reveal-item=""
              style={{ "--i": 0 } as StyleVars}
              className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <a
                href={`mailto:${email}`}
                className="group inline-flex min-w-0 items-center gap-3 rounded-full font-display text-[clamp(1.125rem,2.4vw,1.5rem)] font-medium tracking-[-0.01em] text-fg"
              >
                {/* `.mail-pulse` draws one expanding ring from this circle when the block reveals. */}
                <span className="mail-pulse relative grid size-12 shrink-0 place-items-center rounded-full accent-lift bg-accent text-accent-ink transition-colors duration-200 group-hover:bg-accent-strong group-focus-visible:bg-accent-strong group-active:bg-accent-strong">
                  <Mail aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 underline decoration-line-strong decoration-1 underline-offset-[6px] transition-colors duration-200 [overflow-wrap:anywhere] group-hover:decoration-accent group-focus-visible:decoration-accent group-active:decoration-accent">
                  {email.split("@")[0]}
                  <wbr />@{email.split("@")[1]}
                </span>
              </a>
              {/* On phones the button sits under the address it copies (icon 3rem + gap 0.75rem). */}
              <CopyButton value={email} label="Copy email address" className="ml-15 self-start sm:ml-0 sm:self-auto print:hidden" />
            </div>

            {/* Same facts pattern as the hero status card: a card with hairline dividers. Each row's label
                and value stagger in as a pair (the cells keep still, so the dividers never move). */}
            <dl
              className={cn(
                "card mt-10 grid divide-y divide-line overflow-hidden rounded-2xl",
                phone && "sm:grid-cols-2 sm:divide-x sm:divide-y-0",
              )}
            >
              {phone ? (
                <div className="px-5 py-4">
                  <dt data-reveal-item="" style={{ "--i": 1 } as StyleVars} className="label-mono flex items-center gap-2">
                    <Phone aria-hidden="true" className="size-3.5" />
                    Phone
                  </dt>
                  <dd data-reveal-item="" style={{ "--i": 1 } as StyleVars} className="mt-1.5">
                    <a
                      href={toTelHref(phone)}
                      className="inline-flex min-h-11 items-center text-fg underline-offset-4 hover:underline focus-visible:underline active:underline"
                    >
                      {phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              <div className="px-5 py-4">
                <dt data-reveal-item="" style={{ "--i": 2 } as StyleVars} className="label-mono flex items-center gap-2">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  Location
                </dt>
                {/* Same 44px row as the phone link, so both values share a baseline. */}
                <dd data-reveal-item="" style={{ "--i": 2 } as StyleVars} className="mt-1.5 flex min-h-11 items-center text-fg">
                  {profile.location.city}, {profile.location.country}
                </dd>
              </div>
            </dl>

            {socials.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-3" aria-label="Social profiles">
                {socials.map(({ key, label, href, Icon }, i) => (
                  <li key={key} data-reveal-item="" style={{ "--i": 3 + i } as StyleVars}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex h-11 items-center gap-2.5 rounded-full border border-line-strong bg-tint/[0.03] px-4 text-sm text-fg-muted transition-[background-color,border-color,color,scale] duration-150 hover:border-tint/25 hover:bg-tint/[0.06] hover:text-fg focus-visible:border-tint/25 focus-visible:bg-tint/[0.06] focus-visible:text-fg active:scale-[0.98] active:border-tint/25 active:text-fg"
                    >
                      <Icon className="size-4" />
                      {label}
                      {/* External link: the north-east arrow is reserved for links that leave the page. */}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-active:translate-x-0.5 group-active:-translate-y-0.5"
                      />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </Reveal>
        </div>

        {/* The form is for the screen only: printing keeps the contact details, not the inputs.
            The card's heading and note take the first two stagger beats; the form continues from 2. */}
        <Reveal stagger delay={0.12} className="lg:col-span-6 print:hidden">
          <div className="card rounded-3xl p-5 sm:p-8">
            <h3
              id="contact-form-title"
              data-reveal-item=""
              style={{ "--i": 0 } as StyleVars}
              className="font-display text-xl leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-[1.375rem]"
            >
              Send a message
            </h3>
            <p data-reveal-item="" style={{ "--i": 1 } as StyleVars} className="mt-1.5 mb-7 text-sm text-fg-muted">
              Prefer a form? Write your message here.
            </p>
            <ContactForm email={email} labelledBy="contact-form-title" staggerFrom={2} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
