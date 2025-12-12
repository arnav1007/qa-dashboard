/**
 * Form component for submitting questions
 */
'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { createQuestion } from '../features/questionsSlice'

export default function QuestionForm() {
  const dispatch = useAppDispatch()
  const { user, token } = useAppSelector((state) => state.auth)
  const { loading, error } = useAppSelector((state) => state.questions)

  const [message, setMessage] = useState('')
  const [guestName, setGuestName] = useState('')
  const [errors, setErrors] = useState<{ message?: string; guestName?: string }>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const validate = () => {
    const newErrors: { message?: string; guestName?: string } = {}

    if (!message.trim()) {
      newErrors.message = 'Question cannot be empty'
    } else if (message.length > 1000) {
      newErrors.message = 'Question must be less than 1000 characters'
    }

    if (!user && !guestName.trim()) {
      newErrors.guestName = 'Guest name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      await dispatch(
        createQuestion({
          message: message.trim(),
          guestName: !user ? guestName.trim() : undefined,
          token: token || undefined,
        })
      ).unwrap()

      // Clear form on success
      setMessage('')
      setGuestName('')
      setErrors({})
    } catch (err) {
      console.error('Failed to create question:', err)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Ask a Question</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Guest Name (only if not logged in) */}
        {mounted && !user && (
          <div>
            <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.guestName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your name"
            />
            {errors.guestName && (
              <p className="mt-1 text-sm text-red-600">{errors.guestName}</p>
            )}
          </div>
        )}

        {/* Question Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Your Question <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.message ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Type your question here..."
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">{message.length} / 1000 characters</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Question'}
        </button>
      </form>
    </div>
  )
}

