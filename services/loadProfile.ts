import { useCallback, useState } from "react";

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

export const loadUserProfile = async () => {
    const res = await fetch("https://account.snabbb.com/api/account/profile", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      return await res.json().catch(() => null);
}