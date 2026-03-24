import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = "itsnew_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.authenticated && data.username) {
          setIsAuthenticated(true);
          setUsername(data.username);
        }
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (user: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    // Fixed credentials: user=free, pass=1
    if (user === "free" && pass === "1") {
      setIsAuthenticated(true);
      setUsername(user);
      localStorage.setItem(AUTH_KEY, JSON.stringify({ authenticated: true, username: user }));
      return { success: true };
    }
    return { success: false, error: "Credenciais inválidas" };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername(null);
    localStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useLocalAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useLocalAuth must be used within AuthProvider");
  return ctx;
}
