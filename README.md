# Jeffry Harfouche Portfolio

Personal portfolio for **Jeffry Harfouche, IT Specialist**. A single-page site built with Next.js (App Router), React, TypeScript, Tailwind CSS v4 and Motion. It's fully static: no backend, no database.

## Stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 (tokens in `app/globals.css`, feature styles in `/styles`) |
| Motion | CSS scroll-driven animations, CSS transitions and a small IntersectionObserver reveal system; `motion` (lazy-loaded) for the mobile menu and the navbar section indicator. Everything respects reduced motion and works without JavaScript. |
| Icons | `lucide-react` (+ inline GitHub / LinkedIn marks) |
| Fonts | Bricolage Grotesque, Instrument Sans, JetBrains Mono via `next/font` (self-hosted) |

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

## Features

- **Command palette**: press `Ctrl + K` (Windows/Linux) or `Cmd + K` (macOS), or use the Search button in the navbar. Jump to any section or project, toggle the theme, copy or send an email. Fully keyboard and screen-reader accessible.
- **Technical DNA** (Skills section): an interactive map of every skill, grouped into Systems, Software, Data and Workflow. Hover, focus or tap a skill to see where it was used and which skills it was used with. Connections are derived only from real sources: the project stacks, the XpertBot internship and the current IT Specialist role (`data/tech-dna.ts`).
- **Project case studies**: overview, purpose, features and stack for each project, with a vertical architecture diagram that draws itself as you scroll.
- **Hero terminal**: a typed intro, then a real prompt. Type `help` to list commands (`whoami`, `about`, `skills`, `projects`, `contact`, `status`, `stack`, `clear`). There is a hidden command or two for the curious.
- **Status card**: a small factual "system status" panel in the hero (`statusCard` in `data/profile.ts`).
- **Ambient light**: on desktop, a faint light follows the cursor and briefly reveals the blueprint grid. Disabled on touch devices, with reduced motion and on low-power devices.
- **Light and dark mode**: see below.

## Updating your content

All content lives in `/data`. Components only render it, so you rarely need to touch them.

| File | What it controls |
| --- | --- |
| `data/profile.ts` | Name, title, intro, About text, email, phone, location, social links, CV link, and `statusCard` (hero status, focus and stack) |
| `data/experience.ts` | Work history (`kind: "primary"` gets a full timeline card, `"earlier"` a compact row) |
| `data/projects.ts` | Projects: summary, optional `purpose` and `status`, features, stack, architecture (`architecture` nodes plus optional `modules`) and links |
| `data/skills.ts` | Skill groups and certifications |
| `data/tech-dna.ts` | How the Technical DNA is built from skills, projects and experience (including the "Microsoft SQL Server" / "SQL Server" alias) |
| `data/focus-areas.ts` | The "What I do" cards |
| `data/education.ts` | Degree, training and school |
| `data/navigation.ts` | Section order, numbers (01 to 07) and which sections appear in the desktop navbar |

### Things to fill in

- **GitHub / LinkedIn**: set `socials.github` and `socials.linkedin` in `data/profile.ts`. Empty values are hidden everywhere, including the command palette.
- **CV download**: put a PDF in `/public` and set `resumeUrl` in `data/profile.ts` (e.g. `"/jeffry-harfouche-cv.pdf"`). This adds a "Download CV" button to the hero and the command palette.
- **Status**: `statusCard.status` in `data/profile.ts` says "Working at SmartSource Consulting SAL". Change it (for example to "Open to new opportunities") only if that is true.
- **SmartSource responsibilities**: the current role in `data/experience.ts` has a conservative summary and no highlights yet. Add your real responsibilities.
- **Project purpose and status**: add `purpose` (the problem each project solves, in your words) and `status` where you want them shown. Market Desk has no features listed yet either.
- **SmartHub architecture**: the diagram shows "Backend: NestJS · .NET". Adjust it in `data/projects.ts` if the backend is split differently.
- **Project links / screenshots**: add real URLs to `links`, or an `image` (stored in `/public`) to a project. A project without an image shows its architecture diagram instead.
- **Certifications**: add entries to `certifications` in `data/skills.ts` and they appear under Education.
- **.NET**: shown on the SmartHub project only. Add it to `data/skills.ts` if you want it listed as a personal skill.

## Environment variables

Every variable is optional. See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, Open Graph, sitemap and robots (e.g. `https://your-domain.com`; a missing `https://` is added). Falls back to Vercel's production URL, then `http://localhost:3000`. |
| `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` | Optional form endpoint (e.g. [Formspree](https://formspree.io)). When unset, the contact form opens the visitor's email app with the message pre-filled. |

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel choose **Add New → Project** and import the repository. The defaults (framework: Next.js, build command `next build`) work as-is.
3. Optionally add `NEXT_PUBLIC_SITE_URL` (once you have a custom domain) and `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` under **Settings → Environment Variables**, then redeploy.

## Light and dark mode

- The site follows the visitor's OS setting by default. The toggle in the navbar (and in the mobile menu and command palette) switches themes and remembers the choice (localStorage key `theme`). Theme logic lives in `lib/theme.ts`.
- An inline script in `app/layout.tsx` applies the theme before the first paint, so there is no flash of the wrong theme. Without JavaScript, the CSS `prefers-color-scheme` fallback applies.
- Colors are tokens in `app/globals.css`: dark values in `@theme`, light values under `:root[data-theme="light"]`. The light palette is designed separately and meets WCAG AA contrast.
- The terminal card stays dark in both themes (`.dark-surface`).

## Motion

- **Hero**: the name rises letter by letter; on desktop, letters near the cursor swell in weight (variable font). The terminal tilts toward the cursor; the call-to-action buttons are magnetic.
- **Scroll**: reading-progress bar, hero layers that move at different speeds, an experience timeline that draws itself, and project architecture diagrams that draw node by node. The navbar subtitle shows the section you are reading.
- **Technology band**: a continuous marquee that stops only when you press its Pause button (it also rests, invisibly, while off-screen).
- **Reveals**: section headings rise word by word and content fades up as it enters the viewport. Scrolling back up never replays anything (re-reading stays instant), but once you return to the top and scroll down again, the entrances play again like a fresh load. Sections skipped by a jump appear without an entrance. Logic: `components/motion/reveal-observer.tsx`.
- **Accessibility**: `prefers-reduced-motion` shows the final state with no parallax or scrubbing; nothing loops on its own for more than a few seconds unless it can be paused; content is visible without JavaScript and when printing.

## Fonts

Site fonts load through `next/font` (self-hosted). The social preview image uses local copies in `assets/fonts` (Bricolage Grotesque and JetBrains Mono, under the SIL Open Font License; license files included).

## Project structure

```
app/              layout, page, metadata routes (icon, OG image, robots, sitemap), 404
assets/fonts/     fonts for the generated social image
public/           favicon.ico
components/
  command/        command palette and its triggers
  contact/        contact form, copy-to-clipboard button
  hero/           interactive terminal, status card, kinetic name
  layout/         navbar (with section indicator), footer, page backdrop
  motion/         reveal system, ambient cursor light, magnetic, tilt, spotlight
  projects/       case study card, architecture diagram
  sections/       one component per page section
  skills/         Technical DNA
  theme/          theme toggle
  ui/             shared primitives (section heading, buttons, tags, icons)
data/             all editable content
lib/              types, theme store, command palette events, site URL, helpers
styles/           feature stylesheets (ambient, architecture, command palette, Technical DNA, terminal)
```
