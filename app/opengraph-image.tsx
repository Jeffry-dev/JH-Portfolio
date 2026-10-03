import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

export const alt = `${profile.name} | ${profile.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const highlights = ["Windows Server", "Active Directory", "Networking", "Next.js", "NestJS", "SQL Server"];

// Fonts are bundled locally (SIL OFL, see assets/fonts) so the build never needs the network.
const fontsDir = join(process.cwd(), "assets/fonts");
const [displayBold, displayRegular, mono] = await Promise.all([
  readFile(join(fontsDir, "BricolageGrotesque-Bold.ttf")),
  readFile(join(fontsDir, "BricolageGrotesque-Regular.ttf")),
  readFile(join(fontsDir, "JetBrainsMono-Regular.ttf")),
]);

/** Social preview card, generated at build time from the profile data. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 80px",
          background: "#08090b",
          backgroundImage:
            "radial-gradient(circle at 88% 0%, rgba(242,181,68,0.20), transparent 45%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 64px 64px, 64px 64px",
          color: "#ecebe6",
          fontFamily: "Bricolage Grotesque",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                border: "2px solid #2a2d33",
                background: "#0d0f12",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="46" height="46" viewBox="0 0 32 32" fill="none">
                <path d="M13.25 9v10.5a3.5 3.5 0 0 1-7 0" stroke="#f2b544" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M17.75 9v14M25.75 9v14M17.75 16h8" stroke="#ecebe6" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 22, color: "#8b8e96", letterSpacing: 3 }}>
              PORTFOLIO
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 22,
              color: "#a4a6ad",
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 999, background: "#4ade80" }} />
            {`Currently at ${profile.current.company}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 116, fontWeight: 700, letterSpacing: -5, lineHeight: 1 }}>
            {profile.name}
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 44, fontWeight: 700, color: "#f2b544" }}>
            {profile.title}
          </div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 36, color: "#a4a6ad" }}>{profile.tagline}</div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {highlights.map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                padding: "8px 16px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                fontFamily: "JetBrains Mono",
                fontSize: 20,
                color: "#a4a6ad",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage Grotesque", data: displayBold, weight: 700, style: "normal" },
        { name: "Bricolage Grotesque", data: displayRegular, weight: 400, style: "normal" },
        { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
