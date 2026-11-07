/**
 * Authentication and User Profile API Client.
 * Communicates with backend endpoints (/api/v1/auth/*, /api/v1/users/*).
 * Automatically passes `credentials: 'include'` for HttpOnly refresh cookie management.
 */

import { StudentUser } from '../../types';

export interface UserProfileResponse {
  id: string;
  user_id: string;
  bio?: string | null;
  department?: string | null;
  avatar_url?: string | null;
  preferences?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'administrator';
  is_active: boolean;
  created_at: string;
  profile?: UserProfileResponse | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user?: UserResponse;
}

export interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
}

export interface UserRegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface UserProfileUpdateRequest {
  full_name?: string;
  bio?: string;
  department?: string;
  avatar_url?: string;
}

export interface MessageResponse {
  message: string;
}

const API_BASE = '/api/v1';

class AuthApiClient {
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  public setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  public async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${path}`;
    const headers = new Headers(options.headers || {});

    if (this.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };

    let response = await fetch(url, config);

    // Silent refresh on 401 if access token expired, except for login/refresh/register/logout calls
    if (
      response.status === 401 &&
      !path.includes('/auth/login') &&
      !path.includes('/auth/refresh') &&
      !path.includes('/auth/register') &&
      !path.includes('/auth/logout')
    ) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const refreshRes = await this.refresh();
          this.setAccessToken(refreshRes.access_token);
          this.isRefreshing = false;
          this.onTokenRefreshed(refreshRes.access_token);
        } catch (err) {
          this.isRefreshing = false;
          this.setAccessToken(null);
          throw err;
        }
      }

      // Retry request with fresh token
      const retryPromise = new Promise<Response>((resolve) => {
        this.addRefreshSubscriber((newToken) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          resolve(fetch(url, { ...config, headers }));
        });
      });

      response = await retryPromise;
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback to generic message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  public async register(payload: UserRegisterRequest): Promise<TokenResponse> {
    const data = await this.request<TokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setAccessToken(data.access_token);
    return data;
  }

  public async login(payload: UserLoginRequest): Promise<TokenResponse> {
    const data = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setAccessToken(data.access_token);
    return data;
  }

  public async refresh(): Promise<TokenRefreshResponse> {
    const data = await this.request<TokenRefreshResponse>('/auth/refresh', {
      method: 'POST',
    });
    this.setAccessToken(data.access_token);
    return data;
  }

  public async logout(): Promise<MessageResponse> {
    try {
      const data = await this.request<MessageResponse>('/auth/logout', {
        method: 'POST',
      });
      this.setAccessToken(null);
      return data;
    } catch (err) {
      this.setAccessToken(null);
      throw err;
    }
  }

  public async getMe(): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/me', {
      method: 'GET',
    });
  }

  public async updateProfile(payload: UserProfileUpdateRequest): Promise<UserResponse> {
    return this.request<UserResponse>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async updatePreferences(preferences: Record<string, any>): Promise<UserResponse> {
    return this.request<UserResponse>('/users/me/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    });
  }

  public async changePassword(payload: PasswordChangeRequest): Promise<MessageResponse> {
    return this.request<MessageResponse>('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
}

export const authApi = new AuthApiClient();

export function mapUserResponseToStudentUser(user: UserResponse): StudentUser {
  const initials = user.full_name
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const prefs = user.profile?.preferences || {};

  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    avatar: user.profile?.avatar_url || initials,
    role: 'student',
    bio: user.profile?.bio || undefined,
    joinDate: user.created_at ? user.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    preferences: {
      theme: (prefs.theme as 'light' | 'dark' | 'system') || 'system',
      leaderboardOptIn: prefs.leaderboardOptIn !== undefined ? Boolean(prefs.leaderboardOptIn) : true,
      emailNotifications: prefs.emailNotifications !== undefined ? Boolean(prefs.emailNotifications) : true,
    },
  };
}
