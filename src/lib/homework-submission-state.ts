import type { SubmissionStatus } from "@/generated/prisma/client";

const INTERACTIVE_SUBMISSION_EDITABLE_STATUSES = new Set<SubmissionStatus>([
  "DRAFT",
  "RETURNED",
]);

export function canSubmitInteractiveHomework(
  status: SubmissionStatus | null | undefined,
) {
  return status == null || INTERACTIVE_SUBMISSION_EDITABLE_STATUSES.has(status);
}
