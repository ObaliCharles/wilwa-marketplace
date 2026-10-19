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
      { src: "/icons/wilwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/wilwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
}
