import apiClient from "./apiClient";
import axios from "axios";

// Identity Server base URL
const IDENTITY_SERVER_URL = "http://localhost:5198";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export const authService = {
  /**
   * Login using Duende IdentityServer OAuth 2.0 Resource Owner Password flow
   * Note: Uses deeplens-webui-dev client for development.
   * For production, switch to deeplens-webui with PKCE flow.
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    // Use IdentityServer's /connect/token endpoint
    const params = new URLSearchParams({
      grant_type: "password",
      username: data.email,
      password: data.password,
      client_id: "deeplens-webui-dev", // Development client with password grant
      scope:
        "openid profile email roles deeplens.api deeplens.search deeplens.admin offline_access",
    });

    const response = await axios.post(
      `${IDENTITY_SERVER_URL}/connect/token`,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  },

  register: async (data: RegisterRequest): Promise<any> => {
    const response = await apiClient.post("/api/users/register", data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Call the auth controller logout endpoint
    await apiClient.post("/api/auth/logout");

    // Optionally revoke token at IdentityServer
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await axios.post(
          `${IDENTITY_SERVER_URL}/connect/revocation`,
          new URLSearchParams({
            token: refreshToken,
            token_type_hint: "refresh_token",
            client_id: "deeplens-webui-dev",
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
      } catch (error) {
        console.error("Failed to revoke token:", error);
      }
    }
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: "deeplens-webui-dev",
    });

    const response = await axios.post(
      `${IDENTITY_SERVER_URL}/connect/token`,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  },

  /**
   * Get current user profile from API
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get("/api/auth/me");
    return response.data;
  },

  /**
   * Get user info from IdentityServer
   */
  getUserInfo: async (): Promise<any> => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      throw new Error("No access token available");
    }

    const response = await axios.get(
      `${IDENTITY_SERVER_URL}/connect/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  },
};
