import { profile } from "@/data/profile";
import { sections } from "@/data/navigation";
import { projects } from "@/data/projects";
import { skillGroups } from "@/data/skills";
import { experience } from "@/data/experience";
import { education } from "@/data/education";
import { siteUrl } from "@/lib/site";
import { experienceAnchor } from "@/lib/tech-links";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PointerSpotlight } from "@/components/motion/pointer-spotlight";
import { CommandPalette, type CommandPaletteTerm } from "@/components/command/command-palette";
import { Hero } from "@/components/sections/hero";
import { TechMarquee } from "@/components/sections/tech-marquee";
import { About } from "@/components/sections/about";
import { FocusAreas } from "@/components/sections/focus-areas";
import { Skills } from "@/components/sections/skills";
import { Experience } from "@/components/sections/experience";
import { Projects } from "@/components/sections/projects";
import { Education } from "@/components/sections/education";
import { Contact } from "@/components/sections/contact";

const skills = [...new Set(skillGroups.flatMap((group) => group.items))];

/**
 * Linked structured data: the site, this page about one person, and the person. Facts only,
 * all from /data. The degree is still in progress, so the university is an affiliation, not alumniOf.
 */
function structuredData() {
  const websiteId = `${siteUrl}/#website`;
  const personId = `${siteUrl}/#person`;
  const sameAs = Object.values(profile.socials).filter(Boolean);
  const university = education.find((item) => item.kind === "degree");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: profile.name,
        inLanguage: "en",
        publisher: { "@id": personId },
      },
      {
        "@type": "ProfilePage",
        "@id": `${siteUrl}/#profile`,
        url: siteUrl,
        name: `${profile.name} | ${profile.title}`,
        description: profile.seoDescription,
        inLanguage: "en",
        isPartOf: { "@id": websiteId },
        mainEntity: { "@id": personId },
      },
      {
        "@type": "Person",
        "@id": personId,
        name: profile.name,
        givenName: profile.firstName,
        familyName: profile.lastName,
        jobTitle: profile.title,
        url: siteUrl,
        email: `mailto:${profile.contact.email}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: profile.location.city,
          addressCountry: "LB",
        },
        worksFor: { "@type": "Organization", name: profile.current.company },
        ...(university ? { affiliation: { "@type": "CollegeOrUniversity", name: university.institution } } : {}),
        knowsAbout: skills,
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
    ],
  };
}

/** "Arab Open University" → "AOU", so the usual short name finds it. Only for names of 3+ words. */
function initials(name: string): string[] {
  const letters = name.split(/\s+/).filter((word) => /^\p{Lu}/u.test(word)).map((word) => word[0]);
  return letters.length >= 3 ? [letters.join("")] : [];
}

/** What the command palette's search finds inside a section, besides its name. */
const sectionTerms: Record<string, CommandPaletteTerm[]> = {
  skills: skills.map((skill) => ({ label: skill, skill })),
  experience: experience.map((item) => ({
    label: item.company,
    keywords: [item.role, ...item.tags],
    targetId: experienceAnchor(item.id),
  })),
  education: education.map((item) => ({
    label: item.institution,
    keywords: [item.qualification, ...initials(item.institution)],
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData()).replace(/</g, "\\u003c"),
        }}
      />
      <Navbar name={profile.name} title={profile.title} email={profile.contact.email} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <TechMarquee />
        {/* Same order as data/navigation.ts: Projects come before Skills, so the Technical DNA
            recaps work the reader has just seen. */}
        <About />
        <FocusAreas />
        <Experience />
        <Projects />
        <Skills />
        <Education />
        <Contact />
      </main>
      <Footer />
      <PointerSpotlight />
      <CommandPalette
        sections={sections.map(({ id, label, index }) => ({ id, label, index, terms: sectionTerms[id] }))}
        projects={projects.map(({ id, title, category, context, role, stack, modules }) => ({
          id,
          title,
          category,
          keywords: [context, role, ...stack, ...(modules ?? [])].filter((keyword) => keyword !== undefined),
        }))}
        email={profile.contact.email}
        phone={profile.contact.phone}
        resumeUrl={profile.resumeUrl}
        socials={profile.socials}
      />
    </>
  );
}
