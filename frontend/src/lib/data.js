import api from "./api";

export async function fetchProtectedData() {
  const { data } = await api.get("/protected");
  return data;
}
