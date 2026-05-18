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

    if (!res.ok) {
      return  Promise.reject(new Error(`Failed to get location: ${res.status}`));
    }

    return await res.json();
  } catch (error) {
    console.error("location error:", error);
    return { country_code: "MY" };
  }
};

const getSessionInfo = async (): Promise<SessionInfoResponse> => {
  const res = await getSessionInfoWithRetry();

  if (!res) {
    return Promise.reject(new Error(`session_info failed: ${res.status}`));
  }

  return await res.json();
};

const normalizeCountryCandidates = (countryCode: string): string[] => {
  const cc = (countryCode || "").toUpperCase();

  // Primary country code first, then known aliases if needed
  const candidates = [cc];

  // Indonesia is often ID, but your company code appears to use IN
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
      const normalizedCode = String(code).toUpperCase();
      return normalizedCode.endsWith(candidate);
    });

    if (matchedEntry) {
      return Number(matchedEntry[0]);
    }
  }

  return null;
};

const getSignupCompanyId = async (): Promise<number> => {
  try {
    console.log("Session company codes");
    const [{ country_code = "MY" }, sessionInfo] = await Promise.all([
      getLocationInfo(),
      getSessionInfo(),
    ]);
    console.log("Session country_code: ",country_code);

    const companyCodes = sessionInfo.company_codes || {};

    const resolvedCompanyId = resolveCompanyIdFromCountry(
      country_code,
      companyCodes
    );

    if (resolvedCompanyId) {
      return resolvedCompanyId;
    }

    // fallback to current session company_id if available
    if (sessionInfo.company_id) {
      return Number(sessionInfo.company_id);
    }

    // final fallback
    return 2;
  } catch (error) {
    console.error("company_id resolve error:", error);
    return 2;
  }
};

export const authOdoo = async ({
  login,
  password,
  fullName,
  jobPosition,
  customJobPosition,
  phone,
  dob,
  redirect,
  name,
}: AuthFormInputs) => {
  const companyId = await getSignupCompanyId();

  const requestData = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      email: login,
      ...(fullName && { name: fullName }),
      ...(password && { password: password }),
      ...(name && { name: name || "login" }),
      ...(dob && { date_of_birth: dob }),
      company_id: companyId 
    },
    id: 1,
  };
  console.log('sign up here')
  try {
    const response = await api.post("/v1/users", requestData);

    if (response.data.error) {
      return Promise.reject(new Error(response.data.error.message));
    }

    await api.post("/auth/create-user", {
      email: login,
      password: password,
      name: name,
      phone: phone,
      dob: dob,
      position: jobPosition,
    });

    return response;
  } catch (err: any) {
    console.log("err:", err);
    return Promise.reject(new Error(err.message || "Odoo login failed"));
  }
};