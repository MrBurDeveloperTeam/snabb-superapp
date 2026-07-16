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

// Odoo country IDs for portal profile (must match res.country IDs exactly —
// keep in sync with the country <select> in SignUpForm.tsx)
const COUNTRY_ID_MAP: Record<string, number> = {
  "Afghanistan": 3,
  "Albania": 6,
  "Algeria": 62,
  "American Samoa": 11,
  "Andorra": 1,
  "Angola": 8,
  "Anguilla": 5,
  "Antarctica": 9,
  "Antigua and Barbuda": 4,
  "Argentina": 10,
  "Armenia": 7,
  "Aruba": 14,
  "Australia": 13,
  "Austria": 12,
  "Azerbaijan": 16,
  "Bahamas": 32,
  "Bahrain": 23,
  "Bangladesh": 19,
  "Barbados": 18,
  "Belarus": 36,
  "Belgium": 20,
  "Belize": 37,
  "Benin": 25,
  "Bermuda": 27,
  "Bhutan": 33,
  "Bolivia": 29,
  "Bonaire, Sint Eustatius and Saba": 30,
  "Bosnia and Herzegovina": 17,
  "Botswana": 35,
  "Bouvet Island": 34,
  "Brazil": 31,
  "British Indian Ocean Territory": 105,
  "Brunei Darussalam": 28,
  "Bulgaria": 22,
  "Burkina Faso": 21,
  "Burundi": 24,
  "Cambodia": 116,
  "Cameroon": 47,
  "Canada": 38,
  "Cape Verde": 52,
  "Cayman Islands": 123,
  "Central African Republic": 40,
  "Chad": 214,
  "Chile": 46,
  "China": 48,
  "Christmas Island": 54,
  "Cocos (Keeling) Islands": 39,
  "Colombia": 49,
  "Comoros": 118,
  "Congo": 42,
  "Cook Islands": 45,
  "Costa Rica": 50,
  "Croatia": 97,
  "Cuba": 51,
  "Curaçao": 53,
  "Cyprus": 55,
  "Czech Republic": 56,
  "Côte d'Ivoire": 44,
  "Democratic Republic of the Congo": 41,
  "Denmark": 59,
  "Djibouti": 58,
  "Dominica": 60,
  "Dominican Republic": 61,
  "Ecuador": 63,
  "Egypt": 65,
  "El Salvador": 209,
  "Equatorial Guinea": 87,
  "Eritrea": 67,
  "Estonia": 64,
  "Eswatini": 212,
  "Ethiopia": 69,
  "Falkland Islands": 72,
  "Faroe Islands": 74,
  "Fiji": 71,
  "Finland": 70,
  "France": 75,
  "French Guiana": 79,
  "French Polynesia": 174,
  "French Southern Territories": 215,
  "Gabon": 76,
  "Gambia": 84,
  "Georgia": 78,
  "Germany": 57,
  "Ghana": 80,
  "Gibraltar": 81,
  "Greece": 88,
  "Greenland": 83,
  "Grenada": 77,
  "Guadeloupe": 86,
  "Guam": 91,
  "Guatemala": 90,
  "Guernsey": 82,
  "Guinea": 85,
  "Guinea-Bissau": 92,
  "Guyana": 93,
  "Haiti": 98,
  "Heard Island and McDonald Islands": 95,
  "Holy See (Vatican City State)": 236,
  "Honduras": 96,
  "Hong Kong": 94,
  "Hungary": 99,
  "Iceland": 108,
  "India": 104,
  "Indonesia": 100,
  "Iran": 107,
  "Iraq": 106,
  "Ireland": 101,
  "Isle of Man": 103,
  "Israel": 102,
  "Italy": 109,
  "Jamaica": 111,
  "Japan": 113,
  "Jersey": 110,
  "Jordan": 112,
  "Kazakhstan": 124,
  "Kenya": 114,
  "Kiribati": 117,
  "Kosovo": 250,
  "Kuwait": 122,
  "Kyrgyzstan": 115,
  "Laos": 125,
  "Latvia": 134,
  "Lebanon": 126,
  "Lesotho": 131,
  "Liberia": 130,
  "Libya": 135,
  "Liechtenstein": 128,
  "Lithuania": 132,
  "Luxembourg": 133,
  "Macau": 147,
  "Madagascar": 141,
  "Malawi": 155,
  "Malaysia": 157,
  "Maldives": 154,
  "Mali": 144,
  "Malta": 152,
  "Marshall Islands": 142,
  "Martinique": 149,
  "Mauritania": 150,
  "Mauritius": 153,
  "Mayotte": 246,
  "Mexico": 156,
  "Micronesia": 73,
  "Moldova": 138,
  "Monaco": 137,
  "Mongolia": 146,
  "Montenegro": 139,
  "Montserrat": 151,
  "Morocco": 136,
  "Mozambique": 158,
  "Myanmar": 145,
  "Namibia": 159,
  "Nauru": 168,
  "Nepal": 167,
  "Netherlands": 165,
  "New Caledonia": 160,
  "New Zealand": 170,
  "Nicaragua": 164,
  "Niger": 161,
  "Nigeria": 163,
  "Niue": 169,
  "Norfolk Island": 162,
  "North Korea": 120,
  "North Macedonia": 143,
  "Northern Mariana Islands": 148,
  "Norway": 166,
  "Oman": 171,
  "Pakistan": 177,
  "Palau": 184,
  "Panama": 172,
  "Papua New Guinea": 175,
  "Paraguay": 185,
  "Peru": 173,
  "Philippines": 176,
  "Pitcairn Islands": 180,
  "Poland": 178,
  "Portugal": 183,
  "Puerto Rico": 181,
  "Qatar": 186,
  "Romania": 188,
  "Russian Federation": 190,
  "Rwanda": 191,
  "Réunion": 187,
  "Saint Barthélémy": 26,
  "Saint Helena, Ascension and Tristan da Cunha": 198,
  "Saint Kitts and Nevis": 119,
  "Saint Lucia": 127,
  "Saint Martin (French part)": 140,
  "Saint Pierre and Miquelon": 179,
  "Saint Vincent and the Grenadines": 237,
  "Samoa": 244,
  "San Marino": 203,
  "Saudi Arabia": 192,
  "Senegal": 204,
  "Serbia": 189,
  "Seychelles": 194,
  "Sierra Leone": 202,
  "Singapore": 197,
  "Sint Maarten (Dutch part)": 210,
  "Slovakia": 201,
  "Slovenia": 199,
  "Solomon Islands": 193,
  "Somalia": 205,
  "South Africa": 247,
  "South Georgia and the South Sandwich Islands": 89,
  "South Korea": 121,
  "South Sudan": 207,
  "Spain": 68,
  "Sri Lanka": 129,
  "State of Palestine": 182,
  "Sudan": 195,
  "Suriname": 206,
  "Svalbard and Jan Mayen": 200,
  "Sweden": 196,
  "Switzerland": 43,
  "Syria": 211,
  "São Tomé and Príncipe": 208,
  "Taiwan": 227,
  "Tajikistan": 218,
  "Tanzania": 228,
  "Thailand": 217,
  "Timor-Leste": 223,
  "Togo": 216,
  "Tokelau": 219,
  "Tonga": 222,
  "Trinidad and Tobago": 225,
  "Tunisia": 221,
  "Turkmenistan": 220,
  "Turks and Caicos Islands": 213,
  "Tuvalu": 226,
  "Türkiye": 224,
  "USA Minor Outlying Islands": 232,
  "Uganda": 230,
  "Ukraine": 229,
  "United Arab Emirates": 2,
  "United Kingdom": 231,
  "United States": 233,
  "Uruguay": 234,
  "Uzbekistan": 235,
  "Vanuatu": 242,
  "Venezuela": 238,
  "Vietnam": 241,
  "Virgin Islands (British)": 239,
  "Virgin Islands (USA)": 240,
  "Wallis and Futuna": 243,
  "Western Sahara": 66,
  "Yemen": 245,
  "Zambia": 248,
  "Zimbabwe": 249,
  "Åland Islands": 15,
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

const COMPANY_CODE_TO_MRBUR_URL: Record<string, string> = {
  MY: 'https://my.mrbur.shop',
  SG: 'https://sg.mrbur.shop',
  TH: 'https://th.mrbur.shop',
  IN: 'https://id.mrbur.shop',
  VN: 'https://vn.mrbur.shop',
  JP: 'https://jp.mrbur.shop',
  KR: 'https://kr.mrbur.shop',
}

export function getMrBurUrlFromCompanyCode(companyCode?: string | null): string {
  console.log('getMrBurUrlFromCompanyCode called with companyCode:', companyCode);
  if (!companyCode) return 'https://app.snabbb.com/shop';
  // company_code is like "MMY", "MSG", "MTH" — last 2 chars are country code
  const countryCode = companyCode.slice(-2).toUpperCase()
  return COMPANY_CODE_TO_MRBUR_URL[countryCode] ?? 'https://app.snabbb.com/shop'
}

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
    const innerJsonMatch = serverError.error.match(/:\s*(\{.*\})$/);
    let errorMessage: any;
    if (innerJsonMatch) {
      console.log('the inner: ', innerJsonMatch);
      try {
        const inner = JSON.parse(innerJsonMatch[1]);
        errorMessage = inner?.msg ?? inner?.message ?? serverError.error;
      } catch {
        errorMessage = serverError.error; // fallback to full string
      }
    } else {
      errorMessage = serverError.error;
    }

    toast.error(errorMessage, {
      icon: "🔴",
    });
    return Promise.reject(new Error(errorMessage));
  }
};