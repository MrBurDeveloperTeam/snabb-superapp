import { AuthFormInputs } from "@/features/auth/types/AuthFormInputs";
import api from "./api";
import { getSessionInfoWithRetry } from "./GetSessionInfo";
import { toast } from "sonner";

type SessionInfoResponse = {
  ok: boolean;
  uid?: number;
  company_id?: string;
  company_name?: string;
  company_code?: string;
  company_ids?: number[];
  company_codes?: Record<string, string>;
};

type LocationResponse = {
  ip?: string;
  country_code?: string;
};

// Odoo country IDs for portal profile
const COUNTRY_ID_MAP: Record<string, number> = {
  "Malaysia": 157,
  "Singapore": 197,
  "Thailand": 216,
  "Indonesia": 101,
  "Vietnam": 241,
  "Philippines": 175,
  "United Kingdom": 235,
  "United States": 233,
  "Japan": 109,
  "South Korea": 116,
};

// User's selected country → Odoo company ID
const COUNTRY_TO_COMPANY_ID: Record<string, number> = {
  "Malaysia": 2,    // MR. BUR (M) SDN. BHD.
  "Singapore": 3,   // MR. BUR (SG) PTE. LTD.
  "Indonesia": 4,   // PT. MRBUR GLOBAL INDONESIA
  "Thailand": 7,    // MR. BUR (TH) LTD.
  "South Korea": 8, // MR. BUR KOREA LLC
  "Japan": 39,      // KANEIKO INTERNATIONAL CO., LTD
};

// IP country code → Odoo company ID (fallback)
const COUNTRY_CODE_TO_COMPANY_ID: Record<string, number> = {
  MY: 2,   // MR. BUR (M) SDN. BHD.
  SG: 3,   // MR. BUR (SG) PTE. LTD.
  ID: 4,   // PT. MRBUR GLOBAL INDONESIA
  TH: 7,   // MR. BUR (TH) LTD.
  KR: 8,   // MR. BUR KOREA LLC
  JP: 39,  // KANEIKO INTERNATIONAL CO., LTD
};

const getLocationInfo = async (): Promise<LocationResponse> => {
  try {
    const res = await fetch("/api/location", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return Promise.reject(new Error(`Failed to get location: ${res.status}`));
    return await res.json();
  } catch (error) {
    console.error("location error:", error);
    return { country_code: "MY" };
  }
};

const getSessionInfo = async (): Promise<SessionInfoResponse> => {
  const res = await getSessionInfoWithRetry();
  if (!res) return Promise.reject(new Error("session_info failed"));
  if (typeof res.json === "function") return await res.json();
  return res as SessionInfoResponse;
};

const normalizeCountryCandidates = (countryCode: string): string[] => {
  const cc = (countryCode || "").toUpperCase();
  const candidates = [cc];
  if (cc === "ID") candidates.push("IN");
  return candidates;
};

const resolveCompanyIdFromCountry = (
  countryCode: string,
  companyCodes: Record<string, string>
): number | null => {
  const candidates = normalizeCountryCandidates(countryCode);
  for (const candidate of candidates) {
    const matchedEntry = Object.entries(companyCodes).find(([, code]) => {
      return String(code).toUpperCase().endsWith(candidate);
    });
    if (matchedEntry) return Number(matchedEntry[0]);
  }
  return null;
};

const getSignupCompanyId = async (selectedCountry?: string): Promise<number> => {
  // 1. Use the user's selected country first (most accurate)
  if (selectedCountry && COUNTRY_TO_COMPANY_ID[selectedCountry]) {
    return COUNTRY_TO_COMPANY_ID[selectedCountry];
  }

  try {
    const [{ country_code = "MY" }, sessionInfo] = await Promise.all([
      getLocationInfo(),
      getSessionInfo(),
    ]);

    const cc = (country_code || "MY").toUpperCase();

    // 2. Try dynamic session company_codes
    const companyCodes = sessionInfo.company_codes || {};
    const resolvedCompanyId = resolveCompanyIdFromCountry(cc, companyCodes);
    if (resolvedCompanyId) return resolvedCompanyId;

    // 3. Static fallback by IP country code
    const staticId = COUNTRY_CODE_TO_COMPANY_ID[cc];
    if (staticId) return staticId;

    // 4. Session fallback
    if (sessionInfo.company_id) return Number(sessionInfo.company_id);

    return 2; // final fallback → MR. BUR (M)
  } catch (error) {
    console.error("company_id resolve error:", error);
    return 2;
  }
};

export const authOdoo = async ({
  login,
  companyEmail,
  companyName,
  password,
  fullName,
  jobPosition,
  customJobPosition,
  phone,
  dob,
  account_type,
  country,
}: AuthFormInputs) => {
  // Pass selected country for accurate company resolution
  const companyId = await getSignupCompanyId(country);

  const isCompany = account_type === "company";
  const effectiveEmail = isCompany ? (companyEmail || login) : login;
  const effectiveName = isCompany ? companyName : fullName;
  const effectivePosition = jobPosition === "OTHER" ? customJobPosition : jobPosition;
  const countryId = country ? COUNTRY_ID_MAP[country] : undefined;

  const requestData = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      email: effectiveEmail,
      name: effectiveName,
      ...(isCompany && { company_type: "company" }),
      ...(isCompany && fullName && { contact_name: fullName }),
      ...(!isCompany && { company_type: "person" }),
      ...(password && { password }),
      ...(phone && { phone }),
      ...(dob && { date_of_birth: dob }),
      ...(countryId && { country_id: countryId }),
      ...(effectivePosition && { job_position: effectivePosition }),
      company_id: companyId,
    },
    id: 1,
  };

  console.log("authOdoo:", { isCompany, effectiveName, effectiveEmail, country, countryId, companyId });

  try {
    const response = await api.post("/v1/users", requestData);

    if (response.data.error) {
      return Promise.reject(new Error(response.data.error.message));
    }

    await api.post("/auth/create-user", {
      email: effectiveEmail,
      password,
      name: fullName,
      phone,
      dob,
      position: effectivePosition,
      account_type,
      company_name: isCompany ? companyName : undefined,
    });

    return response;
  } catch (err: any) {
    const serverError = err?.response?.data;
    console.log('the inner: ', serverError);
    const innerJsonMatch = serverError.error.match(/:\s*(\{.*\})$/);
    let errorMessage: any;
    if (innerJsonMatch) {
      try {
        const inner = JSON.parse(innerJsonMatch[1]);
        errorMessage = inner?.msg ?? inner?.message ?? serverError.error;
      } catch {
        errorMessage = serverError.error; // fallback to full string
      }
    } else {
      errorMessage = serverError.error;
    }

    toast.error(errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
};