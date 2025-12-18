import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  authService,
  LoginRequest,
  LoginResponse,
} from "../services/authService";
import { jwtDecode } from "jwt-decode";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isTokenValid = (token: string): boolean => {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch {
      return false;
    }
  };

  const loadUserFromToken = () => {
    const token = localStorage.getItem("accessToken");
    if (token && isTokenValid(token)) {
      try {
        const decoded: any = jwtDecode(token);
        // Duende IdentityServer JWT structure
        setUser({
          id: decoded.sub, // Subject claim
          email: decoded.email,
          firstName: decoded.given_name || decoded.firstName || "",
          lastName: decoded.family_name || decoded.lastName || "",
          role: decoded.role || "User",
          tenantId: decoded.tenant_id || decoded.tenantId,
        });
      } catch (error) {
        console.error("Failed to decode token:", error);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUserFromToken();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response: LoginResponse = await authService.login(credentials);

      // Store tokens from Duende IdentityServer response
      localStorage.setItem("accessToken", response.access_token);
      localStorage.setItem("refreshToken", response.refresh_token);

      // Decode JWT to get user info
      const decoded: any = jwtDecode(response.access_token);
      setUser({
        id: decoded.sub,
        email: decoded.email,
        firstName: decoded.given_name || "",
        lastName: decoded.family_name || "",
        role: decoded.role || "User",
        tenantId: decoded.tenant_id,
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
    }
  };

  const refreshAuth = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        const response = await authService.refreshToken(refreshToken);

        // Store new tokens
        localStorage.setItem("accessToken", response.access_token);
        localStorage.setItem("refreshToken", response.refresh_token);

        // Decode and update user
        const decoded: any = jwtDecode(response.access_token);
        setUser({
          id: decoded.sub,
          email: decoded.email,
          firstName: decoded.given_name || "",
          lastName: decoded.family_name || "",
          role: decoded.role || "User",
          tenantId: decoded.tenant_id,
        });
      } catch (error) {
        console.error("Token refresh failed:", error);
        await logout();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
