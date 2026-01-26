import axios from "axios";

export const odooPublic = axios.create({
  baseURL: "http://localhost:8069",
  withCredentials: false,
});