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

    // Only fall back when there's a single, unambiguous company on the
    // session — guessing entries[0] when there are multiple companies is
    // what previously caused every user to silently resolve to whichever
    // company happened to be listed first (e.g. Malaysia/MMY).
    const entries = Object.entries(companyCodes);
    if (entries.length !== 1) {
      console.warn(
        "Could not determine active company from odoo_session (current company unmatched, and company_codes is empty or ambiguous):",
        { currentCompanyId, companyCodes }
      );
      return null;
    }

    const [companyId, companyCode] = entries[0];
    return {
      companyId: String(companyId),
      companyCode: String(companyCode).toUpperCase(),
    };
  } catch (e) {
    console.error("Failed to parse odoo_session:", e);
    return null;
  }
}