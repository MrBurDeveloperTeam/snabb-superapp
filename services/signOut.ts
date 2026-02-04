import api from "./api";

export const signOut = async () => {
  // Remove user identity
  localStorage.removeItem("email");
  localStorage.removeItem("company_id");
  localStorage.removeItem("name");
  localStorage.removeItem("external_user_id");

  // Optional: clear everything
  localStorage.clear();
  sessionStorage.clear();

  // Redirect to login
  window.location.href = "/login";
  // try {
  //   const res = await api.post("/auth/logout");
  //   return { loggedIn: false, user: null };
  // } catch {
  //   return { loggedIn: false, user: null };
  // }
};