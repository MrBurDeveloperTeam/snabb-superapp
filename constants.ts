import { getMrBurUrlFromCompanyCode } from './services/authOdoo';
import { MiniApp } from './types';

function getOdooCompanyCode(): string | null {
  try {
    const raw = localStorage.getItem('odoo_session')
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.company_code ?? null
  } catch {
    return null
  }
}

// In your app config array:
const companyCode = getOdooCompanyCode()

export const MINI_APPS: MiniApp[] = [
  // ======= SHOPS =======
  {
    id: 'app-1',
    title: 'Mr.Bur',
    category: 'Shops',
    icon: 'https://app.snabbb.com/icons/mr_bur.png',
    route: getMrBurUrlFromCompanyCode(companyCode),
    colorScheme: { text: 'text-[#4338ca]', icon: '#0891b2' }
  },
  {
    id: 'app-12',
    title: 'Kaneiko',
    category: 'Shops',
    icon: '/icons/kaneiko_black.png',
    // iconDark: '/icons/kaneiko_white.png',
    colorScheme: {  text: 'text-[#a21caf]', icon: '#0891b2' }
  },
  {
    id: 'app-13',
    title: 'Lunaflow',
    category: 'Shops',
    icon: 'https://app.snabbb.com/images/lunaflow.png',
    colorScheme: {  text: 'text-[#a21caf]', icon: '#0891b2' }
  },
  // {
  //   id: 'app-11',
  //   title: 'Ortho',
  //   category: 'Shops',
  //   icon: 'fa-solid fa-tooth',
  //   colorScheme: { text: 'text-[#0369a1]', icon: '#0369a1' }
  // },
  {
    id: 'app-16',
    title: 'Endora',
    category: 'Shops',
    icon: 'https://app.snabbb.com/images/endora.png',
    colorScheme: {  text: 'text-[#15803d]', icon: '#0891b2' }
  },
  // {
  //   id: 'app-13',
  //   title: 'DTV',
  //   category: 'Shops',
  //   icon: 'fa-solid fa-tv',
  //   colorScheme: { text: 'text-[#c2410c]', icon: '#c2410c' }
  // },

  // ======= PRODUCTIVITY =======
  {
    id: 'app-2',
    title: 'Inventory',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/inventory_tiffany.png',
    route: `https://inventory.snabbb.com/`,
    colorScheme: { text: 'text-[#b91c1c]', icon: '#0891b2' }
  },
  {
    id: 'app-3',
    title: 'Events',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/event.png',
    // route: `https://app.snabbb.com/event`,
    colorScheme: { text: 'text-[#0891b2]', icon: '#0891b2' }
  },
  {
    id: 'app-4',
    title: 'Appointment',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/appointment.png',
    route: `https://appointment.snabbb.com/`,
    colorScheme: {  text: 'text-[#15803d]', icon: '#0891b2' }
  },
  {
    id: 'app-6',
    title: 'Content Studio',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/ai_image.png',
    route: 'https://imageai.snabbb.com',
    colorScheme: { text: 'text-[#7e22ce]', icon: '#0891b2' }
  },
  // {
  //   id: 'app-7',
  //   title: 'AI Video Lab',
  //   category: 'Productivity',
  //   icon: 'https://app.snabbb.com/icons/ai_video.png',
  //   // route: `https://app.snabbb.com`,
  //   colorScheme: { text: 'text-[#312e81]', icon: '#312e81' }
  // },
  {
    id: 'app-8',
    title: 'Profit Calculator',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/profit_calculator.png',
    route: `https://calculator.snabbb.com`,
    colorScheme: {  text: 'text-[#b45309]', icon: '#0891b2' }
  },
  {
    id: 'app-9',
    title: 'To-Do Manager',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/todo_tiffany.png',
    route: `https://todo.snabbb.com/`,
    colorScheme: { text: 'text-[#b45309]', icon: '#0891b2' }
  },
  {
    id: 'app-10',
    title: 'E-Learning',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/e-learning.png',
    route: `https://e-learning.snabbb.com/`,
    colorScheme: {  text: 'text-[#b45309]', icon: '#0891b2' }
  },
  {
    id: 'app-11',
    title: 'Expenses',
    category: 'Productivity',
    icon: 'https://app.snabbb.com/icons/expenses_tiffany.png',
    // route: `https://app.snabbb.com`,
    colorScheme: {  text: 'text-[#b45309]', icon: '#0891b2' }
  },

  // ======= VALUE ADDED =======
  {
    id: 'app-14',
    title: 'Insurance',
    category: 'Value Added',
    icon: '/icons/insurance.png',
    // route: `https://app.snabbb.com`,
    colorScheme: {  text: 'text-[#166534]', icon: '#0891b2' }
  },
  {
    id: 'app-15',
    title: 'Lease',
    category: 'Value Added',
    icon: '/icons/lease.png',
    // route: `https://app.snabbb.com`,
    colorScheme: { text: 'text-[#854d0e]', icon: '#0891b2' }
  },
  {
    id: 'app-15',
    title: 'Snabbb Reward',
    category: 'Value Added',
    icon: `/icons/reward.png`,
    route: `https://reward.snabbb.com`,
    colorScheme: { text: 'text-[#854d0e]', icon: '#0891b2' }
  },
];


export const CATEGORIES: string[] = ['All', 'Shops', 'Productivity', 'Value Added'];