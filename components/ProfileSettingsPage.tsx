import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient";

const SPECIALTY_OPTIONS = [
  { id: "76", name: "General Dentistry" },
  { id: "77", name: "Endodontics" },
  { id: "78", name: "Orthodontics" },
  { id: "79", name: "Prosthodontics" },
  { id: "80", name: "Periodontics" },
  { id: "81", name: "Implant Dentistry" },
  { id: "82", name: "Oral Surgery" },
  { id: "83", name: "Pediatric Dentistry" },
];

const STATE_OPTIONS = [
  { id: "483", name: "Selangor" },
  { id: "480", name: "Kuala Lumpur" },
  { id: "481", name: "Penang" },
  { id: "482", name: "Johor" },
  { id: "484", name: "Perak" },
  { id: "485", name: "Sabah" },
  { id: "486", name: "Sarawak" },
];

const COUNTRY_OPTIONS = [
  { id: "3", name: "Afghanistan" },
  { id: "6", name: "Albania" },
  { id: "62", name: "Algeria" },
  { id: "11", name: "American Samoa" },
  { id: "1", name: "Andorra" },
  { id: "8", name: "Angola" },
  { id: "5", name: "Anguilla" },
  { id: "9", name: "Antarctica" },
  { id: "4", name: "Antigua and Barbuda" },
  { id: "10", name: "Argentina" },
  { id: "7", name: "Armenia" },
  { id: "14", name: "Aruba" },
  { id: "13", name: "Australia" },
  { id: "12", name: "Austria" },
  { id: "16", name: "Azerbaijan" },
  { id: "32", name: "Bahamas" },
  { id: "23", name: "Bahrain" },
  { id: "19", name: "Bangladesh" },
  { id: "18", name: "Barbados" },
  { id: "36", name: "Belarus" },
  { id: "20", name: "Belgium" },
  { id: "37", name: "Belize" },
  { id: "25", name: "Benin" },
  { id: "27", name: "Bermuda" },
  { id: "33", name: "Bhutan" },
  { id: "29", name: "Bolivia" },
  { id: "30", name: "Bonaire, Sint Eustatius and Saba" },
  { id: "17", name: "Bosnia and Herzegovina" },
  { id: "35", name: "Botswana" },
  { id: "34", name: "Bouvet Island" },
  { id: "31", name: "Brazil" },
  { id: "105", name: "British Indian Ocean Territory" },
  { id: "28", name: "Brunei Darussalam" },
  { id: "22", name: "Bulgaria" },
  { id: "21", name: "Burkina Faso" },
  { id: "24", name: "Burundi" },
  { id: "116", name: "Cambodia" },
  { id: "47", name: "Cameroon" },
  { id: "38", name: "Canada" },
  { id: "52", name: "Cape Verde" },
  { id: "123", name: "Cayman Islands" },
  { id: "40", name: "Central African Republic" },
  { id: "214", name: "Chad" },
  { id: "46", name: "Chile" },
  { id: "48", name: "China" },
  { id: "54", name: "Christmas Island" },
  { id: "39", name: "Cocos (Keeling) Islands" },
  { id: "49", name: "Colombia" },
  { id: "118", name: "Comoros" },
  { id: "42", name: "Congo" },
  { id: "45", name: "Cook Islands" },
  { id: "50", name: "Costa Rica" },
  { id: "97", name: "Croatia" },
  { id: "51", name: "Cuba" },
  { id: "53", name: "Curaçao" },
  { id: "55", name: "Cyprus" },
  { id: "56", name: "Czech Republic" },
  { id: "44", name: "Côte d'Ivoire" },
  { id: "41", name: "Democratic Republic of the Congo" },
  { id: "59", name: "Denmark" },
  { id: "58", name: "Djibouti" },
  { id: "60", name: "Dominica" },
  { id: "61", name: "Dominican Republic" },
  { id: "63", name: "Ecuador" },
  { id: "65", name: "Egypt" },
  { id: "209", name: "El Salvador" },
  { id: "87", name: "Equatorial Guinea" },
  { id: "67", name: "Eritrea" },
  { id: "64", name: "Estonia" },
  { id: "212", name: "Eswatini" },
  { id: "69", name: "Ethiopia" },
  { id: "72", name: "Falkland Islands" },
  { id: "74", name: "Faroe Islands" },
  { id: "71", name: "Fiji" },
  { id: "70", name: "Finland" },
  { id: "75", name: "France" },
  { id: "79", name: "French Guiana" },
  { id: "174", name: "French Polynesia" },
  { id: "215", name: "French Southern Territories" },
  { id: "76", name: "Gabon" },
  { id: "84", name: "Gambia" },
  { id: "78", name: "Georgia" },
  { id: "57", name: "Germany" },
  { id: "80", name: "Ghana" },
  { id: "81", name: "Gibraltar" },
  { id: "88", name: "Greece" },
  { id: "83", name: "Greenland" },
  { id: "77", name: "Grenada" },
  { id: "86", name: "Guadeloupe" },
  { id: "91", name: "Guam" },
  { id: "90", name: "Guatemala" },
  { id: "82", name: "Guernsey" },
  { id: "85", name: "Guinea" },
  { id: "92", name: "Guinea-Bissau" },
  { id: "93", name: "Guyana" },
  { id: "98", name: "Haiti" },
  { id: "95", name: "Heard Island and McDonald Islands" },
  { id: "236", name: "Holy See (Vatican City State)" },
  { id: "96", name: "Honduras" },
  { id: "94", name: "Hong Kong" },
  { id: "99", name: "Hungary" },
  { id: "108", name: "Iceland" },
  { id: "104", name: "India" },
  { id: "100", name: "Indonesia" },
  { id: "107", name: "Iran" },
  { id: "106", name: "Iraq" },
  { id: "101", name: "Ireland" },
  { id: "103", name: "Isle of Man" },
  { id: "102", name: "Israel" },
  { id: "109", name: "Italy" },
  { id: "111", name: "Jamaica" },
  { id: "113", name: "Japan" },
  { id: "110", name: "Jersey" },
  { id: "112", name: "Jordan" },
  { id: "124", name: "Kazakhstan" },
  { id: "114", name: "Kenya" },
  { id: "117", name: "Kiribati" },
  { id: "250", name: "Kosovo" },
  { id: "122", name: "Kuwait" },
  { id: "115", name: "Kyrgyzstan" },
  { id: "125", name: "Laos" },
  { id: "134", name: "Latvia" },
  { id: "126", name: "Lebanon" },
  { id: "131", name: "Lesotho" },
  { id: "130", name: "Liberia" },
  { id: "135", name: "Libya" },
  { id: "128", name: "Liechtenstein" },
  { id: "132", name: "Lithuania" },
  { id: "133", name: "Luxembourg" },
  { id: "147", name: "Macau" },
  { id: "141", name: "Madagascar" },
  { id: "155", name: "Malawi" },
  { id: "157", name: "Malaysia" },
  { id: "154", name: "Maldives" },
  { id: "144", name: "Mali" },
  { id: "152", name: "Malta" },
  { id: "142", name: "Marshall Islands" },
  { id: "149", name: "Martinique" },
  { id: "150", name: "Mauritania" },
  { id: "153", name: "Mauritius" },
  { id: "246", name: "Mayotte" },
  { id: "156", name: "Mexico" },
  { id: "73", name: "Micronesia" },
  { id: "138", name: "Moldova" },
  { id: "137", name: "Monaco" },
  { id: "146", name: "Mongolia" },
  { id: "139", name: "Montenegro" },
  { id: "151", name: "Montserrat" },
  { id: "136", name: "Morocco" },
  { id: "158", name: "Mozambique" },
  { id: "145", name: "Myanmar" },
  { id: "159", name: "Namibia" },
  { id: "168", name: "Nauru" },
  { id: "167", name: "Nepal" },
  { id: "165", name: "Netherlands" },
  { id: "160", name: "New Caledonia" },
  { id: "170", name: "New Zealand" },
  { id: "164", name: "Nicaragua" },
  { id: "161", name: "Niger" },
  { id: "163", name: "Nigeria" },
  { id: "169", name: "Niue" },
  { id: "162", name: "Norfolk Island" },
  { id: "120", name: "North Korea" },
  { id: "143", name: "North Macedonia" },
  { id: "148", name: "Northern Mariana Islands" },
  { id: "166", name: "Norway" },
  { id: "171", name: "Oman" },
  { id: "177", name: "Pakistan" },
  { id: "184", name: "Palau" },
  { id: "172", name: "Panama" },
  { id: "175", name: "Papua New Guinea" },
  { id: "185", name: "Paraguay" },
  { id: "173", name: "Peru" },
  { id: "176", name: "Philippines" },
  { id: "180", name: "Pitcairn Islands" },
  { id: "178", name: "Poland" },
  { id: "183", name: "Portugal" },
  { id: "181", name: "Puerto Rico" },
  { id: "186", name: "Qatar" },
  { id: "188", name: "Romania" },
  { id: "190", name: "Russian Federation" },
  { id: "191", name: "Rwanda" },
  { id: "187", name: "Réunion" },
  { id: "26", name: "Saint Barthélémy" },
  { id: "198", name: "Saint Helena, Ascension and Tristan da Cunha" },
  { id: "119", name: "Saint Kitts and Nevis" },
  { id: "127", name: "Saint Lucia" },
  { id: "140", name: "Saint Martin (French part)" },
  { id: "179", name: "Saint Pierre and Miquelon" },
  { id: "237", name: "Saint Vincent and the Grenadines" },
  { id: "244", name: "Samoa" },
  { id: "203", name: "San Marino" },
  { id: "192", name: "Saudi Arabia" },
  { id: "204", name: "Senegal" },
  { id: "189", name: "Serbia" },
  { id: "194", name: "Seychelles" },
  { id: "202", name: "Sierra Leone" },
  { id: "197", name: "Singapore" },
  { id: "210", name: "Sint Maarten (Dutch part)" },
  { id: "201", name: "Slovakia" },
  { id: "199", name: "Slovenia" },
  { id: "193", name: "Solomon Islands" },
  { id: "205", name: "Somalia" },
  { id: "247", name: "South Africa" },
  { id: "89", name: "South Georgia and the South Sandwich Islands" },
  { id: "121", name: "South Korea" },
  { id: "207", name: "South Sudan" },
  { id: "68", name: "Spain" },
  { id: "129", name: "Sri Lanka" },
  { id: "182", name: "State of Palestine" },
  { id: "195", name: "Sudan" },
  { id: "206", name: "Suriname" },
  { id: "200", name: "Svalbard and Jan Mayen" },
  { id: "196", name: "Sweden" },
  { id: "43", name: "Switzerland" },
  { id: "211", name: "Syria" },
  { id: "208", name: "São Tomé and Príncipe" },
  { id: "227", name: "Taiwan" },
  { id: "218", name: "Tajikistan" },
  { id: "228", name: "Tanzania" },
  { id: "217", name: "Thailand" },
  { id: "223", name: "Timor-Leste" },
  { id: "216", name: "Togo" },
  { id: "219", name: "Tokelau" },
  { id: "222", name: "Tonga" },
  { id: "225", name: "Trinidad and Tobago" },
  { id: "221", name: "Tunisia" },
  { id: "220", name: "Turkmenistan" },
  { id: "213", name: "Turks and Caicos Islands" },
  { id: "226", name: "Tuvalu" },
  { id: "224", name: "Türkiye" },
  { id: "232", name: "USA Minor Outlying Islands" },
  { id: "230", name: "Uganda" },
  { id: "229", name: "Ukraine" },
  { id: "2", name: "United Arab Emirates" },
  { id: "231", name: "United Kingdom" },
  { id: "233", name: "United States" },
  { id: "234", name: "Uruguay" },
  { id: "235", name: "Uzbekistan" },
  { id: "242", name: "Vanuatu" },
  { id: "238", name: "Venezuela" },
  { id: "241", name: "Vietnam" },
  { id: "239", name: "Virgin Islands (British)" },
  { id: "240", name: "Virgin Islands (USA)" },
  { id: "243", name: "Wallis and Futuna" },
  { id: "66", name: "Western Sahara" },
  { id: "245", name: "Yemen" },
  { id: "248", name: "Zambia" },
  { id: "249", name: "Zimbabwe" },
  { id: "15", name: "Åland Islands" },
];

type AccountType = "individual" | "company";

type ProfileForm = {
  name: string;
  email: string;
  companyName: string;
  sstNumber: string;
  phone: string;
  dateOfBirth: string;
  street: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  receiveInvoices: string;
  electronicFormat: string;
  stateId: string;
  countryId: string;
  categoryId: string;
  categoryIds: string[];
};

export default function ProfileSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    companyName: "",
    sstNumber: "",
    phone: "",
    dateOfBirth: "",
    street: "",
    street2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    receiveInvoices: "email",
    electronicFormat: "",
    stateId: "",
    countryId: "",
    categoryId: "76",
    categoryIds: [],
  });

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [originalSstNumber, setOriginalSstNumber] = useState("");
  const [sstChangeUsed, setSstChangeUsed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Referral contact ID
  const [contactId, setContactId] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [contactIdCopied, setContactIdCopied] = useState(false);

  const initials =
    form.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch("https://account.snabbb.com/api/account/profile", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await res.json().catch(() => null);

      console.log("GET profile response:", data);

      if (!res.ok || !data?.ok) {
        console.error("Profile load failed:", data);
        return;
      }

      const p = data.partner || {};
      const loadedPartnerId = data.partner_id || null;

      let detectedAccountType: AccountType =
        p.company_type === "company" ||
        p.is_company === true
          ? "company"
          : "individual";

      let detectedSstChangeUsed =
        p.sst_change_used === true ||
        data.sst_change_used === true;

      try {
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const userId = authData.user?.id;

        if (userId) {
          const {
            data: profileRow,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select("account_type, sst_change_used")
            .eq("user_id", userId)
            .maybeSingle();

          if (profileError) {
            console.error(
              "Failed to load account type:",
              profileError
            );
          } else if (profileRow) {
            if (
              profileRow.account_type === "company" ||
              profileRow.account_type === "individual"
            ) {
              detectedAccountType =
                profileRow.account_type as AccountType;
            }

            detectedSstChangeUsed =
              profileRow.sst_change_used === true;
          }
        }
      } catch (accountTypeError) {
        console.error(
          "Failed to detect account type:",
          accountTypeError
        );
      }

      setAccountType(detectedAccountType);
      setSstChangeUsed(detectedSstChangeUsed);

      console.log(
        "Detected account type:",
        detectedAccountType
      );
      console.log(
        "SST change already used:",
        detectedSstChangeUsed
      );

      const stateId = Array.isArray(p.state_id) ? String(p.state_id[0]) : "";
      const stateName = Array.isArray(p.state_id) ? p.state_id[1] || "" : "";

      const countryId = Array.isArray(p.country_id) ? String(p.country_id[0]) : "";
      const countryName = Array.isArray(p.country_id) ? p.country_id[1] || "" : "";

      const rawCategoryIds = Array.isArray(p.category_id) ? p.category_id : [];
      const categoryIds: string[] = rawCategoryIds
        .map((item: number | [number, string]) =>
          Array.isArray(item) ? String(item[0]) : String(item)
        )
        .filter(Boolean);

      // Map IDs to names for display
      const specialtyNames = categoryIds
        .map((id) => SPECIALTY_OPTIONS.find((s) => s.id === id)?.name)
        .filter((name): name is string => Boolean(name));

      setPartnerId(loadedPartnerId);

      // Contact ID is C{partner_id} — compute it from the data already returned
      if (loadedPartnerId) {
        setContactId("C" + loadedPartnerId);
      }

      setProfileImageUrl(
        data.image_url ||
          (loadedPartnerId
            ? `https://account.snabbb.com/web/image/res.partner/${loadedPartnerId}/image_128?unique=${Date.now()}`
            : null)
      );

      setSelectedSpecialties(specialtyNames);

      const loadedSstNumber =
        detectedAccountType === "company"
          ? String(p.vat || "")
          : "";

      setOriginalSstNumber(loadedSstNumber);

      setForm((prev) => ({
        ...prev,
        name: p.name || "",
        email: p.email || "",
        companyName:
          detectedAccountType === "company"
            ? p.company_name || p.name || ""
            : "",
        sstNumber: loadedSstNumber,
        phone: p.phone || "",
        dateOfBirth: p.x_date_of_birth || "",
        street: p.street || "",
        street2: p.street2 || "",
        city: p.city || "",
        postalCode: p.zip || "",
        state: stateName,
        stateId,
        country: countryName,
        countryId,
        categoryIds,
        categoryId: categoryIds[0] || "76",
        receiveInvoices: p.invoice_sending_method || "email",
        electronicFormat: p.invoice_edi_format || "",
      }));
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleCopyContactId = () => {
    if (!contactId) return;
    navigator.clipboard.writeText(contactId).then(() => {
      setContactIdCopied(true);
      setTimeout(() => setContactIdCopied(false), 2000);
    });
  };

  const handleShareContactId = () => {
    if (!contactId) return;
    const shareData = {
      title: "My Snabbb Referral Code",
      text: `Sign up on Snabbb and enter my referral code ${contactId} to get started!`,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => handleCopyContactId());
    } else {
      handleCopyContactId();
    }
  };

  const updateField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateState = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.selectedOptions[0];
    setForm((prev) => ({
      ...prev,
      stateId: e.target.value,
      state: selected?.text || "",
    }));
  };

  const updateCountry = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.selectedOptions[0];
    setForm((prev) => ({
      ...prev,
      countryId: e.target.value,
      country: selected?.text || "",
    }));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be below 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const addSpecialty = (specialtyId: string) => {
    if (!specialtyId) return;
    const selected = SPECIALTY_OPTIONS.find((item) => item.id === specialtyId);
    if (!selected) return;

    // Append to selected list (don't replace)
    setSelectedSpecialties((prev) =>
      prev.includes(selected.name) ? prev : [...prev, selected.name]
    );

    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(specialtyId)
        ? prev.categoryIds
        : [...prev.categoryIds, specialtyId],
      categoryId: specialtyId,
    }));
  };

  const removeSpecialty = (value: string) => {
    const removed = SPECIALTY_OPTIONS.find((s) => s.name === value);
    setSelectedSpecialties((prev) => prev.filter((item) => item !== value));
    setForm((prev) => {
      const newIds = removed
        ? prev.categoryIds.filter((id) => id !== removed.id)
        : prev.categoryIds;
      return {
        ...prev,
        categoryIds: newIds,
        categoryId: newIds[0] || "76",
      };
    });
  };

  const handleSave = async () => {
    const nextSstNumber = form.sstNumber.trim();

    const sstHasChanged =
      accountType === "company" &&
      nextSstNumber !==
        originalSstNumber.trim();

    if (
      accountType === "company" &&
      sstHasChanged &&
      !nextSstNumber
    ) {
      alert(
        "SST Number cannot be empty."
      );
      return;
    }

    if (sstChangeUsed && sstHasChanged) {
      alert(
        "Your SST Number has already been changed once. Please contact marketing@snabbb.com for assistance."
      );
      return;
    }

    if (sstHasChanged) {
      const confirmed = window.confirm(
        "You can change your SST Number only once. After saving, further changes must be requested through marketing@snabbb.com. Continue?"
      );

      if (!confirmed) return;
    }

    const formData = new FormData();

    formData.append("name", form.name);
    formData.append("email", form.email);
    formData.append("phone", form.phone);

    if (accountType === "company") {
      formData.append(
        "company_name",
        form.companyName.trim()
      );

      if (!sstChangeUsed) {
        formData.append(
          "vat",
          nextSstNumber
        );
      }
    }

    formData.append(
      "x_date_of_birth",
      form.dateOfBirth
    );
    formData.append("street", form.street);
    formData.append("street2", form.street2);
    formData.append("city", form.city);
    formData.append("state_id", form.stateId);
    formData.append("zipcode", form.postalCode);
    formData.append("country_id", form.countryId);
    formData.append("invoice_sending_method", form.receiveInvoices || "email");
    formData.append("invoice_edi_format", form.electronicFormat);
    formData.append("redirect", "");

    // Send all selected specialty IDs
    const idsToSend = form.categoryIds.length > 0 ? form.categoryIds : ["76"];
    idsToSend.forEach((id) => formData.append("category_id", id));

    if (avatarFile) {
      formData.append("profile_picture", avatarFile);
    }

    try {
      setSaving(true);

      const res = await fetch("https://account.snabbb.com/api/account/profile", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      console.log("POST profile response:", data);

      if (!res.ok || !data?.ok) {
        console.error("Save failed:", data);
        alert(data?.error || "Save failed");
        return;
      }

      if (sstHasChanged) {
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authData.user?.id) {
          console.error(
            "Unable to record SST change:",
            authError
          );

          alert(
            "Your SST Number was updated, but the change lock could not be recorded. Please contact support."
          );
          return;
        }

        const {
          data: updatedProfile,
          error: sstLockError,
        } = await supabase
          .from("profiles")
          .update({
            sst_change_used: true,
            sst_changed_at:
              new Date().toISOString(),
          })
          .eq("user_id", authData.user.id)
          .select("sst_change_used")
          .single();

        if (
          sstLockError ||
          updatedProfile?.sst_change_used !== true
        ) {
          console.error(
            "Failed to lock SST Number:",
            sstLockError
          );

          alert(
            "Your SST Number was updated, but the change lock could not be recorded. Please contact marketing@snabbb.com."
          );
          return;
        }

        setSstChangeUsed(true);
        setOriginalSstNumber(
          nextSstNumber
        );
      }

      setSaved(true);
      setAvatarPreview(null);
      setAvatarFile(null);

      if (partnerId) {
        setProfileImageUrl(
          `https://account.snabbb.com/web/image/res.partner/${partnerId}/image_128?unique=${Date.now()}`
        );
      }

      await loadProfile();

      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] text-sm text-gray-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#1f2937]">
      <style>{`
        .inp {
          width: 100%;
          padding: 9px 13px;
          border: 1.5px solid #e2e5ea;
          border-radius: 8px;
          background-color: #ffffff;
          font-size: 14px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          appearance: none;
          -webkit-appearance: none;
        }

        .inp:focus {
          border-color: #647294;
          box-shadow: 0 0 0 3px rgba(100,114,148,0.12);
        }

        .inp:disabled {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
          border-color: #e5e7eb;
        }

        .inp::placeholder {
          color: #b0b7c3;
        }

        select.inp {
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
          cursor: pointer;
        }

        .section-card {
          background: #ffffff;
          border: 1px solid #eaecf0;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f1f3;
        }

        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .field-hint {
          font-size: 11.5px;
          color: #9ca3af;
          margin-top: 4px;
        }
      `}</style>

      <main className="mx-auto max-w-[760px] px-4 pt-8 pb-28">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#111827]">
            Profile Settings
          </h1>
          <p className="mt-0.5 text-sm text-[#6b7280]">
            Manage your personal information and preferences
          </p>
        </div>

        <div className="section-card">
          <div className="section-title">Profile Photo</div>

          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#e2e5ea] bg-[#647294] shadow-sm">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={() => setProfileImageUrl(null)}
                  />
                ) : (
                  <span className="text-lg font-semibold tracking-wide text-white">
                    {initials}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#647294] shadow"
                title="Change photo"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                  <path d="M4 7h3.2l1.2-2h7.2l1.2 2H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-2a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                </svg>
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-[#111827]">
                Upload a new photo
              </p>
              <p className="mb-3 mt-0.5 text-xs text-[#9ca3af]">
                JPG, PNG or GIF · Square image · Max 2 MB
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#d7dce2] bg-white px-3.5 py-1.5 text-sm font-medium text-[#374151] shadow-sm transition hover:bg-[#f9fafb]"
              >
                Upload photo
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="section-card">
          <div className="section-title">Personal Information</div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <div>
              <label className="field-label">Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                className="inp"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="field-label">Email Address</label>
              <input
                name="email"
                value={form.email}
                disabled
                className="inp"
              />
              <p className="field-hint">Email cannot be changed</p>
            </div>

            <div>
              <label className="field-label">Phone Number</label>
              <input
                name="phone"
                value={form.phone}
                onChange={updateField}
                className="inp"
                placeholder="+60 12 345 6789"
              />
            </div>

            <div>
              <label className="field-label">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={updateField}
                className="inp"
              />
            </div>

            <div className="md:col-span-2">
              <label className="field-label">Your Specialty</label>

              <div className="overflow-hidden rounded-lg border-[1.5px] border-[#e2e5ea] bg-white transition focus-within:border-[#647294] focus-within:shadow-[0_0_0_3px_rgba(100,114,148,0.12)]">
                {selectedSpecialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-b border-[#f0f1f3] px-3 pb-1.5 pt-2.5">
                    {selectedSpecialties.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 rounded-full bg-[#eef0f5] px-2.5 py-1 text-xs font-medium text-[#4b5563]"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeSpecialty(item)}
                          className="ml-0.5 text-base leading-none text-[#9ca3af] hover:text-[#374151]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <select
                  className="w-full cursor-pointer bg-white px-3 py-2.5 text-sm text-[#6b7280] outline-none"
                  value=""
                  onChange={(e) => addSpecialty(e.target.value)}
                >
                  <option value="">+ Add specialty...</option>
                  {SPECIALTY_OPTIONS.filter(
                    (s) => !selectedSpecialties.includes(s.name)
                  ).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {accountType === "company" && (
          <div className="section-card">
            <div className="section-title">
              Business Details
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <div>
                <label className="field-label">
                  Company Name
                </label>

                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={updateField}
                  className="inp"
                  placeholder="Your clinic or company"
                />
              </div>

              <div>
                <label className="field-label">
                  SST Number
                </label>

                <input
                  name="sstNumber"
                  value={form.sstNumber}
                  onChange={updateField}
                  disabled={sstChangeUsed}
                  className="inp"
                  placeholder="e.g. W10-1234-56789012"
                />

                <p className="mt-1.5 text-xs italic leading-5 text-[#9ca3af]">
                  Changing SST Number is not allowed once
                  document(s) have been issued for your account.
                  Please contact us directly for this operation.
                </p>

                <a
                  href="mailto:marketing@snabbb.com?subject=SST%20Number%20Change%20Request"
                  className="mt-1 inline-block text-xs font-medium text-[#2563eb] underline-offset-2 hover:underline"
                >
                  marketing@snabbb.com
                </a>

                {sstChangeUsed && (
                  <p className="mt-1.5 text-xs font-medium text-[#b45309]">
                    You have already used your one SST Number
                    change. Further changes must be requested by
                    email.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="section-card">
          <div className="section-title">Address</div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label">Street Address</label>
              <input
                name="street"
                value={form.street}
                onChange={updateField}
                className="inp"
                placeholder="Street line 1"
              />
            </div>

            <div className="md:col-span-2">
              <input
                name="street2"
                value={form.street2}
                onChange={updateField}
                className="inp"
                placeholder="Street line 2 optional"
              />
            </div>

            <div>
              <label className="field-label">City</label>
              <input
                name="city"
                value={form.city}
                onChange={updateField}
                className="inp"
                placeholder="City"
              />
            </div>

            <div>
              <label className="field-label">State / Province</label>
              <select
                name="stateId"
                value={form.stateId}
                onChange={updateState}
                className="inp"
              >
                <option value="">Select state</option>
                {STATE_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Zip / Postal Code</label>
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={updateField}
                className="inp"
                placeholder="e.g. 63000"
              />
            </div>

            <div>
              <label className="field-label">Country</label>
              <select
                name="countryId"
                value={form.countryId}
                onChange={updateCountry}
                className="inp"
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-title">Billing Preferences</div>

          <p className="-mt-2 mb-5 text-xs text-[#9ca3af]">
            Choose how you would like to receive invoices.
          </p>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <div>
              <label className="field-label">Receive Invoices</label>
              <select
                name="receiveInvoices"
                value={form.receiveInvoices}
                onChange={updateField}
                className="inp"
              >
                <option value="email">by Email</option>
                <option value="snailmail">by Post</option>
              </select>
            </div>

            <div>
              <label className="field-label">Electronic Format</label>
              <select
                  name="electronicFormat"
                  value={form.electronicFormat}
                  onChange={updateField}
                  className="inp"
                >
                  <option value="">None</option>
                  <option value="facturx">France (FacturX)</option>
                  <option value="ubl_bis3">EU Standard (Peppol Bis 3.0)</option>
                  <option value="zugferd">Germany (ZUGFeRD)</option>
                  <option value="xrechnung">Germany (XRechnung)</option>
                  <option value="nlcius">Netherlands (NLCIUS)</option>
                  <option value="ubl_a_nz">Australia (BIS Billing 3.0 A-NZ)</option>
                  <option value="ubl_sg">Singapore (BIS Billing 3.0 SG)</option>
                  <option value="pint_jp">Japan (Peppol PINT JP)</option>
                  <option value="pint_my">Malaysia (Peppol PINT MY)</option>
                </select>
            </div>
          </div>
        </div>
        {/* Referral Code */}
        <div className="section-card">
          <div className="section-title">Referral Program</div>

          <p className="-mt-2 mb-5 text-xs text-[#9ca3af]">
            Share your Contact ID with friends. When they sign up using your
            code, you both earn Snabbb credits.
          </p>

          {contactId ? (
            <div>
              <p className="field-label mb-2">Your Contact ID</p>

              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center justify-between rounded-xl border-2 border-[#647294]  px-4 py-3">
                  <span className="font-mono text-xl font-bold tracking-widest text-[#111827]">
                    {contactId}
                  </span>
                  <span className="ml-3 rounded-full bg-[#eef0f5] px-2.5 py-0.5 text-xs font-medium text-[#6b7280]">
                    {referralCount > 0 ? `${referralCount} referral${referralCount !== 1 ? "s" : ""}` : "Share to earn credits"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyContactId}
                  title="Copy Contact ID"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7dce2] bg-white shadow-sm transition hover:bg-[#f9fafb] active:scale-95"
                >
                  {contactIdCopied ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareContactId}
                  title="Share Contact ID"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7dce2] bg-white shadow-sm transition hover:bg-[#f9fafb] active:scale-95"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              </div>

              <p className="mt-3 text-xs text-[#9ca3af]">
                Ask friends to enter <strong className="text-[#647294]">{contactId}</strong> in the referral field when signing up.
              </p>
            </div>
          ) : (
            <div className="flex h-14 items-center justify-center rounded-xl border border-dashed border-[#d7dce2] text-sm text-[#9ca3af]">
              Loading your Contact ID…
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#e5e7eb] bg-white/90 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-[760px] items-center justify-between">
          <p className="text-xs text-[#9ca3af]">
            Changes are saved to your account
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-lg border border-[#e2e5ea] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#647294] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#52617f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
