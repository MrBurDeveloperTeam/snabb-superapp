// Isolated browser fixture; never imported by the production application.
import React from 'react';
import { createRoot } from 'react-dom/client';
import MyInvoicesPage from '../../features/invoices/MyInvoicesPage';
function Fixture() {
  const [signedIn, setSignedIn] = React.useState(!window.location.search.includes('guest=1'));
  return <MyInvoicesPage signedIn={signedIn} onNavigate={path => { window.location.href = path; }}
    verifySession={async () => { setSignedIn(true); return true; }} />;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
