import { MiniApp } from './types';

export const MINI_APPS: MiniApp[] = [
  // ======= SHOPS =======
  {
    id: 'app-1',
    title: 'Mr.Bur',
    category: 'Shops',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMq1ycD19uS2-bqaqsEg7R_wyOnVH9gTXyQA&s',
    route: `https://shop.snabbb.com/`,
    colorScheme: { bg: 'bg-[#eef2ff]', text: 'text-[#4338ca]', icon: '#4338ca' }
  },
  // {
  //   id: 'app-10',
  //   title: 'Kaneiko',
  //   category: 'Shops',
  //   icon: 'fa-solid fa-store',
  //   colorScheme: { bg: 'bg-[#fdf4ff]', text: 'text-[#a21caf]', icon: '#a21caf' }
  // },
  // {
  //   id: 'app-11',
  //   title: 'Ortho',
  //   category: 'Shops',
  //   icon: 'fa-solid fa-tooth',
  //   colorScheme: { bg: 'bg-[#f0f9ff]', text: 'text-[#0369a1]', icon: '#0369a1' }
  // },
  // {
  //   id: 'app-12',
  //   title: 'Endo',
  //   category: 'Shops',
  //   icon: 'fa-solid fa-stethoscope',
  //   colorScheme: { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', icon: '#15803d' }
  // },
  // {
  //   id: 'app-13',
  //   title: 'DTV',
  //   category: 'Shops',
  //   icon: 'fa-solid fa-tv',
  //   colorScheme: { bg: 'bg-[#fff7ed]', text: 'text-[#c2410c]', icon: '#c2410c' }
  // },

  // ======= PRODUCTIVITY =======
  {
    id: 'app-2',
    title: 'Inventory',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/inventory_tiffany.png',
    route: `https://inventory.snabbb.com/`,
    colorScheme: { bg: 'bg-[#E6F4F3]', text: 'text-[#b91c1c]', icon: '#0891b2' }
  },
  {
    id: 'app-3',
    title: 'Events',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/event.png',
    route: `https://event.snabbb.com`,
    colorScheme: { bg: 'bg-[#ecfeff]', text: 'text-[#0891b2]', icon: '#0891b2' }
  },
  {
    id: 'app-4',
    title: 'Appointment',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/appointment.png',
    route: `https://appointment.snabbb.com/`,
    colorScheme: { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', icon: '#0891b2' }
  },
  {
    id: 'app-6',
    title: 'AI Image Studio',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/ai_image.png',
    route: 'https://imageai.snabbb.com',
    colorScheme: { bg: 'bg-[#F0FAF0]', text: 'text-[#7e22ce]', icon: '#0891b2' }
  },
  {
    id: 'app-7',
    title: 'AI Video Lab',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/ai_video.png',
    route: `https://app.snabbb.com`,
    colorScheme: { bg: 'bg-[#F5F7F6]', text: 'text-[#312e81]', icon: '#312e81' }
  },
  {
    id: 'app-8',
    title: 'Profit Calculator',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/profit_calculator.png',
    route: `https://app.snabbb.com`,
    colorScheme: { bg: 'bg-[#E8F8F7]', text: 'text-[#b45309]', icon: '#312e81' }
  },
  {
    id: 'app-9',
    title: 'To-Do Manager',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/todo_tiffany.png',
    route: `https://todo.snabbb.com/`,
    colorScheme: { bg: 'bg-[#F4FBFA]', text: 'text-[#b45309]', icon: '#0891b2' }
  },
  {
    id: 'app-10',
    title: 'E-Learning',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/e-learning.png',
    route: `https://app.snabbb.com`,
    colorScheme: { bg: 'bg-[#F9FBFA]', text: 'text-[#b45309]', icon: '#0891b2' }
  },
  {
    id: 'app-11',
    title: 'Expenses',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/expenses_tiffany.png',
    route: `https://app.snabbb.com`,
    colorScheme: { bg: 'bg-[#ECFDFC]', text: 'text-[#b45309]', icon: '#0891b2' }
  },

  // ======= VALUE ADDED =======
  {
    id: 'app-14',
    title: 'Insurance',
    category: 'Value Added',
    icon: 'fa-solid fa-shield-halved',
    route: `https://app.snabbb.com`,
    colorScheme: { bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', icon: '#0891b2' }
  },
  {
    id: 'app-15',
    title: 'Lease',
    category: 'Value Added',
    icon: 'fa-solid fa-file-contract',
    route: `https://app.snabbb.com`,
    colorScheme: { bg: 'bg-[#fefce8]', text: 'text-[#854d0e]', icon: '#0891b2' }
  },
];

export const CATEGORIES: string[] = ['All', 'Shops', 'Productivity', 'Value Added'];