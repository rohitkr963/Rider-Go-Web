import React, { useState, useRef, useEffect } from 'react'

const VoiceSearch = ({ 
  onResult, 
  placeholder = "Click mic to speak", 
  language = "en-IN",
  className = "",
  style = {},
  disabled = false
}) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingResult, setPendingResult] = useState('')
  
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      
      // Configure recognition settings
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = language
      recognition.maxAlternatives = 1
      
      // Event handlers
      recognition.onstart = () => {
        setIsListening(true)
        setError('')
        setTranscript('')
        console.log('🎤 Voice recognition started')
      }
      
      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }
        
        if (finalTranscript) {
          console.log('🎤 Final transcript:', finalTranscript)
          setTranscript(finalTranscript)
          setPendingResult(finalTranscript.trim())
          setShowConfirmation(true)
        } else {
          setTranscript(interimTranscript)
        }
      }
      
      recognition.onerror = (event) => {
        console.error('🎤 Speech recognition error:', event.error)
        setIsListening(false)
        
        switch (event.error) {
          case 'no-speech':
            setError('No speech detected. Please try again.')
            break
          case 'audio-capture':
            setError('Microphone not accessible. Please check permissions.')
            break
          case 'not-allowed':
            setError('Microphone permission denied. Please allow microphone access.')
            break
          case 'network':
            setError('Network error. Please check your internet connection.')
            break
          default:
            setError('Speech recognition failed. Please try again.')
        }
      }
      
      recognition.onend = () => {
        setIsListening(false)
        console.log('🎤 Voice recognition ended')
        
        // Clear timeout if recognition ends naturally
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
      
      recognitionRef.current = recognition
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [language])

  // Geocoding function to convert speech text to coordinates
  const geocodeAddress = async (address) => {
    try {
      console.log('🌍 Geocoding address:', address)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=in`
      )
      
      if (!response.ok) {
        throw new Error('Geocoding request failed')
      }
      
      const data = await response.json()
      
      if (data && data.length > 0) {
        const result = data[0]
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          name: result.display_name,
          address: address
        }
      } else {
        throw new Error('No location found for the given address')
      }
    } catch (error) {
      console.error('🌍 Geocoding error:', error)
      throw error
    }
  }

  const startListening = () => {
    if (!isSupported || !recognitionRef.current || disabled) return
    
    try {
      setError('')
      setTranscript('')
      setShowConfirmation(false)
      setPendingResult('')
      
      recognitionRef.current.start()
      
      // Set timeout to stop recognition after 10 seconds
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop()
          setError('Listening timeout. Please try again.')
        }
      }, 10000)
      
    } catch (error) {
      console.error('🎤 Failed to start recognition:', error)
      setError('Failed to start voice recognition. Please try again.')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const handleConfirm = async () => {
    if (!pendingResult) return
    
    try {
      setShowConfirmation(false)
      
      // Show loading state
      setTranscript('🌍 Finding location...')
      
      // Geocode the address
      const locationData = await geocodeAddress(pendingResult)
      
      // Call the callback with the result
      onResult({
        transcript: pendingResult,
        location: locationData,
        success: true
      })
      
      setTranscript('')
      setPendingResult('')
      
    } catch (error) {
      console.error('🌍 Location search failed:', error)
      setError('Could not find this location. Please try a different address.')
      setShowConfirmation(false)
      setPendingResult('')
    }
  }

  const handleReject = () => {
    setShowConfirmation(false)
    setPendingResult('')
    setTranscript('')
  }

  const handleRetry = () => {
    setError('')
    startListening()
  }

  if (!isSupported) {
    return (
      <div style={{
        padding: '8px 12px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#dc2626',
        textAlign: 'center'
      }}>
        ❌ Voice search not supported in this browser
      </div>
    )
  }

  return (
    <div className={className} style={style}>
      {/* Voice Input Button */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          style={{
            padding: '12px',
            background: isListening ? '#ef4444' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.5 : 1
          }}
          title={isListening ? 'Stop listening' : 'Start voice search'}
        >
          {isListening ? '⏹️' : '🎤'}
        </button>
        
        {/* Listening indicator */}
        {isListening && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '16px',
            height: '16px',
            background: '#ef4444',
            borderRadius: '50%',
            animation: 'pulse 1s infinite'
          }} />
        )}
      </div>

      {/* Transcript Display */}
      {transcript && !showConfirmation && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#0c4a6e'
        }}>
          {transcript.startsWith('🌍') ? transcript : `🎤 "${transcript}"`}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && pendingResult && (
        <div style={{
          marginTop: '8px',
          padding: '12px',
          background: 'white',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#374151',
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            Did you mean:
          </div>
          <div style={{
            fontSize: '16px',
            color: '#1f2937',
            marginBottom: '12px',
            fontWeight: '700',
            background: '#f9fafb',
            padding: '8px 12px',
            borderRadius: '8px'
          }}>
            "{pendingResult}"
          </div>
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleReject}
              style={{
                padding: '6px 12px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ❌ No
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: '6px 12px',
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ✅ Yes, search
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button
            onClick={handleRetry}
            style={{
              padding: '4px 8px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {/* Instructions */}
      {!isListening && !transcript && !error && !showConfirmation && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          Click the mic and speak your location
        </div>
      )}

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default VoiceSearch
