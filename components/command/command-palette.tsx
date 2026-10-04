"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { OPEN_COMMAND_PALETTE_EVENT, isPaletteShortcut, openCommandPalette } from "@/lib/command-palette";

/* ==================================================================
   Public props (supplied by app/page.tsx, a server component)
   ================================================================== */

/**
 * Something inside a section that search should find: a skill, a role, a school. Never listed on
 * its own; when a search matches it, the section's result shows it as secondary text.
 */
export interface CommandPaletteTerm {
  /** Shown as the result's secondary text, e.g. "Windows Server". */
  label: string;
  /** More words that find it (e.g. a role's title and tags). Not displayed. */
  keywords?: string[];
  /** Jump here instead of the section, e.g. a role's anchor. Falls back to the section if missing. */
  targetId?: string;
  /** A skill to pin in the Technical DNA after the jump (see lib/tech-links.ts). */
  skill?: string;
}

export interface CommandPaletteSection {
  id: string;
  label: string;
  /** Two-digit section number, shown as the right-hand hint. */
  index: string;
  terms?: CommandPaletteTerm[];
}

export interface CommandPaletteProject {
  id: string;
  title: string;
  category: string;
  /** Extra search terms (context, role, stack, modules), so "nestjs" finds it. Not displayed. */
  keywords?: string[];
}

export interface CommandPaletteProps {
  sections: CommandPaletteSection[];
  projects: CommandPaletteProject[];
  email: string;
  /** Empty or missing hides "Call". */
  phone?: string;
  /** Empty or missing hides "Download CV". */
  resumeUrl?: string;
  /** Empty values hide the matching link. */
  socials?: { github?: string; linkedin?: string };
}

/* ==================================================================
   Lazy host
   ================================================================== */

type PaletteDialog = ComponentType<CommandPaletteProps & { openOnMount?: boolean }>;

let dialogModule: Promise<PaletteDialog> | undefined;

/** Loads the dialog code once; later calls share the same request. */
function loadDialog(): Promise<PaletteDialog> {
  dialogModule ??= import("./command-palette-dialog")
    .then((mod) => mod.CommandPaletteDialog)
    .catch((error: unknown) => {
      // Forget the failure so the next Search click or shortcut tries again.
      dialogModule = undefined;
      throw error;
    });
  return dialogModule;
}

/**
 * Site-wide command palette (components/command/command-palette-dialog.tsx). Opens with Cmd+K on
 * Apple devices, Ctrl+K elsewhere, or `openCommandPalette()`.
 *
 * The dialog's code stays out of the initial bundle: it is fetched and mounted (closed) as soon as
 * the browser is idle after load, and from then on it handles the shortcut and the open event
 * itself, exactly as if it had been there from the start. A shortcut or trigger used before that
 * is caught here and opens the dialog the moment its code arrives.
 */
export function CommandPalette(props: CommandPaletteProps) {
  const [Dialog, setDialog] = useState<PaletteDialog | null>(null);
  const [openOnMount, setOpenOnMount] = useState(false);

  useEffect(() => {
    if (Dialog) return;
    let cancelled = false;
    const mount = () => {
      loadDialog().then(
        (component) => {
          if (!cancelled) setDialog(() => component);
        },
        () => {
          // Chunk failed to load (offline, deploy in between): the next attempt retries.
        },
      );
    };

    const onOpen = () => {
      setOpenOnMount(true);
      mount();
    };
    // Same contract as the dialog's own listener: the shortcut goes through the shared event,
    // so other components (the mobile menu) can react to it.
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      if (!event.repeat) openCommandPalette();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);

    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(mount, { timeout: 2000 })
        : window.setTimeout(mount, 1200);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [Dialog]);

  return Dialog ? <Dialog {...props} openOnMount={openOnMount} /> : null;
}
