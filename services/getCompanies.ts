// company_id -> the actual Snabbb Reward/wallet website code. Odoo's company_codes on the
// session is res.company's generic accounting code, which doesn't always match the website
// code the wallet/reward APIs are scoped by — e.g. company id 4 (PT. MRBUR GLOBAL INDONESIA)
// has company.code "MIN", but its wallet/reward data is filed under website code "MID".
// Correct known mismatches here; anything not listed falls back to the raw session value.
const COMPANY_ID_TO_WEBSITE_CODE: Record<string, string> = {
  "4": "MID", // PT. MRBUR GLOBAL INDONESIA — company.code is "MIN", website code is "MID"
};

function resolveWebsiteCode(companyId: string, rawCode: string): string {
  return COMPANY_ID_TO_WEBSITE_CODE[companyId] || rawCode;
}

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
      const companyId = String(currentCompanyId);
      return {
        companyId,
        companyCode: resolveWebsiteCode(
          companyId,
          String(companyCodes[currentCompanyId]).toUpperCase()
        ),
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

    const [rawCompanyId, companyCode] = entries.sort(
      (a, b) => Number(a[0]) - Number(b[0])
    )[0];
    const companyId = String(rawCompanyId);

    return {
      companyId,
      companyCode: resolveWebsiteCode(companyId, String(companyCode).toUpperCase()),
    };
  } catch (e) {
    console.error("Failed to parse odoo_session:", e);
    return null;
  }
}