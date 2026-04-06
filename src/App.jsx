import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'dompurify'
import './App.css'

const API_BASE_URL = 'http://192.168.0.105:1234'

function App() {
  // Model management state
  const [models, setModels] = useState([])
  const [loadedModel, setLoadedModel] = useState(null)
  const [selectedModel, setSelectedModel] = useState('')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false)
  
  // Chat state
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [previousResponseId, setPreviousResponseId] = useState(null)
  const [hasNewConversation, setHasNewConversation] = useState(true)
  
  // Streaming state - used to track current message being generated
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('')
  
  // Stats to display
  const [lastStats, setLastStats] = useState(null)
  
  // Refs for auto-scrolling chat
  const chatEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputAreaRef = useRef(null)

  // Fetch models on mount
  useEffect(() => {
    fetchModels()
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  const fetchModels = async () => {
    try {
      setIsLoadingModels(true)
      const response = await fetch(`${API_BASE_URL}/api/v1/models`)
      const data = await response.json()
      setModels(data.models || [])
      
      // Check for loaded models in the list
      const currentlyLoaded = (data.models || []).find(m => m.loaded_instances && m.loaded_instances.length > 0)
      if (currentlyLoaded) {
        setLoadedModel(currentlyLoaded.key)
        setSelectedModel(currentlyLoaded.key)
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const loadModel = async () => {
    if (!selectedModel) return
    
    try {
      setIsLoadModalOpen(true)
      const response = await fetch(`${API_BASE_URL}/api/v1/models/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          context_length: 10000,
          flash_attention: true,
          echo_load_config: true
        })
      })
      
      const data = await response.json()
      console.log('Model loaded:', data)
      
      // Update loaded model state
      if (data.status === 'loaded') {
        setLoadedModel(data.instance_id)
        setSelectedModel(data.instance_id)
        setMessages([])
        setPreviousResponseId(null)
        setHasNewConversation(true)
        fetchModels() // Refresh to show updated loaded_instances
      }
    } catch (error) {
      console.error('Error loading model:', error)
    } finally {
      setIsLoadModalOpen(false)
    }
  }

  const unloadCurrentModel = async () => {
    if (!loadedModel) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/models/unload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instance_id: loadedModel
        })
      })
      
      const data = await response.json()
      console.log('Model unloaded:', data)
      
      // Clear loaded model state
      setLoadedModel(null)
      setMessages([])
      setPreviousResponseId(null)
      setHasNewConversation(true)
      fetchModels() // Refresh to show updated status
    } catch (error) {
      console.error('Error unloading model:', error)
    }
  }

  const startNewConversation = () => {
    if (!loadedModel) return
    
    setMessages([])
    setPreviousResponseId(null)
    setHasNewConversation(true)
  }

  const sendMessage = async () => {
    if (!inputText.trim() || !loadedModel) return
    
    const userMessage = inputText
    setInputText('')
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setHasNewConversation(false)
    
    setIsGenerating(true)
    setCurrentAssistantMessage('')
    
    try {
      const payload = {
        model: loadedModel,
        instructions: "You are a helpful assistant.",
        input: userMessage,
        store: true,
        stream: true
      }
      
      // Add previous_response_id if it exists (not first message)
      if (previousResponseId) {
        payload.previous_response_id = previousResponseId
      }
      
      const response = await fetch(`${API_BASE_URL}/v1/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      // Process SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      let responseId = null
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          // Handle "event: ... data: ..." on same line
          if (line.startsWith('event: ') && line.includes('data: ')) {
            const eventMatch = line.match(/event:\s*(\S+)/)
            const dataMatch = line.match(/data:\s*(.+)$/)
            
            if (dataMatch) {
              try {
                const eventData = JSON.parse(dataMatch[1])
                
                // Extract response ID from initial events
                if (eventData.response && !responseId) {
                  responseId = eventData.response.id
                }
                
                // Handle text deltas
                if (eventData.type === 'response.output_text.delta') {
                  assistantMessage += eventData.delta
                  setCurrentAssistantMessage(assistantMessage)
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e)
              }
            }
          } else if (line.startsWith('data:')) {
            // Handle "data: ..." on its own line
            try {
              const eventData = JSON.parse(line.substring(5))
              
              // Extract response ID from initial events
              if (eventData.response && !responseId) {
                responseId = eventData.response.id
              }
              
              // Handle text deltas
              if (eventData.type === 'response.output_text.delta') {
                assistantMessage += eventData.delta
                setCurrentAssistantMessage(assistantMessage)
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
      
      // Update previous response ID for next conversation turn
      if (responseId) {
        setPreviousResponseId(responseId)
      }
      
      // Add the complete assistant message to chat history
      if (assistantMessage) {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }])
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Could not get response from model' }])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Safe Markdown rendering with DOMPurify
  const renderSafeMarkdown = (text) => {
    if (!text || text === '') return <span>No response from model</span>
    
    // Sanitize the HTML output from react-markdown to prevent XSS
    const cleanText = text.replace(/`{3}([\s\S]*?)`{3}/g, '```code block```')
    const sanitizedHtml = DOMPurify.sanitize(cleanText)
    
    return (
      <div className="markdown-content">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    )
  }

  // Format bytes to human readable
  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  // Get model info by key
  const getModelInfo = (key) => {
    return models.find(m => m.key === key)
  }

  return (
    <div className="app-container">
      {/* Header Section - Model Management */}
      <header className="model-management">
        <h2>Model Management</h2>
        
        <div className="current-model-display">
          {loadedModel ? (
            <>
              <span className="status-indicator status-active"></span>
              <span className="model-name">Loaded: {getModelInfo(loadedModel)?.display_name || loadedModel}</span>
              <button 
                className="btn-unload"
                onClick={unloadCurrentModel}
                disabled={isLoadingModels}
              >
                Unload Model
              </button>
            </>
          ) : (
            <>
              <span className="status-indicator status-inactive"></span>
              <span className="no-model">No model loaded</span>
            </>
          )}
        </div>

        {/* Load Model Modal */}
        {isLoadModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content modal-anim">
              <h3>Select a Model to Load</h3>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isLoadingModels}
              >
                <option value="">Choose a model...</option>
                {models.filter(m => m.type === 'llm').map(model => (
                  <option key={model.key} value={model.key}>
                    {model.display_name || model.key} 
                    {model.loaded_instances?.length > 0 ? ' (Already loaded)' : ''}
                  </option>
                ))}
              </select>
              <div className="modal-actions">
                <button 
                  onClick={() => setIsLoadModalOpen(false)}
                  disabled={isLoadingModels}
                >
                  Cancel
                </button>
                <button 
                  onClick={loadModel} 
                  disabled={!selectedModel || isLoadingModels}
                  className="btn-primary"
                >
                  {isLoadingModels ? 'Loading...' : 'Load Model'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load New Model Button */}
        {!loadedModel && (
          <button 
            className="btn-load btn-anim" 
            onClick={() => setIsLoadModalOpen(true)}
            disabled={isLoadingModels}
          >
            {isLoadingModels ? 'Loading Models...' : 'Load Model'}
          </button>
        )}
        
        {/* New Conversation Button - only shows when conversation has content */}
        {loadedModel && messages.length > 0 && (
          <div className="new-convo-btn-container">
            <button 
              className="btn-new-conversation btn-anim"
              onClick={startNewConversation}
            >
              New Conversation
            </button>
          </div>
        )}
      </header>

      {/* Main Content - Chat Interface */}
      <div className="main-content">
        {/* Messages Container */}
        <div 
          ref={messagesContainerRef}
          className="messages-container"
        >
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>Start a conversation by typing below</p>
              {loadedModel && <span className="hint">(Selected: {getModelInfo(loadedModel)?.display_name})</span>}
              {!loadedModel && <span className="hint">(Load a model first)</span>}
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'} message-anim`}
              >
                {msg.role === 'assistant' ? (
                  <div className="message-content">
                    {renderSafeMarkdown(msg.content)}
                  </div>
                ) : (
                  <div className="message-content user-msg-content">
                    {msg.content}
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Show streaming message during generation */}
          {isGenerating && (
            <div className="message assistant-message message-anim streaming-message">
              <div className="message-content streaming-content">
                {currentAssistantMessage || <span className="cursor">|</span>}
                <span className="typing-cursor"></span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>


        {/* Input Area */}
        <div className="input-area" ref={inputAreaRef}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={loadedModel ? "Type your message..." : "Load a model to start chatting"}
            disabled={!loadedModel || isGenerating}
            rows={1}
          />
          <button 
            onClick={sendMessage}
            disabled={!inputText.trim() || !loadedModel || isGenerating}
            className="btn-send btn-anim"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default App