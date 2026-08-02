import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BoardPlaygroundCanvas from "@/components/internal/canvas/BoardPlaygroundCanvas";

export default function LandingBoardShowcase({
  ctaHref,
  ctaLabel,
  ctaInNotesApp = false,
  backgroundImage,
}) {
  const CtaLink = ctaInNotesApp ? Link : "a";

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-cover bg-center bg-no-repeat p-3 sm:rounded-3xl sm:p-6 md:p-8 xl:p-10"
      style={backgroundImage ? { backgroundImage: `url('${backgroundImage}')` } : undefined}
    >
      <div className="absolute inset-0 bg-[#080808]/75" />
      <div className="relative z-10 flex flex-col gap-6 sm:gap-10">
        <div className="space-y-5">
         <div className="mx-auto mb-4 mt-4 flex w-[92%] flex-col items-start gap-4 sm:mb-6 sm:mt-6 sm:w-[90%]">
           <h3 className="text-3xl font-semibold leading-tight text-[#f5f5f5]">
            Build in real time with the full Geiger Notes interface.
          </h3>

          <p className="max-w-sm text-[#bcbcbc]">
            This playground runs locally on the page with the complete canvas
            system, node types, controls, and interactions. No save and no load,
            just pure exploration.
          </p>

          <CtaLink
            href={ctaHref}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {ctaLabel || "Checkout Notes"}
            <ArrowRight className="h-4 w-4" />
          </CtaLink>
         </div>
        </div>

        <div className="relative rounded-2xl border border-border/80 bg-background/70 p-2 shadow-2xl backdrop-blur-md sm:p-3">
          <div className="h-[430px] overflow-hidden rounded-xl border border-border bg-background sm:h-[460px] lg:h-[600px]">
            <BoardPlaygroundCanvas />
          </div>
        </div>
      </div>
    </section>
  );
}
