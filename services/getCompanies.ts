export const getActiveCompanyFromOdooSession = () => {
  try {
    const raw = localStorage.getItem("odoo_session");
    if (!raw) return null;

    const session = JSON.parse(raw);
    const companyCodes = session?.company_codes || {};

    // Try the most likely current company fields first
    const currentCompanyId =
      session?.user_companies?.current_company?.[0] ||
      session?.user_companies?.current_company ||
      session?.company_id ||
      session?.current_company ||
      null;

    console.log('the company code: ', companyCodes[currentCompanyId]);

    if (currentCompanyId && companyCodes[currentCompanyId]) {
      return {
        companyId: String(currentCompanyId),
        companyCode: String(companyCodes[currentCompanyId]).toUpperCase(),
      };
    }

    const entries = Object.entries(companyCodes);
    if (entries.length === 0) {
      console.warn(
        "Could not determine active company from odoo_session (current company unmatched, and company_codes is empty):",
        { currentCompanyId, companyCodes }
      );
      return null;
    }

    // No unambiguous "current company" on the session (single-company case
    // is handled above/below transparently). When the session lists
    // multiple companies, default to the lowest company ID rather than
    // failing the login flow — this matches Odoo's own convention of
    // treating the lowest-ID company as the default/primary company.
    if (entries.length > 1) {
      console.warn(
        "Multiple companies found on odoo_session; defaulting to the lowest company ID:",
        { currentCompanyId, companyCodes }
      );
    }

    const [companyId, companyCode] = entries.sort(
      (a, b) => Number(a[0]) - Number(b[0])
    )[0];

    return {
      companyId: String(companyId),
      companyCode: String(companyCode).toUpperCase(),
    };
  } catch (e) {
    console.error("Failed to parse odoo_session:", e);
    return null;
  }
}