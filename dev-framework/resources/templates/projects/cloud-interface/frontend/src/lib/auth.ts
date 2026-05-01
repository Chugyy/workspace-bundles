const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Login failed");
  }

  const data = await res.json();
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user_id", data.user_id.toString());
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_id");
}

export function isAuthenticated() {
  return !!localStorage.getItem("access_token");
}
