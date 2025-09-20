import React, { useState, useRef, useEffect } from 'react'

const VoiceSearchAdvanced = ({ 
  onResult, 
  placeholder = "Click mic to speak", 
  language = "en-IN",
  className = "",
  style = {},
  disabled = false,
  showLanguageSelector = true,
  accessibilityMode = false
}) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingResult, setPendingResult] = useState('')
  const [currentLanguage, setCurrentLanguage] = useState(language)
  const [isGeocoding, setIsGeocoding] = useState(false)
  
  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)

  // Language options
  const languages = [
    { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
    { code: 'hi-IN', name: 'हिंदी (भारत)', flag: '🇮🇳' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' }
  ]

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      
      // Configure recognition settings
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = currentLanguage
      recognition.maxAlternatives = 3 // Get multiple alternatives
      
      // Event handlers
      recognition.onstart = () => {
        setIsListening(true)
        setError('')
        setTranscript('')
        console.log('🎤 Voice recognition started in', currentLanguage)
      }
      
      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
            // Log alternatives for better debugging
            console.log('🎤 Alternatives:', Array.from(result).map(alt => alt.transcript))
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
            setError('कोई आवाज़ नहीं सुनाई दी। कृपया फिर से कोशिश करें। / No speech detected. Please try again.')
            break
          case 'audio-capture':
            setError('माइक्रोफ़ोन तक पहुंच नहीं है। कृपया अनुमतियां जांचें। / Microphone not accessible. Please check permissions.')
            break
          case 'not-allowed':
            setError('माइक्रोफ़ोन की अनुमति नहीं दी गई। कृपया माइक्रोफ़ोन की अनुमति दें। / Microphone permission denied.')
            break
          case 'network':
            setError('नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें। / Network error. Please check your internet connection.')
            break
          default:
            setError('वॉइस पहचान असफल। कृपया फिर से कोशिश करें। / Speech recognition failed. Please try again.')
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
  }, [currentLanguage])

  // Enhanced geocoding function with better error handling
  const geocodeAddress = async (address) => {
    try {
      setIsGeocoding(true)
      console.log('🌍 Geocoding address:', address)
      
      // Try multiple geocoding strategies
      const queries = [
        address,
        `${address}, India`,
        `${address}, Delhi, India`,
        `${address}, New Delhi, India`
      ]
      
      for (const query of queries) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in&addressdetails=1`
        )
        
        if (!response.ok) continue
        
        const data = await response.json()
        
        if (data && data.length > 0) {
          const result = data[0]
          return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            name: result.display_name,
            address: address,
            confidence: result.importance || 0.5
          }
        }
      }
      
      throw new Error('No location found for the given address')
    } catch (error) {
      console.error('🌍 Geocoding error:', error)
      throw error
    } finally {
      setIsGeocoding(false)
    }
  }

  const startListening = () => {
    if (!isSupported || !recognitionRef.current || disabled) return
    
    try {
      setError('')
      setTranscript('')
      setShowConfirmation(false)
      setPendingResult('')
      
      // Update language before starting
      recognitionRef.current.lang = currentLanguage
      recognitionRef.current.start()
      
      // Set timeout to stop recognition after 15 seconds (longer for Hindi)
      const timeout = currentLanguage.includes('hi') ? 20000 : 15000
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop()
          setError('सुनने का समय समाप्त। कृपया फिर से कोशिश करें। / Listening timeout. Please try again.')
        }
      }, timeout)
      
    } catch (error) {
      console.error('🎤 Failed to start recognition:', error)
      setError('वॉइस पहचान शुरू करने में असफल। कृपया फिर से कोशिश करें। / Failed to start voice recognition.')
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
      setTranscript('🌍 स्थान खोजा जा रहा है... / Finding location...')
      
      // Geocode the address
      const locationData = await geocodeAddress(pendingResult)
      
      // Call the callback with the result
      onResult({
        transcript: pendingResult,
        location: locationData,
        success: true,
        language: currentLanguage
      })
      
      setTranscript('')
      setPendingResult('')
      
    } catch (error) {
      console.error('🌍 Location search failed:', error)
      setError('यह स्थान नहीं मिला। कृपया दूसरा पता आज़माएं। / Could not find this location. Please try a different address.')
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

  const handleLanguageChange = (langCode) => {
    setCurrentLanguage(langCode)
    setError('')
    setTranscript('')
    setShowConfirmation(false)
  }

  if (!isSupported) {
    return (
      <div style={{
        padding: '12px 16px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        fontSize: '14px',
        color: '#dc2626',
        textAlign: 'center'
      }}>
        ❌ वॉइस सर्च इस ब्राउज़र में समर्थित नहीं है / Voice search not supported in this browser
        <div style={{ fontSize: '12px', marginTop: '4px', color: '#6b7280' }}>
          Please use Chrome, Edge, or Safari for voice search
        </div>
      </div>
    )
  }

  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0]

  return (
    <div className={className} style={style}>
      {/* Language Selector */}
      {showLanguageSelector && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              style={{
                padding: '6px 12px',
                background: currentLanguage === lang.code ? '#3b82f6' : '#f3f4f6',
                color: currentLanguage === lang.code ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
      )}

      {/* Voice Input Button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={disabled || isGeocoding}
          style={{
            padding: accessibilityMode ? '16px' : '12px',
            background: isListening ? '#ef4444' : isGeocoding ? '#f59e0b' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: accessibilityMode ? '64px' : '48px',
            height: accessibilityMode ? '64px' : '48px',
            cursor: (disabled || isGeocoding) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: accessibilityMode ? '24px' : '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            opacity: (disabled || isGeocoding) ? 0.5 : 1,
            position: 'relative'
          }}
          title={
            isListening ? 'बोलना बंद करें / Stop listening' : 
            isGeocoding ? 'स्थान खोजा जा रहा है / Finding location' :
            'वॉइस सर्च शुरू करें / Start voice search'
          }
        >
          {isGeocoding ? '🌍' : isListening ? '⏹️' : '🎤'}
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
        
        {/* Current language indicator */}
        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          fontWeight: '600'
        }}>
          {currentLang.flag} {currentLang.code.includes('hi') ? 'हिंदी' : 'English'}
        </div>
      </div>

      {/* Transcript Display */}
      {transcript && !showConfirmation && (
        <div style={{
          marginBottom: '12px',
          padding: '12px 16px',
          background: transcript.startsWith('🌍') ? '#fffaf0' : '#f0f9ff',
          border: `1px solid ${transcript.startsWith('🌍') ? '#f5e1a4' : '#bae6fd'}`,
          borderRadius: '12px',
          fontSize: '14px',
          color: transcript.startsWith('🌍') ? '#b45309' : '#0c4a6e',
          textAlign: 'center'
        }}>
          {transcript.startsWith('🌍') ? transcript : `🎤 "${transcript}"`}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && pendingResult && (
        <div style={{
          marginBottom: '12px',
          padding: '16px',
          background: 'white',
          border: '2px solid #3b82f6',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#374151',
            marginBottom: '8px',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {currentLanguage.includes('hi') ? 'क्या आपका मतलब यह था:' : 'Did you mean:'}
          </div>
          <div style={{
            fontSize: '16px',
            color: '#1f2937',
            marginBottom: '16px',
            fontWeight: '700',
            background: '#f9fafb',
            padding: '12px 16px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            "{pendingResult}"
          </div>
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <button
              onClick={handleReject}
              style={{
                padding: '8px 16px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {currentLanguage.includes('hi') ? '❌ नहीं' : '❌ No'}
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: '8px 16px',
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {currentLanguage.includes('hi') ? '✅ हाँ, खोजें' : '✅ Yes, search'}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          marginBottom: '12px',
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          fontSize: '14px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={handleRetry}
            style={{
              padding: '6px 12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 {currentLanguage.includes('hi') ? 'फिर कोशिश करें' : 'Retry'}
          </button>
        </div>
      )}

      {/* Instructions */}
      {!isListening && !transcript && !error && !showConfirmation && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          {currentLanguage.includes('hi') ? (
            <>
              माइक पर क्लिक करें और अपना स्थान बोलें<br />
              <span style={{ fontSize: '11px' }}>उदाहरण: "कनॉट प्लेस दिल्ली" या "इंडिया गेट नई दिल्ली"</span>
            </>
          ) : (
            <>
              Click the mic and speak your location<br />
              <span style={{ fontSize: '11px' }}>Example: "Connaught Place Delhi" or "India Gate New Delhi"</span>
            </>
          )}
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

export default VoiceSearchAdvanced
