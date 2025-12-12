/**
 * Redux slice for questions state management
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Question {
  question_id: number
  message: string
  status: string
  created_at: string
  guest_name: string | null
  username: string | null
  response_count: number
}

export interface Response {
  response_id: number
  question_id: number
  message: string
  created_at: string
  guest_name: string | null
  username: string | null
}

interface QuestionsState {
  questions: Question[]
  selectedQuestion: Question | null
  responses: Response[]
  loading: boolean
  error: string | null
}

const initialState: QuestionsState = {
  questions: [],
  selectedQuestion: null,
  responses: [],
  loading: false,
  error: null,
}

/**
 * Sort questions: Escalated first, then by timestamp
 */
const sortQuestions = (questions: Question[]) => {
  return [...questions].sort((a, b) => {
    // Status priority
    const statusPriority: { [key: string]: number } = {
      'Escalated': 0,
      'Pending': 1,
      'Answered': 2,
    }
    
    const statusDiff = statusPriority[a.status] - statusPriority[b.status]
    if (statusDiff !== 0) return statusDiff
    
    // Then by timestamp (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

/**
 * Fetch all questions
 */
export const fetchQuestions = createAsyncThunk('questions/fetch', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/api/questions`)
    return response.data
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch questions')
  }
})

/**
 * Create a new question
 */
export const createQuestion = createAsyncThunk(
  'questions/create',
  async (data: { message: string; guestName?: string; token?: string }, { rejectWithValue }) => {
    try {
      const headers: any = {}
      if (data.token) {
        headers.Authorization = `Bearer ${data.token}`
      }
      
      const response = await axios.post(
        `${API_URL}/api/questions`,
        {
          message: data.message,
          guest_name: data.guestName,
        },
        { headers }
      )
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create question')
    }
  }
)

/**
 * Update question status (admin only)
 */
export const updateQuestionStatus = createAsyncThunk(
  'questions/updateStatus',
  async ({ id, status, token }: { id: number; status: string; token: string }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/questions/${id}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update question')
    }
  }
)

/**
 * Fetch responses for a question
 */
export const fetchResponses = createAsyncThunk(
  'questions/fetchResponses',
  async (questionId: number, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/api/questions/${questionId}/responses`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch responses')
    }
  }
)

/**
 * Create a response to a question
 */
export const createResponse = createAsyncThunk(
  'questions/createResponse',
  async (
    data: { questionId: number; message: string; guestName?: string; token?: string },
    { rejectWithValue }
  ) => {
    try {
      const headers: any = {}
      if (data.token) {
        headers.Authorization = `Bearer ${data.token}`
      }
      
      const response = await axios.post(
        `${API_URL}/api/questions/${data.questionId}/responses`,
        {
          message: data.message,
          guest_name: data.guestName,
        },
        { headers }
      )
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create response')
    }
  }
)

const questionsSlice = createSlice({
  name: 'questions',
  initialState,
  reducers: {
    addQuestion: (state, action: PayloadAction<Question>) => {
      state.questions = sortQuestions([action.payload, ...state.questions])
    },
    updateQuestion: (state, action: PayloadAction<Question>) => {
      const index = state.questions.findIndex((q) => q.question_id === action.payload.question_id)
      if (index !== -1) {
        state.questions[index] = action.payload
        state.questions = sortQuestions(state.questions)
      }
      // Update selected question if it's the one being updated
      if (state.selectedQuestion?.question_id === action.payload.question_id) {
        state.selectedQuestion = action.payload
      }
    },
    addResponse: (state, action: PayloadAction<Response>) => {
      state.responses.push(action.payload)
      // Update response count for the question
      const question = state.questions.find(q => q.question_id === action.payload.question_id)
      if (question) {
        question.response_count += 1
      }
    },
    setSelectedQuestion: (state, action: PayloadAction<Question | null>) => {
      state.selectedQuestion = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch questions
      .addCase(fetchQuestions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchQuestions.fulfilled, (state, action) => {
        state.loading = false
        state.questions = sortQuestions(action.payload)
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Create question
      .addCase(createQuestion.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createQuestion.fulfilled, (state) => {
        state.loading = false
        // Question will be added via WebSocket
      })
      .addCase(createQuestion.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Update question status
      .addCase(updateQuestionStatus.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateQuestionStatus.fulfilled, (state) => {
        state.loading = false
        // Update will come via WebSocket
      })
      .addCase(updateQuestionStatus.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch responses
      .addCase(fetchResponses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchResponses.fulfilled, (state, action) => {
        state.loading = false
        state.responses = action.payload
      })
      .addCase(fetchResponses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Create response
      .addCase(createResponse.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createResponse.fulfilled, (state) => {
        state.loading = false
        // Response will be added via WebSocket
      })
      .addCase(createResponse.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { addQuestion, updateQuestion, addResponse, setSelectedQuestion, clearError } =
  questionsSlice.actions
export default questionsSlice.reducer

