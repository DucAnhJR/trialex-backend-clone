export interface SupportQuestionData {
  title: string;
  answer: string;
}

export interface SupportFaqData {
  thread_title: string;
  questions: SupportQuestionData[];
}

export const SUPPORT_FAQ_DATA: SupportFaqData[] = [
  {
    thread_title: 'Common Issues',
    questions: [
      {
        title: 'What is the purpose of this app?',
        answer:
          'This app is designed to help users find, enroll in, and manage their participation in clinical trials. It provides information about ongoing trials, eligibility criteria, and allows users to track their progress and communicate with researchers.',
      },
    ],
  },
  {
    thread_title: 'Getting Started',
    questions: [
      {
        title: 'How do I create an account?',
        answer:
          'Open the app and select Sign Up. Enter the required information, create a secure password, and follow the verification instructions to activate your account.',
      },
      {
        title: 'What information do I need to provide when signing up?',
        answer:
          'You may be asked for basic contact and profile information, such as your name, email address, phone number, and date of birth. Additional health information may be requested later to help assess trial eligibility.',
      },
      {
        title: 'Is my personal information safe?',
        answer:
          'The app uses security measures to protect your information and limits access to authorized parties. Review the app privacy policy for details about how your data is collected, stored, and shared.',
      },
    ],
  },
  {
    thread_title: 'Finding a Clinical Trial',
    questions: [
      {
        title: 'How do I search for clinical trials?',
        answer:
          'Use the search or discover section to browse available clinical trials. You can review each trial description, location, requirements, and other study details before deciding whether to apply.',
      },
      {
        title: 'How can I check if I am eligible for a trial?',
        answer:
          'Open the trial details and review its eligibility criteria. Your profile information may help identify potential matches, but the research team makes the final eligibility decision after screening.',
      },
      {
        title: 'What if I have questions about a trial?',
        answer:
          'Check the trial details for contact information or use the available contact option. The research team can answer questions about eligibility, procedures, risks, benefits, and participation requirements.',
      },
    ],
  },
  {
    thread_title: 'Enrollment',
    questions: [
      {
        title: 'How do I enrol in a clinical trial?',
        answer:
          'Open the trial you are interested in, review the study details and eligibility criteria, and select the option to apply or express interest. Complete the requested information and submit your application.',
      },
      {
        title: 'What happens after I apply for a trial?',
        answer:
          'The research team will review your application and may contact you for additional information or a screening appointment. Applying does not guarantee enrollment; participation is confirmed only after eligibility and consent requirements are completed.',
      },
    ],
  },
  {
    thread_title: 'During the Trial',
    questions: [
      {
        title: 'How do I track my progress in the trial?',
        answer:
          'Open your active trial to view available milestones, appointments, tasks, and study updates. Complete required activities on time and contact the research team if any information appears incorrect or is unclear.',
      },
      {
        title: 'Can I communicate with the research team through the app?',
        answer:
          'If messaging or contact details are available for your trial, you can use them to reach the research team. For urgent medical concerns, use the emergency contact instructions provided by the study rather than relying on an in-app message.',
      },
      {
        title: 'What if I need to withdraw from the trial?',
        answer:
          'Participation is voluntary, and you can choose to withdraw. Contact the research team before stopping study activities so they can explain any recommended safety steps and complete the withdrawal process.',
      },
    ],
  },
  {
    thread_title: 'Technical Support',
    questions: [
      {
        title: 'I forgot my password. How can I reset it?',
        answer:
          'Select Forgot Password on the sign-in screen, enter the email address associated with your account, and follow the reset instructions sent to you. Check your spam folder if the message does not arrive.',
      },
      {
        title: 'The app is not working correctly. What should I do?',
        answer:
          'Check your internet connection, close and reopen the app, and make sure you are using the latest version. If the problem continues, contact support with a description of the issue, your device type, and any relevant screenshots.',
      },
      {
        title: 'How can I update my personal information?',
        answer:
          'Go to your profile or account settings, edit the available fields, and save your changes. Some verified information may require assistance from support or the research team to update.',
      },
    ],
  },
  {
    thread_title: 'Miscellaneous',
    questions: [
      {
        title: 'Who can I contact for more information about the app?',
        answer:
          'Use the Contact Support option in the app to send your question. For questions about a specific clinical trial, contact the research team using the details shown on that trial page.',
      },
      {
        title: 'Can I provide feedback about the app?',
        answer:
          'Yes. Use the feedback or contact support option to share suggestions, report an issue, or describe your experience. Detailed feedback helps the team understand and improve the app.',
      },
    ],
  },
];
