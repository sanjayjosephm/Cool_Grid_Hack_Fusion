import ContinuityLab from "@/components/ContinuityLab";
import { parsePlannerConfig, type SearchParam } from "@/lib/planner-config";

export const metadata = { title: "Continuity Lab · CoolGrid" };

export default function ContinuityPage({ searchParams }: { searchParams?: Record<string, SearchParam> }) {
  return <ContinuityLab initialConfig={parsePlannerConfig(searchParams ?? {})} />;
}
