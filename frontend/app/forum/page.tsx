/**
 * Forum page - main Q&A dashboard
 */
'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchQuestions, updateQuestionStatus, Question } from '../features/questionsSlice'
import { useWebSocket } from '../hooks/useWebSocket'
import Navbar from '../components/Navbar'
import QuestionForm from '../components/QuestionForm'
import QuestionCard from '../components/QuestionCard'
import ResponseModal from '../components/ResponseModal'

export default function ForumPage() {
  const dispatch = useAppDispatch()
  const { questions, loading } = useAppSelector((state) => state.questions)
  const { token } = useAppSelector((state) => state.auth)
  
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Connect to WebSocket for real-time updates
  const { isConnected } = useWebSocket()

  // Fetch questions on mount
  useEffect(() => {
    dispatch(fetchQuestions())
  }, [dispatch])

  const handleStatusChange = async (questionId: number, status: string) => {
    if (!token) return
    try {
      await dispatch(updateQuestionStatus({ id: questionId, status, token })).unwrap()
    } catch (error) {
      console.error('Failed to update question status:', error)
    }
  }

  const handleViewResponses = (question: Question) => {
    setSelectedQuestion(question)
  }

  const handleCloseModal = () => {
    setSelectedQuestion(null)
  }

  // Filter questions based on selected status
  const filteredQuestions = statusFilter === 'all' 
    ? questions 
    : questions.filter(q => q.status === statusFilter)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with WebSocket status */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Q&A Forum</h1>
            <p className="text-gray-600 mt-1">Ask questions and get answers from the community</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Question Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <QuestionForm />
            </div>
          </div>

          {/* Right Column - Questions List */}
          <div className="lg:col-span-2">
            {/* Filter Tabs */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex space-x-2 overflow-x-auto">
                {['all', 'Pending', 'Escalated', 'Answered'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'All Questions' : status}
                    {status !== 'all' && (
                      <span className="ml-2 bg-white text-gray-700 px-2 py-0.5 rounded-full text-xs">
                        {questions.filter(q => q.status === status).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            {loading && questions.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading questions...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No questions yet</h3>
                <p className="text-gray-500">
                  {statusFilter === 'all' 
                    ? 'Be the first to ask a question!' 
                    : `No ${statusFilter.toLowerCase()} questions found.`}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredQuestions.map((question) => (
                  <QuestionCard
                    key={question.question_id}
                    question={question}
                    onStatusChange={handleStatusChange}
                    onViewResponses={handleViewResponses}
                  />
                ))}
              </div>
            )}

            {/* Load More (for future pagination) */}
            {filteredQuestions.length > 0 && (
              <div className="mt-6 text-center text-gray-500 text-sm">
                Showing {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Response Modal */}
      <ResponseModal
        question={selectedQuestion}
        isOpen={!!selectedQuestion}
        onClose={handleCloseModal}
      />
    </div>
  )
}

