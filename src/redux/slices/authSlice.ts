import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import loginService from "../../services/Login";
import sessionManager from "../../services/sessionManager";
import { apiClient } from "../../utils/apiClient";
import {
  clearAuthTokens,
  getRefreshToken,
  persistAuthTokensFromApi,
  isAccessTokenValid,
} from "../../services/auth/tokenStorage";
import { extractErrorMessage } from "../../utils/extractErrorMessage";

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
  organisation_id?: string | number | null;
  organisation_ids?: Array<string | number>;
  organisations?: Array<{ id?: string | number; name?: string }>;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  tokenExpiresAt: number | null;
  expiresIn: number | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  tokenExpiresAt: null,
  expiresIn: null,
  isAuthenticated: false,
  isInitialized: false,
  loading: false,
  error: null,
};

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<AuthUser>("/auth/me");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to load user profile");
    }
  }
);

export const initializeAuth = createAsyncThunk(
  "auth/initializeAuth",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      if (isAccessTokenValid()) {
        sessionManager.scheduleRefresh();
        await dispatch(fetchCurrentUser());
        return { authenticated: true };
      }

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearAuthTokens();
        return { authenticated: false };
      }

      await sessionManager.refreshTokens();
      sessionManager.scheduleRefresh();
      await dispatch(fetchCurrentUser());
      return { authenticated: true };
    } catch (error: any) {
      clearAuthTokens();
      sessionManager.clearSession();
      return rejectWithValue(error?.message || "Session expired");
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await loginService.login(credentials);

      persistAuthTokensFromApi({
        token: response.token,
        refresh_token: (response as { refresh_token?: string }).refresh_token,
        refreshToken: response.refreshToken,
        expires_in: response.expires_in,
        refresh_expires_in: (response as { refresh_expires_in?: number }).refresh_expires_in,
      });

      sessionManager.scheduleRefresh();
      await dispatch(fetchCurrentUser());
      return response;
    } catch (error: unknown) {
      const responseData = (error as { response?: { data?: unknown } })?.response?.data;
      const message = responseData
        ? extractErrorMessage(responseData)
        : extractErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await loginService.logout();
      return true;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Logout failed");
    } finally {
      sessionManager.clearAuthSession();
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setTokens: (
      state,
      action: {
        payload: { token: string; tokenExpiresAt: number; expiresIn: number };
      }
    ) => {
      state.token = action.payload.token;
      state.tokenExpiresAt = action.payload.tokenExpiresAt;
      state.expiresIn = action.payload.expiresIn;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.tokenExpiresAt = null;
      state.expiresIn = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    forceLogout: (state) => {
      state.user = null;
      state.token = null;
      state.tokenExpiresAt = null;
      state.expiresIn = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isInitialized = true;
        state.isAuthenticated = action.payload.authenticated;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.loading = false;
        state.isInitialized = true;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.tokenExpiresAt = null;
        state.expiresIn = null;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
      })
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.tokenExpiresAt = null;
        state.expiresIn = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.tokenExpiresAt = null;
        state.expiresIn = null;
      });
  },
});

export const { setTokens, clearAuth, forceLogout, clearError } = authSlice.actions;
export default authSlice.reducer;
