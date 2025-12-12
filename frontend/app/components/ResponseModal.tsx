/**
 * Modal component for viewing and adding responses to questions
 */
'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { Question, Response } from '../features/questionsSlice'
import { fetchResponses, createResponse } from '../features/questionsSlice'
import { formatDistanceToNow } from '../utils/dateUtils'

interface ResponseModalProps {
  question: Question | null
  isOpen: boolean
  onClose: () => void
}

export default function ResponseModal({ question, isOpen, onClose }: ResponseModalProps) {
  const dispatch = useAppDispatch()
  const { user, token } = useAppSelector((state) => state.auth)
  const { responses, loading } = useAppSelector((state) => state.questions)

  const [message, setMessage] = useState('')
  const [guestName, setGuestName] = useState('')
  const [errors, setErrors] = useState<{ message?: string; guestName?: string }>({})

  useEffect(() => {
    if (question && isOpen) {
      dispatch(fetchResponses(question.question_id))
    }
  }, [question, isOpen, dispatch])

  if (!isOpen || !question) return null

  const validate = () => {
    const newErrors: { message?: string; guestName?: string } = {}

    if (!message.trim()) {
      newErrors.message = 'Response cannot be empty'
    } else if (message.length > 1000) {
      newErrors.message = 'Response must be less than 1000 characters'
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
        createResponse({
          questionId: question.question_id,
          message: message.trim(),
          guestName: !user ? guestName.trim() : undefined,
          token: token || undefined,
        })
      ).unwrap()

      // Clear form and refresh responses
      setMessage('')
      setGuestName('')
      setErrors({})
      dispatch(fetchResponses(question.question_id))
    } catch (err) {
      console.error('Failed to create response:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Question & Responses</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Question */}
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <div className="flex items-start space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">
                {(question.username || question.guest_name || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-800">
                  {question.username || question.guest_name || 'Anonymous'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(question.created_at)}
                </span>
              </div>
              <p className="text-gray-700 mt-2 whitespace-pre-wrap">{question.message}</p>
            </div>
          </div>
        </div>

        {/* Responses List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && responses.length === 0 ? (
            <div className="text-center text-gray-500">Loading responses...</div>
          ) : responses.length === 0 ? (
            <div className="text-center text-gray-500">
              No responses yet. Be the first to respond!
            </div>
          ) : (
            responses.map((response: Response) => (
              <div key={response.response_id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    response.username ? 'bg-gradient-to-br from-green-400 to-blue-500' : 'bg-gray-300'
                  }`}>
                    <span className="text-white text-sm font-bold">
                      {(response.username || response.guest_name || 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-800 text-sm">
                        {response.username || response.guest_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(response.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">{response.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Response Form */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!user && (
              <div>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.guestName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Your name"
                />
                {errors.guestName && (
                  <p className="mt-1 text-sm text-red-600">{errors.guestName}</p>
                )}
              </div>
            )}

            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.message ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Write your response..."
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Response'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

