import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the same JH monogram as icon.svg, rendered to PNG at build time. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0f12",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
          <path
            d="M13.25 9v10.5a3.5 3.5 0 0 1-7 0"
            stroke="#f2b544"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.75 9v14M25.75 9v14M17.75 16h8"
            stroke="#ecebe6"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
