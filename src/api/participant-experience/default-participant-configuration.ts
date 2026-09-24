export type OnboardingField = {
  id: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
  maxLength?: number;
};

export type QuestionnaireField = {
  id: string;
  label?: string;
  type: 'text' | 'number' | 'date' | 'select' | 'radio' | 'checkbox';
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
};

export type QuestionnaireRule = {
  key: string;
  title?: string;
  rule: 'days_after' | 'weeks_after' | 'months_after';
  offset: number;
  enabled?: boolean;
  due_time?: string;
  delivery?: {
    type: 'native' | 'external';
    url?: string;
    fields?: QuestionnaireField[];
  };
};

export const GLOBAL_ONBOARDING_FIELDS: OnboardingField[] = [
  {
    id: 'surgery_date',
    label: 'When was the date of your surgery?',
    type: 'date',
    required: true,
  },
  {
    id: 'surgery_location',
    label: 'Where was your surgery?',
    type: 'text',
    required: true,
    maxLength: 200,
  },
  {
    id: 'participant_id',
    label: 'Participant ID',
    type: 'text',
    required: true,
    maxLength: 128,
  },
];

export const DEFAULT_PARTICIPANT_SCHEDULE = {
  timezone: 'Australia/Melbourne',
  questionnaires: [
    {
      key: 'baseline_check',
      title: 'Baseline check',
      rule: 'days_after',
      offset: 0,
      delivery: {
        type: 'native',
        fields: [
          {
            id: 'how_are_you',
            label: 'How are you feeling today?',
            type: 'text',
            required: true,
          },
        ],
      },
    },
    {
      key: 'week_3_pain_score',
      title: '3-week pain score',
      rule: 'weeks_after',
      offset: 3,
      delivery: {
        type: 'native',
        fields: [
          {
            id: 'pain_score',
            label: 'How severe is your pain today? (0–10)',
            type: 'number',
            required: true,
            min: 0,
            max: 10,
          },
        ],
      },
    },
    {
      key: 'week_6_pain_score',
      title: '6-week pain score',
      rule: 'weeks_after',
      offset: 6,
      delivery: {
        type: 'native',
        fields: [
          {
            id: 'pain_score',
            label: 'How severe is your pain today? (0–10)',
            type: 'number',
            required: true,
            min: 0,
            max: 10,
          },
        ],
      },
    },
    {
      key: 'month_6_questionnaire',
      title: '6-month questionnaire',
      rule: 'months_after',
      offset: 6,
      delivery: {
        type: 'native',
        fields: [
          {
            id: 'check_in',
            label: 'How are you feeling since your surgery?',
            type: 'text',
            required: true,
          },
        ],
      },
    },
    {
      key: 'month_12_questionnaire',
      title: '12-month questionnaire',
      rule: 'months_after',
      offset: 12,
      delivery: {
        type: 'native',
        fields: [
          {
            id: 'check_in',
            label: 'How are you feeling since your surgery?',
            type: 'text',
            required: true,
          },
        ],
      },
    },
    {
      key: 'month_24_questionnaire',
      title: '24-month questionnaire',
      rule: 'months_after',
      offset: 24,
      delivery: {
        type: 'native',
        fields: [
          {
            id: 'check_in',
            label: 'How are you feeling since your surgery?',
            type: 'text',
            required: true,
          },
        ],
      },
    },
  ] satisfies QuestionnaireRule[],
  // 0 is the initial questionnaire notification; the following offsets are
  // the reviewed +14 and +28 day reminders from the feedback document.
  reminders: { offsets: [0, 14, 28] },
};

// The customer has not yet selected the completion-prompt delay or modes.
// The provisioning script can enable this per rollout without a code change.
export const DEFAULT_COMPLETION_PROMPT = { enabled: false, modes: [] };
