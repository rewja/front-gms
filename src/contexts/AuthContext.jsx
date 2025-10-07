import { createContext, useContext, useState, useEffect } from "react";
import { api, setAuthToken, clearAuthToken } from "../lib/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("auth");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.token) {
          setAuthToken(parsed.token);
        }
        if (parsed?.user) {
          setUser(parsed.user);
        }
      } catch (e) {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { user: userData, token } = res.data;
    setUser(userData);
    setAuthToken(token);
    localStorage.setItem("auth", JSON.stringify({ user: userData, token }));
    return userData;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {}
    clearAuthToken();
    setUser(null);
    localStorage.removeItem("auth");
  };

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
