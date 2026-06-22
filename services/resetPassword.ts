import api from "./api";

async function getOdooCsrf(): Promise<string> {
  const res = await api.get("/web/reset_password");
  return res.data?.csrf_token || "";
}

export async function resetPassword(email: string): Promise<true> {
  const csrf_token = await getOdooCsrf();

  const response = await api.post("/web/reset_password", {
    jsonrpc: "2.0",
    method: "call",
    id: 1,
    params: {
      login: email,
      csrf_token,
    },
  });

  if (response.data?.error) {
    const msg =
      response.data.error?.data?.message ||
      response.data.error?.message ||
      "Password reset failed";
    throw new Error(msg);
  }

  return true;
}