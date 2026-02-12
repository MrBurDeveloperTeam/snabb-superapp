
import { MiniApp } from './types';

export const MINI_APPS: MiniApp[] = [
  {
    id: 'app-1',
    title: 'Mr.Bur Shop',
    category: 'Management',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMq1ycD19uS2-bqaqsEg7R_wyOnVH9gTXyQA&s',
    route: 'https://mrbur-sandbox.odoo.com/shop',
    colorScheme: { bg: 'bg-[#eef2ff]', text: 'text-[#4338ca]', icon: '#4338ca' }
  },
  {
    id: 'app-2',
    title: 'Inventory',
    category: 'Management',
    icon: 'fa-solid fa-boxes-stacked',
    route: `https://inventory.mrburstudio.com/`,
    colorScheme: { bg: 'bg-[#fef2f2]', text: 'text-[#b91c1c]', icon: '#b91c1c' }
  },
  {
    id: 'app-3',
    title: 'Event',
    category: 'Planning',
    icon: 'fa-solid fa-calendar-check',
    route: `https://event.mrburstudio.com/`,
    colorScheme: { bg: 'bg-[#ecfeff]', text: 'text-[#0891b2]', icon: '#0891b2' }
  },
  {
    id: 'app-4',
    title: 'Appointment',
    category: 'Planning',
    icon: 'fa-solid fa-calendar-plus',
    route: `https://appointment.mrburstudio.com/`,
    colorScheme: { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', icon: '#15803d' }
  },
  {
    id: 'app-5',
    title: 'Recruitment',
    route: `https://recruitment.mrburstudio.com/`,
    category: 'Management',
    icon: 'fa-solid fa-user-tie',
    colorScheme: { bg: 'bg-[#fff7ed]', text: 'text-[#c2410c]', icon: '#c2410c' }
  },
  {
    id: 'app-6',
    title: 'AI Image Studio',
    category: 'Creative',
    icon: 'fa-solid fa-wand-magic-sparkles',
    colorScheme: { bg: 'bg-[#faf5ff]', text: 'text-[#7e22ce]', icon: '#7e22ce' }
  },
  {
    id: 'app-7',
    title: 'AI Video Lab',
    category: 'Creative',
    icon: 'fa-solid fa-clapperboard',
    colorScheme: { bg: 'bg-[#eef2ff]', text: 'text-[#312e81]', icon: '#312e81' }
  },
  {
    id: 'app-8',
    title: 'Smart Calculator',
    category: 'Utilities',
    icon: 'fa-solid fa-calculator',
    colorScheme: { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', icon: '#b45309' }
  },
  {
    id: 'app-9',
    title: 'To-Do Manager',
    category: 'Utilities',
    icon: 'fa-solid fa-list-check',
    route: `https://todo.mrburstudio.com/`,
    colorScheme: { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', icon: '#b45309' }
  },
];

export const CATEGORIES: string[] = ['All', 'Management', 'Planning', 'Creative', 'Utilities'];
