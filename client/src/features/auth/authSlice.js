import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios.js';

const storedToken = localStorage.getItem('sp_token');
const storedUser = localStorage.getItem('sp_user');

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', payload);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Login failed');
  }
});

// No credentials needed — issues a "user"-role token immediately so anyone
// can jump straight into the dashboard. Only the admin account needs a
// real email/password.
export const guestLogin = createAsyncThunk('auth/guestLogin', async (_, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/guest-login');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Could not enter the site');
  }
});

function persistSession(state, token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('sp_token', token);
  localStorage.setItem('sp_user', JSON.stringify(user));
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: storedToken || null,
    user: storedUser ? JSON.parse(storedUser) : null,
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem('sp_token');
      localStorage.removeItem('sp_user');
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        persistSession(state, action.payload.token, action.payload.user);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Login failed';
      })
      .addCase(guestLogin.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(guestLogin.fulfilled, (state, action) => {
        state.status = 'succeeded';
        persistSession(state, action.payload.token, action.payload.user);
      })
      .addCase(guestLogin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Could not enter the site';
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;