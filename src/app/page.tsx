import Image from "next/image";
import ConsoleHeader from "@/components/ConsoleHeader";
import ThemeToggle from "@/components/ThemeToggle";
import CareerAccordion from "@/components/CareerAccordion";
import ComplianceBadge from "@/components/ComplianceBadge";
import HiddenSEO from "@/components/HiddenSEO";
import AgentContact from "@/components/AgentContact";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 relative overflow-hidden flex flex-col items-center">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-[-1] opacity-20 pointer-events-none">
        <Image
          src="/retro-admin-bg.png"
          alt="Retro System Admin"
          fill
          className="object-cover grayscale"
          priority
        />
        <div className="absolute inset-0 bg-background/80 mix-blend-multiply" />
      </div>

      {/* Top Bar */}
      <div className="w-full max-w-4xl flex justify-end mb-4">
        <ThemeToggle />
      </div>

      {/* Main Console Container */}
      <div className="w-full max-w-4xl border border-foreground/50 bg-background/90 p-6 md:p-10 shadow-[0_0_20px_rgba(0,255,0,0.1)] backdrop-blur-sm">
        <ConsoleHeader />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile & Metrics */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border border-foreground/30 p-4">
              <h1 className="text-xl font-bold mb-2 text-accent">MIKE G.</h1>
              <p className="text-sm opacity-80 mb-4">SRE & (Dev/AI/Sec Ops) Architect</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <ComplianceBadge label="Terraform Associate 003" />
                <ComplianceBadge label="CCNA" />
                <ComplianceBadge label="CKAD" />
                <ComplianceBadge label="CKA" />
                <ComplianceBadge label="AWS Certified SA - Associate (SAA-C03)" />
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-3 border-l-2 border-accent bg-accent/5">
                <div className="font-bold text-accent">UPTIME GUARANTEE</div>
                <div className="text-lg font-bold">100.00%</div>
                <div className="text-xs opacity-70">Operational Availability</div>
              </div>

              <div className="p-3 border-l-2 border-accent bg-accent/5">
                <div className="font-bold text-accent">ARCHITECTURE</div>
                <div className="text-xs">Legacy VM &rarr; AWS ECS</div>
                <div className="text-xs opacity-70">Migration Complete</div>
              </div>

              <AgentContact />
            </div>
          </div>

          {/* Right Column: Career History */}
          <div className="lg:col-span-2">
            <CareerAccordion />
          </div>
        </div>

        {/* Footer / Status Line */}
        <div className="mt-12 pt-4 border-t border-foreground/30 flex justify-between text-xs opacity-60 font-mono">
          <span>STATUS: ONLINE</span>
          <span>MEM: 64KB OK</span>
        </div>
      </div>

      <HiddenSEO />
    </main>
  );
}
