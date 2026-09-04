export type TutorialCategory =
  | 'Inventory'
  | 'Events'
  | 'Appointment'
  | 'Content Studio'
  | 'Profit Calculator'
  | 'To-Do Manager'
  | 'E-Learning'
  | 'Expenses'
  | 'Dental Charting'
  | 'Insurance'
  | 'Lease'
  | 'Snabbb Reward';

export interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  playbackId: string;
  isNew?: boolean;
}

export const TUTORIAL_CATEGORIES: Array<{
  group: 'Productivity' | 'Value Added';
  items: TutorialCategory[];
}> = [
  {
    group: 'Productivity',
    items: [
      'Inventory',
      'Events',
      'Appointment',
      'Content Studio',
      'Profit Calculator',
      'To-Do Manager',
      'E-Learning',
      'Expenses',
      'Dental Charting',
    ],
  },
  {
    group: 'Value Added',
    items: ['Insurance', 'Lease', 'Snabbb Reward'],
  },
];

// Front-end visibility only. Remove a category from this set to show it again.
export const HIDDEN_TUTORIAL_CATEGORIES = new Set<TutorialCategory>([
  'Events',
  'Expenses',
  'Insurance',
  'Lease',
]);

const PLACEHOLDER_PLAYBACK_ID = 'RBYw67M01tIGwOuK2mvLPilMrr11tXM8iCuqTApuhowE';

// Use only the Mux playback ID—the part after https://player.mux.com/—not the complete URL. 
// eg: like the placeHolder above. If you don't have a Mux playback ID yet, you can use the placeholder above until you get one.
export const TUTORIAL_VIDEOS: TutorialVideo[] = [
  // INVENTORY: Replace this playback ID or add more Inventory videos here.
  { id: 'inventory-getting-started', title: 'Getting Started with Snabbb Inventory', description: 'Learn the essential inventory workflow, from setup to managing your stock.', category: 'Inventory', playbackId: 'O78rmnStGiJhmQKWC00X9DtOCGedRNntFCvA5jzI57Ss', isNew: true },

  // EVENTS: Replace the placeholder playback ID or add more Events videos here.
  { id: 'events-getting-started', title: 'Managing Events with Snabbb', description: 'A practical walkthrough for setting up and managing an event.', category: 'Events', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // APPOINTMENT: Replace the placeholder playback ID or add more Appointment videos here.
  { id: 'appointment-getting-started', title: 'Booking Appointments End-to-End', description: 'See how to configure schedules and manage customer appointments.', category: 'Appointment', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // CONTENT STUDIO: Replace the placeholder playback ID or add more Content Studio videos here.
  { id: 'content-studio-getting-started', title: 'Creating Content with Content Studio', description: 'Create and organize content for your business in a few simple steps.', category: 'Content Studio', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // PROFIT CALCULATOR: Replace the placeholder playback ID or add more Profit Calculator videos here.
  { id: 'profit-calculator-getting-started', title: 'Calculating Profit Margins', description: 'Understand costs, pricing, and profit with the built-in calculator.', category: 'Profit Calculator', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // TO-DO MANAGER: Replace the placeholder playback ID or add more To-Do Manager videos here.
  { id: 'todo-getting-started', title: 'Organizing Work with To-Do Manager', description: 'Create, prioritize, and complete your everyday business tasks.', category: 'To-Do Manager', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // E-LEARNING: Replace the placeholder playback ID or add more E-Learning videos here.
  { id: 'elearning-getting-started', title: 'Learning with Snabbb E-Learning', description: 'Find courses and make progress through your learning materials.', category: 'E-Learning', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // EXPENSES: Replace the placeholder playback ID or add more Expenses videos here.
  { id: 'expenses-getting-started', title: 'Tracking Business Expenses', description: 'Record and review expenses so your business stays on track.', category: 'Expenses', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // DENTAL CHARTING: Replace the placeholder playback ID or add more Dental Charting videos here.
  { id: 'dental-charting-getting-started', title: 'Using Dental Charting', description: 'Get familiar with the core patient charting workflow.', category: 'Dental Charting', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // INSURANCE: Replace the placeholder playback ID or add more Insurance videos here.
  { id: 'insurance-getting-started', title: 'Getting Started with Insurance', description: 'Explore the essential insurance features available in Snabbb.', category: 'Insurance', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // LEASE: Replace the placeholder playback ID or add more Lease videos here.
  { id: 'lease-getting-started', title: 'Managing a Lease', description: 'Learn the key steps for organizing lease information.', category: 'Lease', playbackId: PLACEHOLDER_PLAYBACK_ID },

  // SNABBB REWARD: Replace the placeholder playback ID or add more Snabbb Reward videos here.
  { id: 'reward-getting-started', title: 'Using Snabbb Reward', description: 'Discover how to make the most of Snabbb Reward.', category: 'Snabbb Reward', playbackId: PLACEHOLDER_PLAYBACK_ID },
];

export const VISIBLE_TUTORIAL_CATEGORIES = TUTORIAL_CATEGORIES.map((section) => ({
  ...section,
  items: section.items.filter((category) => !HIDDEN_TUTORIAL_CATEGORIES.has(category)),
})).filter((section) => section.items.length > 0);

export const VISIBLE_TUTORIAL_VIDEOS = TUTORIAL_VIDEOS.filter(
  (video) => !HIDDEN_TUTORIAL_CATEGORIES.has(video.category),
);

const CATEGORY_STYLES: Record<TutorialCategory, string> = {
  Inventory: 'border-violet-400 text-violet-600 bg-violet-50',
  Events: 'border-amber-400 text-amber-600 bg-amber-50',
  Appointment: 'border-emerald-400 text-emerald-600 bg-emerald-50',
  'Content Studio': 'border-rose-400 text-rose-600 bg-rose-50',
  'Profit Calculator': 'border-sky-400 text-sky-600 bg-sky-50',
  'To-Do Manager': 'border-blue-400 text-blue-600 bg-blue-50',
  'E-Learning': 'border-purple-400 text-purple-600 bg-purple-50',
  Expenses: 'border-orange-400 text-orange-600 bg-orange-50',
  'Dental Charting': 'border-cyan-400 text-cyan-600 bg-cyan-50',
  Insurance: 'border-green-400 text-green-600 bg-green-50',
  Lease: 'border-indigo-400 text-indigo-600 bg-indigo-50',
  'Snabbb Reward': 'border-teal-400 text-teal-600 bg-teal-50',
};

export const getTutorialCategoryStyle = (category: TutorialCategory) =>
  CATEGORY_STYLES[category];

export const getTutorialThumbnail = (playbackId: string) =>
  // Let Mux use the source video's native dimensions. Requesting a fixed
  // smart-crop can fail when a tutorial's source width is smaller than it.
  `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;

export const getTutorialPlayerUrl = (playbackId: string) =>
  `https://player.mux.com/${playbackId}?metadata-video-title=Snabbb%20Tutorial`;
