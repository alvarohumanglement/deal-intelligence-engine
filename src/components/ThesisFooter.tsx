'use client'

export default function ThesisFooter() {
  return (
    <section className="bg-paper-warm border-t border-ink/5">
      <div className="max-w-3xl mx-auto px-5 md:px-6 py-8 md:py-12 text-center">
        <p className="font-display text-base md:text-lg text-ink leading-relaxed max-w-2xl mx-auto">
          This engine runs on the Heritage Experience Platforms thesis — a consolidation framework targeting independently owned Mediterranean restaurant groups at 5.5–7.0x entry.
        </p>
        <div className="mt-5 md:mt-6 flex flex-col md:flex-row flex-wrap justify-center gap-2 md:gap-3">
          <a href="#" className="px-5 py-2.5 md:py-2 border border-copper text-copper font-body text-sm rounded-card hover:bg-copper/[0.06] transition-colors duration-200">
            View the thesis &rarr;
          </a>
          <a href="#" className="px-5 py-2.5 md:py-2 border border-copper text-copper font-body text-sm rounded-card hover:bg-copper/[0.06] transition-colors duration-200">
            View the transformation playbook &rarr;
          </a>
          <a href="#" className="px-5 py-2.5 md:py-2 border border-copper text-copper font-body text-sm rounded-card hover:bg-copper/[0.06] transition-colors duration-200">
            View the case study &rarr;
          </a>
        </div>
      </div>
      <div className="border-t border-ink/5 py-5 md:py-6 text-center px-5 md:px-6">
        <p className="font-body text-[11px] md:text-xs text-hint leading-relaxed max-w-2xl mx-auto">
          This demo runs on synthetic data calibrated to sector benchmarks. The production version processes full CIMs and broker teasers. Available for live demo on request.
        </p>
      </div>
    </section>
  )
}
