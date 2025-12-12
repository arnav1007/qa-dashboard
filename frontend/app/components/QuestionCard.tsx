/**
 * Question card component - displays individual question
 */
'use client'

import { useState, useEffect } from 'react'
import { Question } from '../features/questionsSlice'
import { useAppSelector } from '../store/hooks'
import { formatDistanceToNow } from '../utils/dateUtils'

interface QuestionCardProps {
  question: Question
  onStatusChange?: (questionId: number, status: string) => void
  onViewResponses?: (question: Question) => void
}

export default function QuestionCard({ question, onStatusChange, onViewResponses }: QuestionCardProps) {
  const { user } = useAppSelector((state) => state.auth)
  const [isUpdating, setIsUpdating] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Escalated':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'Answered':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!onStatusChange) return
    setIsUpdating(true)
    try {
      await onStatusChange(question.question_id, newStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const authorDisplay = question.username || question.guest_name || 'Anonymous'
  const isGuest = !question.username

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 transition-all hover:shadow-lg ${
      question.status === 'Escalated' ? 'border-red-500' : 'border-blue-500'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isGuest ? 'bg-gray-300' : 'bg-gradient-to-br from-blue-400 to-purple-500'
          }`}>
            <span className="text-white font-bold">
              {authorDisplay.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-800">{authorDisplay}</span>
              {isGuest && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Guest</span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(question.created_at)}
            </span>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(question.status)}`}>
          {question.status}
        </div>
      </div>

      {/* Question Message */}
      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{question.message}</p>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={() => onViewResponses?.(question)}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{question.response_count} {question.response_count === 1 ? 'Response' : 'Responses'}</span>
        </button>

        {/* Status Controls (Available to all logged-in users) */}
        {mounted && user && (
          <div className="flex space-x-2">
            {question.status !== 'Escalated' && (
              <button
                onClick={() => handleStatusChange('Escalated')}
                disabled={isUpdating}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition disabled:opacity-50"
              >
                Escalate
              </button>
            )}
            {question.status !== 'Pending' && (
              <button
                onClick={() => handleStatusChange('Pending')}
                disabled={isUpdating}
                className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition disabled:opacity-50"
              >
                Pending
              </button>
            )}
            {question.status !== 'Answered' && (
              <button
                onClick={() => handleStatusChange('Answered')}
                disabled={isUpdating}
                className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition disabled:opacity-50"
              >
                Mark Answered
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

