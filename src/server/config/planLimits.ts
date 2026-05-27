export const PLAN_LIMITS = {
  free: {
    scansPerMonth: 3,
    apiCallsPerHour: 0,
    teamMembers: 1,
  },
  starter: {
    scansPerMonth: 30,
    apiCallsPerHour: 60,
    teamMembers: 3,
  },
  professional: {
    scansPerMonth: 150,
    apiCallsPerHour: 300,
    teamMembers: 10,
  },
  enterprise: {
    scansPerMonth: Infinity,
    apiCallsPerHour: Infinity,
    teamMembers: Infinity,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export function getPlanLimit(planTier: string | undefined, key: keyof typeof PLAN_LIMITS.free): number {
  const tier = (planTier || "free") as PlanTier;
  return PLAN_LIMITS[tier]?.[key] ?? 3;
}
