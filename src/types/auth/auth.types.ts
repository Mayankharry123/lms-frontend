export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokenData {
  token: string;
  refresh_token?: string;
  refreshToken?: string;
  token_type?: string;
  expires_in: number;
  refresh_expires_in?: number;
}

export interface AuthResponse extends AuthTokenData {
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles?: Array<{ id: string | number; name: string }>;
  avatar?: string;
}
