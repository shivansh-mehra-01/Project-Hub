import type { AccreditationCycleDto } from "../../../../lib/api/accreditationTypes.ts";

/**
 * Pure state transition resolver for accreditation cycles API response.
 * Handles populated data replacement, explicit empty clearing, and failed request state preservation.
 */
export function resolveCyclesState(
  currentCycles: AccreditationCycleDto[],
  apiResult: PromiseSettledResult<AccreditationCycleDto[]>
): { cycles: AccreditationCycleDto[]; activeCycleId: string } {
  if (apiResult.status === "fulfilled") {
    const resolved = Array.isArray(apiResult.value) ? apiResult.value : [];
    return {
      cycles: resolved,
      activeCycleId: resolved[0]?.id || "",
    };
  }
  // On network failure / rejection, do not silently clear valid existing state
  return {
    cycles: currentCycles,
    activeCycleId: currentCycles[0]?.id || "",
  };
}
