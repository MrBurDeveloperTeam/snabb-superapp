import React, { useCallback, useEffect, useRef, useState } from "react";

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
  { id: "157", name: "Malaysia" },
  { id: "188", name: "Singapore" },
  { id: "219", name: "Thailand" },
  { id: "100", name: "Indonesia" },
  { id: "241", name: "Vietnam" },
];

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

      setProfileImageUrl(
        data.image_url ||
          (loadedPartnerId
            ? `https://account.snabbb.com/web/image/res.partner/${loadedPartnerId}/image_128?unique=${Date.now()}`
            : null)
      );

      setSelectedSpecialties(specialtyNames);

      setForm((prev) => ({
        ...prev,
        name: p.name || "",
        email: p.email || "",
        companyName: p.company_name || "",
        sstNumber: p.vat || "",
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
    const formData = new FormData();

    formData.append("name", form.name);
    formData.append("email", form.email);
    formData.append("phone", form.phone);
    formData.append("company_name", form.companyName);
    formData.append("vat", form.sstNumber);
    formData.append("x_date_of_birth", form.dateOfBirth);
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
          background: #ffffff;
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
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
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

        <div className="section-card">
          <div className="section-title">Business Details</div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <div>
              <label className="field-label">Company Name</label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={updateField}
                className="inp"
                placeholder="Your clinic or company"
              />
            </div>

            <div>
              <label className="field-label">SST Number</label>
              <input
                name="sstNumber"
                value={form.sstNumber}
                onChange={updateField}
                className="inp"
                placeholder="e.g. W10-1234-56789012"
              />
            </div>
          </div>
        </div>

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
                <option>by Email</option>
                <option>by Post</option>
                <option>by Email and Post</option>
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
