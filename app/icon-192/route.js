import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ea580c", color: "white", fontSize: 112, fontWeight: 800, fontFamily: "Arial, sans-serif", borderRadius: 38 }}>
      W
    </div>,
    { width: 192, height: 192 }
  );
}
