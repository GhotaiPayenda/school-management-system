import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, refreshCsrf, setCsrfToken, toErrorPayload } from '../../api/client.js';

const initialState = {
  status: 'idle',
  initialized: false,
  user: null,
  role: null,
  permissions: [],
  error: null,
};

export const bootstrapSession = createAsyncThunk('auth/bootstrapSession', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/auth/me', { skipAuthRedirect: true });
    setCsrfToken(response.data.data.csrfToken);

    return response.data.data;
  } catch (error) {
    if (error.status === 401) return null;

    return rejectWithValue(toErrorPayload(error));
  }
});

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      await refreshCsrf();
      const response = await api.post(
        '/auth/login',
        { email, password },
        { skipAuthRedirect: true },
      );
      setCsrfToken(response.data.data.csrfToken);

      return response.data.data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error));
    }
  },
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword, newPasswordConfirmation }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        newPasswordConfirmation,
      });
      setCsrfToken(response.data.data.csrfToken);

      return response.data.data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error));
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Clearing local state is still the right outcome if the session already expired.
  } finally {
    setCsrfToken(null);
  }

  return true;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired(state) {
      state.status = 'anonymous';
      state.initialized = true;
      state.user = null;
      state.role = null;
      state.permissions = [];
      state.error = {
        status: 401,
        code: 'session_expired',
        messageKey: 'auth.unauthenticated',
        message: 'Your session has ended. Sign in again.',
        fields: {},
      };
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.initialized = true;
        state.error = null;

        if (action.payload) {
          state.status = 'authenticated';
          state.user = action.payload.user;
          state.role = action.payload.role;
          state.permissions = action.payload.permissions;
        } else {
          state.status = 'anonymous';
          state.user = null;
          state.role = null;
          state.permissions = [];
        }
      })
      .addCase(bootstrapSession.rejected, (state, action) => {
        state.initialized = true;
        state.status = 'anonymous';
        state.error = action.payload || null;
      })
      .addCase(login.pending, (state) => {
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.initialized = true;
        state.user = action.payload.user;
        state.role = action.payload.role;
        state.permissions = action.payload.permissions;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'anonymous';
        state.error = action.payload || null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.user = action.payload.user;
        state.role = action.payload.role;
        state.permissions = action.payload.permissions;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.payload || null;
      })
      .addCase(logout.pending, (state) => {
        state.status = 'anonymous';
        state.user = null;
        state.role = null;
        state.permissions = [];
        state.error = null;
      });
  },
});

export const { sessionExpired, clearError } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectHasPermission = (permission) => (state) =>
  state.auth.permissions.includes(permission);

export default authSlice.reducer;
