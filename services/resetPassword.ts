import api from "./api";

export async function resetPassword(email: string, invoiceId?: number): Promise<true> {
  const response = await api.post("/web/reset_password", {
    jsonrpc: "2.0",
    method: "call",
    id: 1,
    params: { login: email, invoice_id: invoiceId },
  });

  if (response.data?.error || response.data?.result?.ok === false) {
    const msg =
      response.data.error?.data?.message ||
      response.data.error?.message ||
      response.data.result?.error ||
      "Password reset failed";
    throw new Error(msg);
  }

  return true;
}

export async function confirmPassword(token: string, password: string, invoiceId?: number): Promise<{ login?: string }> {
  const { data } = await api.post("/web/reset_password/confirm", {
    jsonrpc: "2.0", method: "call", id: 1,
    params: { token, password, invoice_id: invoiceId },
  });
  if (data?.result?.ok !== true) {
    throw new Error(data?.result?.error || "This link could not be used. Request a fresh email and try again.");
  }
  return data.result;
}
