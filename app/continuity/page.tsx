import ContinuityLab from "@/components/ContinuityLab";
import { parseOverrides } from "@/lib/overrides-url";
import { parsePlannerConfig, type SearchParam } from "@/lib/planner-config";

export const metadata = { title: "Continuity Lab · CoolGrid" };

export default function ContinuityPage({ searchParams }: { searchParams?: Record<string, SearchParam> }) {
  const params = searchParams ?? {};
  return <ContinuityLab initialConfig={parsePlannerConfig(params)} initialOverrides={parseOverrides(params.o)} initialPolicy={params.policy === "fair" ? "fair" : "max"} />;
}
