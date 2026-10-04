# Jeffry Harfouche Portfolio

Personal portfolio for **Jeffry Harfouche, IT Specialist**. A single-page site built with Next.js (App Router), React, TypeScript and Tailwind CSS v4. It's fully static: no backend, no database, and no animation library.

## Stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 (tokens in `app/globals.css`, feature styles in `/styles`) |
| Motion | Plain CSS: scroll-driven animations, transitions and keyframes (including the mobile menu and the navbar section indicator), plus a small IntersectionObserver reveal system. Everything respects reduced motion and works without JavaScript. |
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

## Page order

About (01), What I do (02), Experience (03), Projects (04), Skills (05), Education (06), Contact (07). Projects come before Skills so the Technical DNA recaps work the reader has just seen. The order and numbers live in `data/navigation.ts`; `app/page.tsx` renders the sections in the same order.

## Features

- **Hero**: name, title with the current employer, tagline, intro, "View projects" and "Contact me", and a status bar (current job, availability, projects, core stack, location). Built to answer who, what, with what and how to reach you within the first screen.
- **Project case studies**: overview, role, purpose, key features, approach, decisions and stack. Rows appear only when filled. Stack chips open that skill in the Technical DNA. Each project has an interactive architecture diagram: hover, focus or tap a part to see what it does in the inspector under it, click or tap to pin it, Escape or Clear releases it. When a diagram comes into view (on every device), the parts light up from top to bottom with a pulse running down each arrow, twice; while the mouse rests on the card it keeps flowing, and the "Architecture" label above each diagram is a button that replays the flow (for phones and keyboards; with reduced motion it is a plain label). Inspecting a part pauses the flow and sends one pulse along that part's connectors. Without JavaScript (and in print) every part's description is listed under the drawing.
- **Technical DNA** (Skills section): every skill on one map, grouped into Systems, Software, Data and Workflow. Solid chips are skills used in a project or role on this site; dashed chips are "Also in my toolkit". No levels or percentages. Hover, focus or tap a skill to see each project or role it was used in and what it was used with. Sources are the project stacks plus the XpertBot internship and SmartSource role tags (only tags that name a skill count). A skill link anywhere on the page (a project stack chip, the hero Stack) pins that skill on the map, and a "Used in" link back to a project marks the matching chip and diagram parts there. When the graph enters (on every device) the hub lights, then each domain and its chips light in reading order; pinning a skill blooms its ring, and where no wires show (phones, tablets) the connected chips pulse once in order. The hub figures count up (screen readers get the final number only). On phones and tablets a pinned skill's panel docks as a sheet at the bottom of the screen, with its own close button.
- **Command palette**: press `Ctrl + K` (Windows/Linux) or `Cmd + K` (macOS; `Ctrl + K` also works there outside text fields), or use the Search button. Jump to any section or project, write a message (opens the form), copy or send an email, call, toggle the theme. Search also finds skills, employers and schools. Rows stagger in as results change; on phones it is a bottom sheet that slides up above the on-screen keyboard. Type `?` or `help` to list every command. The dialog code loads when the browser is idle.
- **Hero terminal**: a typed intro (`ls ./projects`, `ls ./systems`), then a real prompt. Type `help` to list commands (`whoami`, `about`, `skills`, `projects`, `contact`, `status`, `stack`, `clear`); mistyped commands suggest the closest one. There is a hidden command or two for the curious.
- **Contact**: the email with a copy-to-clipboard button, the phone and location, and a form that opens the visitor's email app (or posts to an endpoint, see below). "Ask me about <project>" links fill in the topic.
- **Ambient light**: on desktop, a faint light follows the cursor and briefly reveals the blueprint grid. On phones and tablets the same light blooms in at every tap, lingers for about a second and fades; cards flash a glow from the tap point and the primary button blooms when pressed. Off with reduced motion and on save-data or low-memory devices (`lib/motion-prefs.ts` holds the guards: `motionAllowed`, `isTouchDevice`, `pointerEffectsAllowed`).
- **Phones move too**: every desktop effect has a touch-native twin, and browsers without CSS scroll-driven animations (older iOS Safari, Firefox) get the same scroll effects from a small script (`components/motion/scroll-fallback.tsx`). The hero terminal tilts with the phone on Android (no permission prompt is ever shown); on iPhone it floats gently for a few seconds instead. Taps light up on release, so scrolling with a finger never sets them off.
- **Light and dark mode**: see below.

## Updating your content

All content lives in `/data`. Components only render it, so you rarely need to touch them. Never add anything that isn't true: every optional field stays hidden until you fill it.

| File | What it controls |
| --- | --- |
| `data/profile.ts` | Name, title, tagline, intro, About text, email, phone, location, social links, CV link, and `statusCard`: `status` (current job), optional `availability` (the green "live" pill, also printed by the terminal and shown on the social image) and `stack` |
| `data/experience.ts` | Work history (`kind: "primary"` gets a full timeline card, `"earlier"` a compact row). Optional `projects` (project ids) adds links from a role to its projects |
| `data/projects.ts` | Projects: summary, `role`, `approach`, optional `context`, `purpose`, `status`, `decisions`, `shortTitle`, features, stack, architecture (`architecture` nodes with a `description` each, plus optional `modules`) and links |
| `data/skills.ts` | Skill groups and certifications |
| `data/tech-dna.ts` | How the Technical DNA is built from skills, projects and experience, including the used/toolkit tier and the "Microsoft SQL Server" / "SQL Server" alias |
| `data/focus-areas.ts` | The "What I do" cards |
| `data/education.ts` | Degree, training and school |
| `data/navigation.ts` | Section order, numbers (01 to 07) and which sections appear in the desktop navbar |

### Things to fill in

- **GitHub / LinkedIn**: set `socials.github` and `socials.linkedin` in `data/profile.ts`. Empty values are hidden everywhere, including the command palette.
- **CV download**: put a PDF in `/public` and set `resumeUrl` in `data/profile.ts` (e.g. `"/jeffry-harfouche-cv.pdf"`). This adds a "Download CV" button to the hero and the command palette.
- **Availability**: `statusCard.availability` says "Open to opportunities". Remove it as soon as that stops being true.
- **Market Desk features**: add 2 or 3 neutral descriptions of what the dashboard lets you do (no claims about data, accuracy or performance).
- **Decisions**: add `decisions` (a title and the reason, in your words) to any project where you want to explain a technical choice.
- **SmartHub backend**: the diagram shows "Backend: NestJS · .NET". Describe how the two split only once you want that shown.
- **Restaurant chatbot**: name the AI service behind it if you want it shown.
- **Project links / screenshots**: add real URLs to `links`, or an `image` (stored in `/public`) to a project. A project without an image shows its architecture diagram.
- **Certifications**: add entries to `certifications` in `data/skills.ts` and they appear under Education.
- **.NET**: shown on the SmartHub project only (as a plain tag, since it isn't on the skills map). Add it to `data/skills.ts` if you want it listed as a personal skill.

## Environment variables

Every variable is optional. See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, Open Graph, sitemap and robots (e.g. `https://your-domain.com`; a missing `https://` is added). Falls back to Vercel's production URL, then `http://localhost:3000`. A production build without either prints a warning. |
| `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` | Optional form endpoint (e.g. [Formspree](https://formspree.io)). When unset, the contact form opens the visitor's email app with the message pre-filled. |

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel choose **Add New → Project** and import the repository. The defaults (framework: Next.js, build command `next build`) work as-is.
3. Optionally add `NEXT_PUBLIC_SITE_URL` (once you have a custom domain) and `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` under **Settings → Environment Variables**, then redeploy.

## Light and dark mode

- The site follows the visitor's OS setting by default. The toggle in the navbar (and in the mobile menu and command palette) switches themes and remembers the choice (localStorage key `theme`). Theme logic lives in `lib/theme.ts`.
- An inline script in `app/layout.tsx` applies the theme before the first paint, so there is no flash of the wrong theme. Without JavaScript, the CSS `prefers-color-scheme` fallback applies.
- Colors are tokens in `app/globals.css`: dark values in `@theme`, light values under `:root[data-theme="light"]`. The light palette is designed separately (warm paper, soft tinted shadows, burnt-amber accent) and meets WCAG AA contrast.
- The terminal card stays dark in both themes (`.dark-surface`).
- Printing or saving as PDF uses the light palette and hides site chrome (navbar, terminal, technology band, form).

## Motion

Motion follows a hierarchy: the hero and the project diagrams move the most, the Technical DNA a little (a signal ripple on entrance, a pulse on a pin), section reveals and navigation a little, and body text, education and the footer barely at all. Every effect has a touch-native version, so phones and tablets never sit still.

- **Hero**: the name rises letter by letter and the rest settles within about 1.2 s, then a weight wave sweeps across the name once (on phones, tapping the name replays it from the tapped letter); on desktop, letters near the cursor gain a little weight (variable font). The terminal's frame breathes while the intro types, printed lines land one after another and running a command flashes the prompt. The terminal tilts slightly toward the cursor (or with the phone) and settles flat while you type in it; the primary call to action is magnetic and blooms when pressed. The status bar's cells rise in sequence.
- **Scroll**: reading-progress bar, hero layers that move at slightly different speeds (on every screen size), section dividers that draw in as they enter, an experience timeline that draws itself while its markers ignite and the role card in the middle of the screen warms its border, and project architecture diagrams that draw node by node, then light up from top to bottom as data flows through them; each case study settles in piece by piece (index, title, rows, chips) and a soft light band sweeps across the card once. The navbar subtitle shows the section you are reading, and on desktop a pill glides along the navbar to the current section's link.
- **Technology band**: a continuous marquee; both rows move at the same slow speed. It stops only when you press its Pause button (it also rests, invisibly, while off-screen or in a background tab).
- **Reveals**: the About and Contact statements rise word by word; other content fades up 16px as it enters the viewport, and inside cards icon tiles pop in while lines, rows and fields stagger in 60 ms apart. Section eyebrows draw their hairline, the technology band slides in from both sides, and the footer staggers in. Scrolling back up never replays anything, but once a section has gone back below the screen, scrolling down to it again plays its entrance again, like a fresh load (from anywhere on the page, not only from the top). Sections skipped by a jump appear without an entrance, and moving keyboard focus into content shows it at once. Logic: `components/motion/reveal-observer.tsx`.
- **Feedback**: taps light links, arrows and card edges the way hover does; the theme toggle spins its icon and pulses on switch (a circle grows from the toggle where the View Transitions API exists, elsewhere the colours cross-fade); the "JH" tile in the navbar sweeps a light on hover, focus and tap; the mobile menu's rows stagger in and out; tapping the terminal skips its typed intro; the contact mail circle sends out one ring when the section appears, form fields grow an accent line on focus, the Send button turns green with a tick after a message is sent, errors shake once, and the copy button pops its "Copied" label.
- **Accessibility**: `prefers-reduced-motion` shows the final state with no parallax, scrubbing, delays or pointer effects; nothing loops on its own for more than a few seconds unless it can be paused; content is visible without JavaScript and when printing.

## Fonts

Site fonts load through `next/font` (self-hosted). The social preview image uses local copies in `assets/fonts` (Bricolage Grotesque and JetBrains Mono, under the SIL Open Font License; license files included).

## Project structure

```
app/              layout, page, metadata routes (icon, OG image, robots, sitemap), 404
assets/fonts/     fonts for the generated social image
public/           favicon.ico
components/
  command/        command palette: a small host (shortcut, triggers) and the dialog, loaded when idle
  contact/        contact form, copy-to-clipboard button
  hero/           interactive terminal, status bar, kinetic name
  layout/         navbar (with section indicator and CSS mobile menu), footer, page backdrop
  motion/         reveal system, scroll fallback, ambient light, magnetic, tilt, spotlight, marquee toggle
  projects/       case study card, architecture diagram (server) and its explorer (client island)
  sections/       one component per page section
  skills/         Technical DNA
  theme/          theme toggle
  ui/             shared primitives (section heading, buttons, tags, status pill, count-up, icons)
data/             all editable content
lib/              types, theme store, command palette events, cross-section links, motion guard, focus helper, site URL
styles/           feature stylesheets (ambient, architecture, command palette, navbar, Technical DNA, terminal)
```

## Before you deploy

1. `npm run lint` and `npm run build` with `NEXT_PUBLIC_SITE_URL` set; check the canonical link and `og:url` in view-source.
2. No em dashes: searching the project for the em dash character (U+2014, outside `node_modules`) should find nothing.
3. Resolve or consciously keep every `TODO` in `/data`.
4. Read every sentence in `/data` against your CV and the facts you confirmed.
5. Check 390×844, 768×1024, 1024×768, 1280×720 and 1440×900 in both themes.
6. Turn on reduced motion, then turn off JavaScript, then open print preview in dark mode.
7. Keyboard only: skip link, command palette (`Ctrl`/`Cmd + K`, search "Windows Server", `help`), Technical DNA (arrows, Enter, Escape), an architecture diagram (arrows, Enter, Escape), terminal (`help`, Up/Down), mobile menu, contact form errors.
8. Screen reader spot check: landmarks, the h1 and h2 list, a pinned diagram part, the copy-email announcement.
9. Social preview in LinkedIn's Post Inspector once deployed.
10. Lighthouse (mobile): performance, accessibility, SEO.