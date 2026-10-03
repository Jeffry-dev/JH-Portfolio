import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { profile } from "@/data/profile";
import { getSection } from "@/data/navigation";
import { Reveal } from "@/components/motion/reveal";
import { Magnetic } from "@/components/motion/magnetic";
import { SectionEyebrow } from "@/components/ui/section-heading";
import { SplitWords } from "@/components/ui/split-words";
import { CopyButton } from "@/components/contact/copy-button";
import { ContactForm } from "@/components/contact/contact-form";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/brand-icons";
import { toTelHref } from "@/lib/utils";

export function Contact() {
  const { email, phone } = profile.contact;
  const { index, label } = getSection("contact");

  const socials = [
    { key: "linkedin", label: "LinkedIn", href: profile.socials.linkedin, Icon: LinkedInIcon },
    { key: "github", label: "GitHub", href: profile.socials.github, Icon: GitHubIcon },
  ].filter((social) => social.href);

  return (
    <section id="contact" aria-labelledby="contact-title" className="section-y relative overflow-hidden border-t border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 left-1/2 -z-10 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-glow)_8%,transparent),transparent)]"
      />

      <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <Reveal y={12}>
            <SectionEyebrow index={index} label={label} />
            <h2
              id="contact-title"
              className="mt-5 text-[clamp(2.75rem,7vw,5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-fg"
            >
              <SplitWords text="Let’s talk." />
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-fg-muted">
              Whether it&apos;s a project, a question about something on this page or just to connect, email or phone,
              whichever suits you.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href={`mailto:${email}`}
                className="group inline-flex min-w-0 items-center gap-3 rounded-full font-display text-[clamp(1.125rem,2.4vw,1.5rem)] font-medium tracking-[-0.01em] text-fg"
              >
                <Magnetic strength={0.4} max={8}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_8px_30px_-8px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] transition-transform duration-300 group-hover:-rotate-12">
                    <Mail aria-hidden="true" className="size-5" />
                  </span>
                </Magnetic>
                <span className="min-w-0 underline decoration-line-strong decoration-1 underline-offset-[6px] transition-colors [overflow-wrap:anywhere] group-hover:decoration-accent">
                  {email.split("@")[0]}
                  <wbr />@{email.split("@")[1]}
                </span>
              </a>
              <CopyButton value={email} label="Copy email address" className="self-start sm:self-auto" />
            </div>

            <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {phone ? (
                <div className="bg-bg px-5 py-4">
                  <dt className="eyebrow flex items-center gap-2">
                    <Phone aria-hidden="true" className="size-3.5" />
                    Phone
                  </dt>
                  <dd className="mt-1.5">
                    <a href={toTelHref(phone)} className="inline-flex min-h-11 items-center text-fg underline-offset-4 hover:underline">
                      {phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              <div className="bg-bg px-5 py-4">
                <dt className="eyebrow flex items-center gap-2">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  Location
                </dt>
                <dd className="mt-1.5 text-fg">
                  {profile.location.city}, {profile.location.country}
                </dd>
              </div>
            </dl>

            {socials.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-3" aria-label="Social profiles">
                {socials.map(({ key, label, href, Icon }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex h-11 items-center gap-2.5 rounded-full border border-line-strong bg-tint/[0.03] px-4 text-sm text-fg-muted transition-colors hover:border-tint/25 hover:text-fg"
                    >
                      <Icon className="size-4" />
                      {label}
                      <ArrowUpRight aria-hidden="true" className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </Reveal>
        </div>

        <Reveal delay={0.12} className="lg:col-span-6">
          <div className="card rounded-3xl p-6 sm:p-8">
            <h3 id="contact-form-title" className="font-display text-xl font-semibold tracking-[-0.015em] text-fg">
              Send a message
            </h3>
            <p className="mt-1.5 mb-7 text-sm text-fg-muted">Prefer a form? Write your message here.</p>
            <ContactForm email={email} labelledBy="contact-form-title" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
