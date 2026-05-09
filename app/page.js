import Link from "next/link";
import {
  ArrowRight,
  LayoutGrid,
  PenSquare,
  Smartphone,
  Users,
  Wifi,
} from "lucide-react";
import Footer from "@/components/ui/footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Header } from "@/components/header";
import { createClient } from "@/utils/supabase/server";
import LandingBoardShowcase from "@/components/LandingBoardShowcase";

export const metadata = {
  title: "Notes - Geiger Studio",
  description:
    "Create visual notes, organize ideas on infinite boards, and collaborate with your team in Geiger Notes.",
};

const utilityCards = [
  {
    title: "Works with your tools",
    description:
      "Bring notes, files, and links from the tools your team already uses.",
    icon: LayoutGrid,
  },
  {
    title: "Stay productive offline",
    description:
      "Keep writing and organizing ideas even when your connection is unstable.",
    icon: Wifi,
  },
  {
    title: "Access from any device",
    description:
      "Open boards and documents from desktop or mobile without losing context.",
    icon: Smartphone,
  },
  {
    title: "Infinite Canvas",
    description:
      "Map ideas visually with free-form boards, smart zoom, and drag-and-drop building blocks.",
    icon: PenSquare,
  },
  {
    title: "Structured Navigation",
    description:
      "Create nested boards and move from overview to detail without losing context.",
    icon: LayoutGrid,
  },
  {
    title: "Real-Time Collaboration",
    description:
      "Share sessions, collaborate live, and keep everyone aligned while ideas evolve.",
    icon: Users,
  },
];

const faqs = [
  {
    value: "item-1",
    question: "How does Geiger Notes keep my content secure?",
    answer:
      "Geiger Notes uses secure authentication, controlled access paths, and project-based visibility to keep work private.",
  },
  {
    value: "item-2",
    question: "Do you use my notes for ads?",
    answer: "No. Your workspace content is not used for ad personalization.",
  },
  {
    value: "item-3",
    question: "Can I collaborate live with my team?",
    answer:
      "Yes. You can run live sessions, review changes together, and merge updates directly in shared boards.",
  },
  {
    value: "item-4",
    question: "Can Geiger Notes be used for client or business workflows?",
    answer:
      "Yes. Teams use it for planning, visual documentation, workshops, and client-facing review flows.",
  },
];

export default async function NotesLandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const notesRoot = basePath.replace("/notes", "") || "/notes";
  const dashOrigin = (process.env.NEXT_PUBLIC_DASH_ORIGIN || "").replace(/\/$/, "");
  const boardHref = user ? `${notesRoot}/${user.id}/home` : "";
  const loginHref = `${dashOrigin}/login?next=${encodeURIComponent(notesRoot)}`;
  const ctaHref = user ? boardHref : loginHref;

  return (
    <div className="flex min-h-screen w-full flex-col bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 font-sans">
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808030_1px,transparent_1px),linear-gradient(to_bottom,#80808030_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <Header />

      <main className="relative z-10 flex flex-1 flex-col pt-16 sm:pt-20">
        <section className="mx-auto mb-10 mt-10 flex w-full max-w-6xl items-start justify-start px-4 sm:mt-16 sm:px-6">
          <div className="max-w-3xl">
            <h1 className="mb-4 text-2xl font-semibold text-white sm:text-3xl">
              Capture, connect, and explore ideas on a living notes canvas.
            </h1>
            <p className="mb-6 max-w-xl text-sm text-zinc-400 sm:text-base">
              Geiger Notes combines free-form visual thinking with practical team
              workflows. Build boards, organize concepts, and collaborate in real time.
            </p>
            <Link
              href={ctaHref}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-100 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-white sm:text-base"
            >
              {user ? "Continue to Your Board" : "Log in to Start"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="mx-auto my-10 w-[94%] sm:my-20 md:w-[80%]">
          <LandingBoardShowcase
            ctaHref={ctaHref}
            ctaLabel={user ? "Open your board" : "Checkout Notes"}
          />
        </div>

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-3">
          {utilityCards.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-sm border border-zinc-800 bg-[#191919] p-5"
            >
              <Icon className="mb-3 h-5 w-5 text-zinc-300" />
              <h2 className="font-medium text-zinc-100">{title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{description}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 md:mt-16 md:flex-row">
          <div className="md:w-[35%]">
            <h2 className="text-3xl font-semibold text-white">Questions & Answers</h2>
          </div>
          <div className="md:w-[65%]">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.value}
                  value={faq.value}
                  className="border-zinc-800"
                >
                  <AccordionTrigger className="text-zinc-200 hover:text-white hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-zinc-400">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="relative z-20 overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
          <div className="container relative z-10 mx-auto flex flex-col items-center text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500 sm:text-sm">
              Show your team how fast visual planning can be.
            </p>
            <h2 className="mb-8 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-3xl font-black tracking-tighter text-transparent drop-shadow-lg sm:mb-10 sm:text-5xl lg:text-6xl">
              START BUILDING
            </h2>
            <Link
              href={ctaHref}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-white sm:w-auto"
            >
              {user ? "Open board" : "Create an account"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
