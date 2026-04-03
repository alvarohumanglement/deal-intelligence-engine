'use client'

export default function ThesisFooter() {
  return (
    <section className="bg-paper-warm border-t border-ink/5">
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <p className="font-display text-lg text-ink leading-relaxed max-w-2xl mx-auto">
          This engine runs on the Heritage Experience Platforms thesis — a consolidation framework targeting independently owned Mediterranean restaurant groups at 5.5–7.0x entry.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="#" className="px-5 py-2 border border-copper text-copper font-body text-sm rounded-card hover:bg-copper/[0.06] transition-colors duration-200">
            View the thesis &rarr;
          </a>
          <a href="#" className="px-5 py-2 border border-copper text-copper font-body text-sm rounded-card hover:bg-copper/[0.06] transition-colors duration-200">
            View the transformation playbook &rarr;
          </a>
          <a href="#" className="px-5 py-2 border border-copper text-copper font-body text-sm rounded-card hover:bg-copper/[0.06] transition-colors duration-200">
            View the case study &rarr;
          </a>
        </div>
      </div>
      <div className="border-t border-ink/5 py-6 text-center px-6">
        <p className="font-body text-xs text-hint leading-relaxed max-w-2xl mx-auto">
          This demo runs on synthetic data calibrated to sector benchmarks. The production version processes full CIMs and broker teasers. Available for live demo on request.
        </p>
      </div>
    </section>
  )
}
