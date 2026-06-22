import api from "./api";

/**
 * Triggers Odoo 18's built-in password-reset email flow.
 *
 * Odoo endpoint: POST /web/reset_password (JSON-RPC)
 * Odoo will look up the email, create a token, and send the reset email
 * itself — no custom module needed.
 *
 * Returns true on success. Throws on network/JSON-RPC error.
 * Note: Odoo returns success=true even for unknown emails (prevents enumeration).
 */
async function getOdooCsrf(): Promise<string> {
  // Fetch the reset password page to extract Odoo's csrf_token
  const res = await api.get("/web/reset_password");
  const match = res.data.match(/csrf_token['":\s]+"([a-f0-9]+o\d+)"/);
  return match ? match[1] : "";
}

export async function resetPassword(email: string): Promise<true> {
  const csrf_token = await getOdooCsrf();
  const response = await api.post("/web/reset_password", {
    jsonrpc: "2.0",
    method: "call",
    id: 1,
    params: { login: email, csrf_token },
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
