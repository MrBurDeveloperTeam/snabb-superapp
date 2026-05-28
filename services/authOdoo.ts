import { AuthFormInputs } from "@/features/auth/types/AuthFormInputs";
import api from "./api";
import { getSessionInfoWithRetry } from "./GetSessionInfo";

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

const getSignupCompanyId = async (): Promise<number> => {
  try {
    const [{ country_code = "MY" }, sessionInfo] = await Promise.all([
      getLocationInfo(),
      getSessionInfo(),
    ]);

    const companyCodes = sessionInfo.company_codes || {};
    const resolvedCompanyId = resolveCompanyIdFromCountry(country_code, companyCodes);
    if (resolvedCompanyId) return resolvedCompanyId;
    if (sessionInfo.company_id) return Number(sessionInfo.company_id);
    return 2;
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
}: AuthFormInputs) => {
  const companyId = await getSignupCompanyId();

  const isCompany = account_type === "company";
  const effectiveEmail = isCompany ? (companyEmail || login) : login;
  const effectiveName = isCompany ? companyName : fullName;
  const effectivePosition = jobPosition === "OTHER" ? customJobPosition : jobPosition;

  const requestData = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      email: effectiveEmail,
      name: effectiveName,                                    // company name
      ...(isCompany && fullName && { contact_name: fullName }), // ← person's name
      ...(password && { password }),
      ...(phone && { phone }),
      ...(!isCompany && dob && { date_of_birth: dob }),
      ...(effectivePosition && { job_position: effectivePosition }),
      company_id: companyId,
    },
    id: 1,
  };

  console.log("authOdoo:", { isCompany, effectiveName, effectiveEmail });

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
      account_type: account_type,
      company_name: isCompany ? companyName : undefined,
    });

    return response;
  } catch (err: any) {
    console.log("err:", err);
    return Promise.reject(new Error(err.message || "Signup failed"));
  }
};