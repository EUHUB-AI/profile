"use client";

import { Terminal } from "lucide-react";
import { useState } from "react";

interface Job {
    company: string;
    role: string;
    period: string;
    details: string[];
}

const jobs: Job[] = [
    {
        company: "(NDA) Targeted UX research recruitment",
        role: "DevOps Architect",
        period: "Dec 2023 - Present",
        details: [
            "Migrated project (research CRM) from legacy VM infra to modern AWS ECS Container Architecture.",
            "Implemented secured, predictable infrastructure with 100% uptime using Terraform Cloud.",
            "Configured ALBs with robust health checks to eliminate risks and human error.",
            "Established GitOps workflow where 'master' branch is always production-ready.",
            "Achieved SOC 2 compliance readiness through infrastructure design.",
            "Designed TFC variable-driven infrastructure enabling changes without deep DevOps expertise."
        ]
    },
    {
        company: "(NDA) (Project: Pajak.go.id)",
        role: "DevOps Architect",
        period: "Dec 2023 - Dec 2024",
        details: [
            "Scaled and supported vast K8s microservices architecture designed to handle the anticipated load of 300 million users",
            "Automated resilience via rigorous ALB health checks and K8s probes, systematically eliminating dependence on manual operational intervention",
            "Enforced rigorous GitOps CI/CD pipelines, ensuring the codebase remained consistent and the 'master' branch was continuously production-ready",
            "Bridged technology and strategy by negotiating and embedding security controls necessary for high-compliance standards, specifically focusing on the Availability and Security Trust Service Criteria (TSC)"
        ]
    },
    {
        company: "Geniusee",
        role: "Strong Middle DevOps",
        period: "May 2022 - Oct 2023",
        details: [
            "Migrated legacy VM infrastructure to modern AWS ECS.",
            "Optimized CI/CD pipelines using GitLab CI.",
            "Managed Kubernetes clusters and Docker registries."
        ]
    },
    {
        company: "NETFORCE",
        role: "Middle DevOps",
        period: "Mar 2021 - Apr 2022",
        details: [
            "Maintained large-scale production environments.",
            "Automated deployment processes using Jenkins and Python.",
            "Monitored system health with Prometheus and Grafana."
        ]
    },
    {
        company: "AVyS Wholesale LDA",
        role: "System Engineer (Telecom)",
        period: "Mar 2020 - Mar 2021",
        details: [
            "L1 Support for Fleximovil.es",
            "On-premise infra support and maintenance",
            "Monitoring, provisioning of on-premise infra with Zabbix"
        ]
    },
    {
        company: "Imonomy",
        role: "DevOps",
        period: "2019 - Mar 2020",
        details: [
            "Configured RTB servers for real-time bidding operations.",
            "Developed Bash scripts for cron jobs",
            "Monitored with Zabbix, handled replications, and managed Nginx",
            "Managed Python, PHP, JS, Apache, MySQL and Popular CMSes."
        ]
    },
];

export default function CareerAccordion() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="w-full font-mono">
            <div className="mb-4 text-foreground/80 border-b border-foreground/20 pb-2">
                $ cat EmploymentHistory.json
            </div>
            <div className="space-y-2">
                {jobs.map((job, index) => (
                    <div key={index} className="border border-foreground/30 bg-background/50">
                        <button
                            onClick={() => toggleAccordion(index)}
                            className="w-full flex items-center justify-between p-3 hover:bg-foreground/10 transition-colors text-left focus:outline-none"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-accent font-bold">
                                    {openIndex === index ? "[-]" : "[+]"}
                                </span>
                                <span className="font-bold">
                                    [{job.company} - {job.role}]
                                </span>
                            </div>
                            <span className="text-sm opacity-70 hidden sm:block">{job.period}</span>
                        </button>

                        {openIndex === index && (
                            <div className="p-4 border-t border-foreground/30 bg-black/20">
                                <div className="mb-2 text-sm sm:hidden text-accent">{job.period}</div>
                                <ul className="list-none space-y-2 pl-4">
                                    {job.details.map((detail, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Terminal size={16} className="mt-1 shrink-0 text-accent" />
                                            <span>{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
