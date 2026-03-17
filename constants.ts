import { MiniApp } from './types';
import inventory from '@/assets/icons/inventory.svg';

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
    icon: inventory,
    route: `https://inventory.snabbb.com/`,
    colorScheme: { bg: 'bg-[#fef2f2]', text: 'text-[#b91c1c]', icon: '#b91c1c' }
  },
  {
    id: 'app-3',
    title: 'Events',
    category: 'Productivity',
    icon: 'https://mrbur.odoo.com/event/static/description/icon.png',
    route: `https://event.snabbb.com`,
    colorScheme: { bg: 'bg-[#ecfeff]', text: 'text-[#0891b2]', icon: '#0891b2' }
  },
  {
    id: 'app-4',
    title: 'Appointment',
    category: 'Productivity',
    icon: 'https://mrbur.odoo.com/appointment/static/description/icon.png',
    route: `https://appointment.snabbb.com/`,
    colorScheme: { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', icon: '#15803d' }
  },
  {
    id: 'app-6',
    title: 'AI Image Studio',
    category: 'Productivity',
    icon: 'fa-solid fa-wand-magic-sparkles',
    route: 'https://imageai.snabbb.com',
    colorScheme: { bg: 'bg-[#faf5ff]', text: 'text-[#7e22ce]', icon: '#7e22ce' }
  },
  {
    id: 'app-7',
    title: 'AI Video Lab',
    category: 'Productivity',
    icon: 'fa-solid fa-clapperboard',
    colorScheme: { bg: 'bg-[#eef2ff]', text: 'text-[#312e81]', icon: '#312e81' }
  },
  {
    id: 'app-8',
    title: 'Profit Calculator',
    category: 'Productivity',
    icon: 'fa-solid fa-calculator',
    route: `https://calculator.snabbb.com/`,
    colorScheme: { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', icon: '#b45309' }
  },
  {
    id: 'app-9',
    title: 'To-Do Manager',
    category: 'Productivity',
    icon: 'https://mrbur.odoo.com/project_todo/static/description/icon.png',
    route: `https://todo.snabbb.com/`,
    colorScheme: { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', icon: '#b45309' }
  },
  {
    id: 'app-10',
    title: 'E-Learning',
    category: 'Productivity',
    icon: 'https://mrbur.odoo.com/website_slides/static/description/icon.png',
    colorScheme: { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', icon: '#b45309' }
  },
  {
    id: 'app-11',
    title: 'Expenses',
    category: 'Productivity',
    icon: 'https://mrbur.odoo.com/hr_expense/static/description/icon.png',
    colorScheme: { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', icon: '#b45309' }
  },

  // ======= VALUE ADDED =======
  {
    id: 'app-14',
    title: 'Insurance',
    category: 'Value Added',
    icon: 'fa-solid fa-shield-halved',
    colorScheme: { bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', icon: '#166534' }
  },
  {
    id: 'app-15',
    title: 'Lease',
    category: 'Value Added',
    icon: 'fa-solid fa-file-contract',
    colorScheme: { bg: 'bg-[#fefce8]', text: 'text-[#854d0e]', icon: '#854d0e' }
  },
];

export const CATEGORIES: string[] = ['All', 'Shops', 'Productivity', 'Value Added'];