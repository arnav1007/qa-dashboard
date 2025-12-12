/**
 * Custom hook for WebSocket connection and real-time updates
 */
import { useEffect, useRef, useCallback } from 'react'
import { useAppDispatch } from '../store/hooks'
import { addQuestion, updateQuestion, addResponse } from '../features/questionsSlice'

const getWebSocketURL = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  // If page is loaded over HTTPS, use wss://, otherwise ws://
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const protocol = isSecure ? 'wss' : 'ws'
  // Replace http/https with ws/wss
  const wsUrl = apiUrl.replace(/^https?/, protocol) + '/ws'
  return wsUrl
}

const WS_URL = getWebSocketURL()
const RECONNECT_DELAY = 3000 // 3 seconds

export const useWebSocket = () => {
  const dispatch = useAppDispatch()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const isConnecting = useRef(false)

  const connect = useCallback(() => {
    // Skip WebSocket connection if API URL is HTTP and page is HTTPS
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const isApiHttp = apiUrl.startsWith('http://')
    const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
    
    if (isApiHttp && isPageHttps) {
      console.warn('WebSocket disabled: Cannot connect from HTTPS to HTTP endpoint')
      return
    }
    
    // Prevent multiple simultaneous connection attempts
    if (isConnecting.current || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
      return
    }

    isConnecting.current = true

    try {
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log('WebSocket connected')
        isConnecting.current = false
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('WebSocket message received:', message)

          switch (message.type) {
            case 'new_question':
              dispatch(addQuestion(message.data))
              break
            case 'question_updated':
              dispatch(updateQuestion(message.data))
              break
            case 'new_response':
              dispatch(addResponse(message.data))
              break
            default:
              console.log('Unknown message type:', message.type)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        isConnecting.current = false
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...')
        isConnecting.current = false
        wsRef.current = null
        
        // Attempt to reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, RECONNECT_DELAY)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      isConnecting.current = false
      
      // Retry connection
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, RECONNECT_DELAY)
    }
  }, [dispatch])

  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  }
}

