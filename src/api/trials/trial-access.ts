import { TrialStatus } from '@/database/enums/trials.enum';

// A participant acknowledgement is never informed consent to join a study.
export const STUDY_CONFIRMATION_FILTER = {
  is_approved: true,
  informed_consent_obtained: true,
  eligibility_confirmed: true,
  is_active: true,
};

export const STUDY_VISIBLE_STATUSES = [
  TrialStatus.IN_PROGRESS,
  TrialStatus.COMPLETED,
  TrialStatus.IN_COMPLETE,
];

export function canAccessStudy(
  record:
    | {
        is_approved?: boolean;
        informed_consent_obtained?: boolean;
        eligibility_confirmed?: boolean;
        is_active?: boolean;
        trial_status?: string;
      }
    | null
    | undefined,
): boolean {
  return (
    !!record &&
    record.is_approved === true &&
    record.informed_consent_obtained === true &&
    record.eligibility_confirmed === true &&
    record.is_active === true &&
    STUDY_VISIBLE_STATUSES.includes(record.trial_status as TrialStatus)
  );
}
