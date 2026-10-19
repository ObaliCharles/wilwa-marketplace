export default function manifest() {
  return {
    name: "Wilwa",
    short_name: "Wilwa",
    description: "Wilwa is Uganda's marketplace for everyday essentials.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
}
