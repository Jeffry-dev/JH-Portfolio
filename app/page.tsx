import { profile } from "@/data/profile";
import { sections } from "@/data/navigation";
import { projects } from "@/data/projects";
import { skillGroups } from "@/data/skills";
import { siteUrl } from "@/lib/site";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PointerSpotlight } from "@/components/motion/pointer-spotlight";
import { CommandPalette } from "@/components/command/command-palette";
import { Hero } from "@/components/sections/hero";
import { TechMarquee } from "@/components/sections/tech-marquee";
import { About } from "@/components/sections/about";
import { FocusAreas } from "@/components/sections/focus-areas";
import { Skills } from "@/components/sections/skills";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { Education } from "@/components/sections/education";
import { Contact } from "@/components/sections/contact";

function personJsonLd() {
  const sameAs = Object.values(profile.socials).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.title,
    url: siteUrl,
    email: `mailto:${profile.contact.email}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: profile.location.city,
      addressCountry: "LB",
    },
    worksFor: {
      "@type": "Organization",
      name: profile.current.company,
    },
    knowsAbout: [...new Set(skillGroups.flatMap((group) => group.items))],
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd()).replace(/</g, "\\u003c"),
        }}
      />
      <Navbar name={profile.name} title={profile.title} email={profile.contact.email} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <TechMarquee />
        <About />
        <FocusAreas />
        <Skills />
        <Experience />
        <Projects />
        <Education />
        <Contact />
      </main>
      <Footer />
      <PointerSpotlight />
      <CommandPalette
        sections={sections}
        projects={projects.map(({ id, title, category, context, stack, modules }) => ({
          id,
          title,
          category,
          keywords: [context, ...stack, ...(modules ?? [])],
        }))}
        email={profile.contact.email}
        phone={profile.contact.phone}
        resumeUrl={profile.resumeUrl}
        socials={profile.socials}
      />
    </>
  );
}
