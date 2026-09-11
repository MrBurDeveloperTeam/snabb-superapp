import api from "./api";

export async function resetPassword(email: string): Promise<true> {
  const response = await api.post("/web/reset_password", {
    jsonrpc: "2.0",
    method: "call",
    id: 1,
    params: { login: email },
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