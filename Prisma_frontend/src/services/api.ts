import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Use o nome PADRÃO que você decidiu (vamos usar 'access_token')
  const token = localStorage.getItem("access_token");

  const publicRoutes = [
    "users/register/",
    "users/confirm/",
    "login/",
    "captcha/refresh/",
    "users/token/refresh/",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    config.url?.includes(route),
  );

  if (token && token !== "undefined" && token !== "null" && !isPublicRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se for 401 e não for tentativa de login/refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("login/") &&
      !originalRequest.url?.includes("users/token/refresh/")
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken || refreshToken === "undefined") {
          throw new Error("No refresh token");
        }

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}users/token/refresh/`,
          { refresh: refreshToken },
        );

        const { access } = response.data;
        localStorage.setItem("access_token", access);
        originalRequest.headers.Authorization = `Bearer ${access}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Só limpa se o refresh falhar de verdade
        console.error("Sessão expirada. Redirecionando...");
        localStorage.clear();
        window.location.replace("/login");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
