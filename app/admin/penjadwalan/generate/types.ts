// Re-export types & constants dari scheduler untuk dipakai di UI
// File ini BUKAN "use server" — boleh diimport dari client component
export type {
  GenerateResult, GagalItem, GenerateMode, GuruStat,
  PhaseStat, ApprovalCase, ApprovalDecision, ApprovalOptionKind,
} from "@/lib/scheduler";
export { GENERATE_MODE_LABEL, BACKTRACK_THRESHOLD, RESCUE_THRESHOLD, APPROVAL_OPTION_LABEL } from "@/lib/scheduler";
