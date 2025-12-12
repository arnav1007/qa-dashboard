/**
 * Redux store configuration
 */
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/authSlice'
import questionsReducer from '../features/questionsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    questions: questionsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for date serialization
        ignoredActions: ['questions/addQuestion', 'questions/updateQuestion'],
        // Ignore these field paths in state
        ignoredPaths: ['questions.questions'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

