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

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    "General Dentistry",
  ]);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const updateField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be below 2MB");
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
  };

  const addSpecialty = (value: string) => {
    if (!value) return;
    if (selectedSpecialties.includes(value)) return;

    setSelectedSpecialties((prev) => [...prev, value]);
  };

  const removeSpecialty = (value: string) => {
    setSelectedSpecialties((prev) => prev.filter((item) => item !== value));
  };

  const handleSave = () => {
    const payload = {
      ...form,
      specialties: selectedSpecialties,
    };

    console.log("Save profile:", payload);
    alert("Profile saved");
  };

  const handleDiscard = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1f2937]">
      <main className="mx-auto max-w-[980px] px-6 pt-8 pb-28">
        {/* Photo Upload */}
        <section className="mb-8 flex items-start gap-6">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#d6dbe3] bg-white shadow-sm">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#f1f3f5] text-[#c6c9ce]">
                <svg
                  width="58"
                  height="58"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M4 7h3.2l1.2-2h7.2l1.2 2H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-2a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                </svg>
              </div>
            )}
          </div>

          <div className="pt-1">
            <h2 className="text-base font-semibold text-[#111827]">
              Update your photo
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-5 text-[#6b7280]">
              Your photo will appear on your profile and in communications.
              Recommended: square image, at least 200×200px.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-[#d7dce2] bg-white px-4 py-2 text-sm font-medium text-[#374151] shadow-sm transition hover:bg-[#f3f4f6]"
              >
                <span>⇧</span>
                Upload photo
              </button>

              <span className="text-xs text-[#9ca3af]">
                JPG, PNG or GIF · max 2 MB
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                onChange={handleUpload}
                className="hidden"
              />
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <Field label="Name">
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              className="form-input"
            />
          </Field>

          <Field label="Your Specialty">
            <div className="rounded-md border border-[#d7dce2] bg-white">
              <div className="flex min-h-[38px] flex-wrap items-center gap-2 border-b border-[#e5e7eb] px-3 py-1.5">
                {selectedSpecialties.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-[#e5e7eb] px-2.5 py-1 text-xs font-medium text-[#374151]"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(item)}
                      className="text-[#6b7280] hover:text-[#111827]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <select
                className="w-full bg-white px-3 py-2 text-sm text-[#6b7280] outline-none"
                defaultValue=""
                onChange={(e) => {
                  addSpecialty(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">+ Add Specialty...</option>
                {SPECIALTIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field label="Email">
              <input
                name="email"
                value={form.email}
                disabled
                className="form-input cursor-not-allowed bg-[#f3f4f6] text-[#9ca3af]"
              />
            </Field>
          </div>

          <Field label="Company Name">
            <input
              name="companyName"
              value={form.companyName}
              onChange={updateField}
              className="form-input"
            />
          </Field>

          <Field label="SST Number">
            <input
              name="sstNumber"
              value={form.sstNumber}
              onChange={updateField}
              className="form-input"
            />
          </Field>

          <Field label="Phone">
            <input
              name="phone"
              value={form.phone}
              onChange={updateField}
              className="form-input"
            />
          </Field>

          <Field label="Date of Birth">
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={updateField}
              className="form-input"
            />
          </Field>

          <Field label="Street">
            <input
              name="street"
              value={form.street}
              onChange={updateField}
              className="form-input"
            />
          </Field>

          <Field label="Street 2">
            <input
              name="street2"
              value={form.street2}
              onChange={updateField}
              className="form-input"
            />
          </Field>

          <Field label="City">
            <input
              name="city"
              value={form.city}
              onChange={updateField}
              className="form-input"
            />
          </Field>

          <Field label="State / Province">
            <select
              name="state"
              value={form.state}
              onChange={updateField}
              className="form-input"
            >
              <option>Selangor</option>
              <option>Kuala Lumpur</option>
              <option>Penang</option>
              <option>Johor</option>
              <option>Perak</option>
              <option>Sabah</option>
              <option>Sarawak</option>
            </select>
          </Field>

          <Field label="Zip / Postal Code">
            <input
              name="postalCode"
              value={form.postalCode}
              onChange={updateField}
              className="form-input"
            />
          </Field>

          <Field label="Country">
            <select
              name="country"
              value={form.country}
              onChange={updateField}
              className="form-input"
            >
              <option>Malaysia</option>
              <option>Singapore</option>
              <option>Thailand</option>
              <option>Indonesia</option>
              <option>Vietnam</option>
            </select>
          </Field>

          <div className="md:col-span-2">
            <p className="mb-3 text-xs italic text-[#8b95a1]">
              You can choose how you want us to send your invoices, and with
              which electronic format.
            </p>
          </div>

          <Field label="Receive invoices">
            <select
              name="receiveInvoices"
              value={form.receiveInvoices}
              onChange={updateField}
              className="form-input"
            >
              <option>by Email</option>
              <option>by Post</option>
              <option>by Email and Post</option>
            </select>
          </Field>

          <div className="hidden md:block" />

          <Field label="Electronic format">
            <select
              name="electronicFormat"
              value={form.electronicFormat}
              onChange={updateField}
              className="form-input"
            >
              <option value="">Select format</option>
              <option>PDF</option>
              <option>XML</option>
              <option>UBL</option>
            </select>
          </Field>
        </section>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#e5e7eb] bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[980px] justify-end gap-2">
          <button
            type="button"
            onClick={handleDiscard}
            className="rounded-md bg-[#e5e7eb] px-5 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#d1d5db]"
          >
            Discard
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-[#62708f] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#4f5d7a]"
          >
            Save
          </button>
        </div>
      </div>

      {/* Chat Floating Button */}
      <button
        type="button"
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#647294] text-white shadow-xl transition hover:scale-105"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 3C6.48 3 2 6.8 2 11.5c0 2.6 1.38 4.92 3.55 6.48L5 21l3.4-1.7c1.1.36 2.3.55 3.6.55 5.52 0 10-3.8 10-8.5S17.52 3 12 3Zm-4 9.5a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" />
        </svg>
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#111827]">
        {label}
      </span>
      {children}
    </label>
  );
}