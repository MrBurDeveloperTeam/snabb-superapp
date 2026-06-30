
export type Category = 'All' | 'Shops' | 'Productivity' | 'Value Added';

export interface MiniApp {
  id: string;
  title: string;
  route?: string;
  category: Category;
  icon: string;
  colorScheme: {
    bg: string;
    text: string;
    icon: string;
  };
}

export interface AIAppSuggestion {
  title: string;
  description: string;
  category: Category;
  suggestedFeatures: string[];
}
