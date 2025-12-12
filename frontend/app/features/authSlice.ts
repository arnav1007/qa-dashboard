/**
 * Redux slice for authentication state management
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AuthState {
  user: {
    username: string
  } | null
  token: string | null
  loading: boolean
  error: string | null
}

// Initialize state from localStorage if available
const getInitialState = (): AuthState => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    const username = localStorage.getItem('username')
    
    if (token && username) {
      return {
        user: { username },
        token,
        loading: false,
        error: null,
      }
    }
  }
  
  return {
    user: null,
    token: null,
    loading: false,
    error: null,
  }
}

const initialState: AuthState = getInitialState()

/**
 * Async thunk for user registration
 */
export const register = createAsyncThunk(
  'auth/register',
  async (credentials: { username: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/api/register`, credentials)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Registration failed')
    }
  }
)

/**
 * Async thunk for user login
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/api/login`, credentials)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Login failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.error = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('username')
      }
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.access_token
        state.user = {
          username: action.payload.username,
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', action.payload.access_token)
          localStorage.setItem('username', action.payload.username)
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.access_token
        state.user = {
          username: action.payload.username,
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', action.payload.access_token)
          localStorage.setItem('username', action.payload.username)
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer

