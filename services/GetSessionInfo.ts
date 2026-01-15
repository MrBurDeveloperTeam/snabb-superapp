export const getSessionInfo = async (email: string, password: string, id: number) => {
  const response = await fetch('/web/session/get_session_info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
          "db": "odoodb",
          "login": email,
          "password": password
        },
        "id": id
    })
  });

  const data = await response.json();
  return data.result;
};