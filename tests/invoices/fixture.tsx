// Isolated browser fixture; never imported by the production application.
import React from 'react';
import { createRoot } from 'react-dom/client';
import MyInvoicesPage from '../../features/invoices/MyInvoicesPage';
createRoot(document.getElementById('root')!).render(<MyInvoicesPage signedIn={!window.location.search.includes('guest=1')} onNavigate={path => { window.location.href = path; }} />);
