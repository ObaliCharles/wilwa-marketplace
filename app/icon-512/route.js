import { ImageResponse } from "next/og";

export const runtime = "edge";

const logo = fetch(new URL("../../public/wilwa-email-logo.png", import.meta.url)).then((response) => response.arrayBuffer());

export async function GET() {
  const logoData = await logo;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", padding: 32 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoData} alt="" width="448" height="118" style={{ objectFit: "contain" }} />
    </div>,
    { width: 512, height: 512 }
  );
}
