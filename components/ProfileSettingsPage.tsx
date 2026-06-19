import React, { useRef, useState } from "react";

const SPECIALTIES = [
  "General Dentistry",
  "Endodontics",
  "Orthodontics",
  "Prosthodontics",
  "Periodontics",
  "Implant Dentistry",
  "Oral Surgery",
  "Pediatric Dentistry",
];

export default function ProfileSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    name: "NIZAM",
    email: "wesalix989@brixozu.com",
    companyName: "",
    sstNumber: "",
    phone: "+6011378010101",
    dateOfBirth: "1995-08-02",
    street: "1, Jalan Teknokrat 1",
    street2: "",
    city: "Cyberjaya",
    state: "Selangor",
    postalCode: "63000",
    country: "Malaysia",
    receiveInvoices: "by Email",
    electronicFormat: "",
  });

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(["General Dentistry"]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be below 2MB"); return; }
    setAvatarPreview(URL.createObjectURL(file));
  };

  const addSpecialty = (value: string) => {
    if (!value || selectedSpecialties.includes(value)) return;
    setSelectedSpecialties((prev) => [...prev, value]);
  };

  const removeSpecialty = (value: string) => {
    setSelectedSpecialties((prev) => prev.filter((item) => item !== value));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDiscard = () => window.location.reload();

  const initials = form.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
        .inp::placeholder { color: #b0b7c3; }
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

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#111827]">Profile Settings</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Manage your personal information and preferences</p>
        </div>

        {/* Avatar Section */}
        <div className="section-card">
          <div className="section-title">Profile Photo</div>
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-[#e2e5ea] bg-[#647294] flex items-center justify-center shadow-sm">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-white text-lg font-semibold tracking-wide">{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#647294] border-2 border-white flex items-center justify-center shadow"
                title="Change photo"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                  <path d="M4 7h3.2l1.2-2h7.2l1.2 2H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-2a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                </svg>
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-[#111827]">Upload a new photo</p>
              <p className="text-xs text-[#9ca3af] mt-0.5 mb-3">JPG, PNG or GIF · Square image · Max 2 MB</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#d7dce2] bg-white px-3.5 py-1.5 text-sm font-medium text-[#374151] shadow-sm hover:bg-[#f9fafb] transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload photo
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif" onChange={handleUpload} className="hidden" />
          </div>
        </div>

        {/* Personal Info */}
        <div className="section-card">
          <div className="section-title">Personal Information</div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">

            <div>
              <label className="field-label">Full Name</label>
              <input name="name" value={form.name} onChange={updateField} className="inp" placeholder="Your full name" />
            </div>

            <div>
              <label className="field-label">Email Address</label>
              <input name="email" value={form.email} disabled className="inp" />
              <p className="field-hint">Email cannot be changed</p>
            </div>

            <div>
              <label className="field-label">Phone Number</label>
              <input name="phone" value={form.phone} onChange={updateField} className="inp" placeholder="+60 12 345 6789" />
            </div>

            <div>
              <label className="field-label">Date of Birth</label>
              <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={updateField} className="inp" />
            </div>

            <div className="md:col-span-2">
              <label className="field-label">Your Specialty</label>
              <div className="rounded-lg border-[1.5px] border-[#e2e5ea] bg-white overflow-hidden focus-within:border-[#647294] focus-within:shadow-[0_0_0_3px_rgba(100,114,148,0.12)] transition">
                {selectedSpecialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1.5 border-b border-[#f0f1f3]">
                    {selectedSpecialties.map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 rounded-full bg-[#eef0f5] px-2.5 py-1 text-xs font-medium text-[#4b5563]">
                        {item}
                        <button type="button" onClick={() => removeSpecialty(item)} className="ml-0.5 text-[#9ca3af] hover:text-[#374151] leading-none text-base">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <select
                  className="w-full bg-white px-3 py-2.5 text-sm text-[#6b7280] outline-none cursor-pointer"
                  defaultValue=""
                  onChange={(e) => { addSpecialty(e.target.value); e.target.value = ""; }}
                >
                  <option value="">+ Add specialty...</option>
                  {SPECIALTIES.filter((s) => !selectedSpecialties.includes(s)).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="section-card">
          <div className="section-title">Business Details</div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <div>
              <label className="field-label">Company Name</label>
              <input name="companyName" value={form.companyName} onChange={updateField} className="inp" placeholder="Your clinic or company" />
            </div>
            <div>
              <label className="field-label">SST Number</label>
              <input name="sstNumber" value={form.sstNumber} onChange={updateField} className="inp" placeholder="e.g. W10-1234-56789012" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="section-card">
          <div className="section-title">Address</div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label">Street Address</label>
              <input name="street" value={form.street} onChange={updateField} className="inp" placeholder="Street line 1" />
            </div>
            <div className="md:col-span-2">
              <input name="street2" value={form.street2} onChange={updateField} className="inp" placeholder="Street line 2 (optional)" />
            </div>
            <div>
              <label className="field-label">City</label>
              <input name="city" value={form.city} onChange={updateField} className="inp" placeholder="City" />
            </div>
            <div>
              <label className="field-label">State / Province</label>
              <select name="state" value={form.state} onChange={updateField} className="inp">
                {["Selangor","Kuala Lumpur","Penang","Johor","Perak","Sabah","Sarawak"].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Zip / Postal Code</label>
              <input name="postalCode" value={form.postalCode} onChange={updateField} className="inp" placeholder="e.g. 63000" />
            </div>
            <div>
              <label className="field-label">Country</label>
              <select name="country" value={form.country} onChange={updateField} className="inp">
                {["Malaysia","Singapore","Thailand","Indonesia","Vietnam"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Billing Preferences */}
        <div className="section-card">
          <div className="section-title">Billing Preferences</div>
          <p className="text-xs text-[#9ca3af] mb-5 -mt-2">Choose how you'd like to receive invoices.</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <div>
              <label className="field-label">Receive Invoices</label>
              <select name="receiveInvoices" value={form.receiveInvoices} onChange={updateField} className="inp">
                <option>by Email</option>
                <option>by Post</option>
                <option>by Email and Post</option>
              </select>
            </div>
            <div>
              <label className="field-label">Electronic Format</label>
              <select name="electronicFormat" value={form.electronicFormat} onChange={updateField} className="inp">
                <option value="">Select format</option>
                <option>PDF</option>
                <option>XML</option>
                <option>UBL</option>
              </select>
            </div>
          </div>
        </div>

      </main>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#e5e7eb] bg-white/90 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-[760px] items-center justify-between">
          <p className="text-xs text-[#9ca3af]">Changes are saved to your account</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-lg border border-[#e2e5ea] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] transition"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg px-5 py-2 text-sm font-medium text-white transition"
              style={{ background: saved ? "#16a34a" : "#647294" }}
            >
              {saved ? "✓ Saved" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
