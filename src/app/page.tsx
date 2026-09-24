import AgentContact from "@/components/AgentContact";
import CareerAccordion from "@/components/CareerAccordion";
import ComplianceBadge from "@/components/ComplianceBadge";
import ConsoleHeader from "@/components/ConsoleHeader";
import HiddenSEO from "@/components/HiddenSEO";

export default function Home() {
  return (
    <div>
      <ConsoleHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
        <div className="lg:col-span-2">
          <CareerAccordion />
        </div>
      </div>
      <HiddenSEO />
    </div>
  );
}
