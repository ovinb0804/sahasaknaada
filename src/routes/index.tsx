import { Link, createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/home/hero";
import { Themes } from "@/components/home/themes";
import { Gallery } from "@/components/home/gallery";
import { GalleryCta } from "@/components/home/gallery-cta";
import { Agenda } from "@/components/home/agenda";
import { RegisterCtaBand } from "@/components/home/register-cta-band";
import { Faq } from "@/components/home/faq";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sahasaknaada — Inter-school Audio Workshop" },
      {
        name: "description",
        content:
          "Sahasaknaada is an inter-school audio workshop by the Radio Club of D. S. Senanayake College. Register to explore sound, science and creativity.",
      },
      { property: "og:title", content: "Sahasaknaada — Inter-school Audio Workshop" },
      {
        property: "og:description",
        content:
          "An inter-school audio workshop by the Radio Club of D. S. Senanayake College. The future of sound starts here.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content:
          "https://vibe.filesafe.space/1792255075376368762/attachments/a5dfb02f-b950-4856-8229-19cd618d2205.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content:
          "https://vibe.filesafe.space/1792255075376368762/attachments/a5dfb02f-b950-4856-8229-19cd618d2205.png",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useReveal();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Themes />
        <Gallery />
        <GalleryCta />
        <Agenda />
        <RegisterCtaBand />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
