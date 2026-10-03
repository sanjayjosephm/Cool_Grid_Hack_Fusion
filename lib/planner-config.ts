export const ARRANGEMENTS = ["existing", "backup-added", "local-facilities"] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

export type PlannerConfig = {
  arrangement: Arrangement | null;
  crews: number | null;
  errors: string[];
};

export type SearchParam = string | string[] | undefined;

export function parsePlannerConfig(params: Record<string, SearchParam>): PlannerConfig {
  const arrangementValue = Array.isArray(params.arrangement) ? params.arrangement[0] : params.arrangement;
  const crewValue = Array.isArray(params.crews) ? params.crews[0] : params.crews;
  const arrangement = ARRANGEMENTS.find((option) => option === arrangementValue) ?? null;
  const parsedCrews = crewValue !== undefined && /^(0|[1-9]\d*)$/.test(crewValue) ? Number(crewValue) : null;
  const crews = parsedCrews !== null && Number.isSafeInteger(parsedCrews) ? parsedCrews : null;
  const errors = [
    ...(arrangementValue !== undefined && arrangement === null ? ["The arrangement in this link is not recognized. Select an arrangement again."] : []),
    ...(crewValue !== undefined && crews === null ? ["The crew count in this link must be a non-negative whole number. Enter it again."] : []),
  ];
  return { arrangement, crews, errors };
}

export const ARRANGEMENT_LABELS: Record<Arrangement, string> = {
  existing: "Existing arrangement",
  "backup-added": "Backup added",
  "local-facilities": "Local facilities",
};

export function plannerConfigUrl(path: "/continuity" | "/brief", config: PlannerConfig): string {
  const query = new URLSearchParams();
  if (config.arrangement) query.set("arrangement", config.arrangement);
  if (config.crews !== null) query.set("crews", String(config.crews));
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}
