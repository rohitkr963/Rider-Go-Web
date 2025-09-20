import React, { useState } from 'react'
import VoiceSearchAdvanced from '../components/VoiceSearchAdvanced'

export default function VoiceSearchDemo() {
  const [results, setResults] = useState([])
  const [demoMode, setDemoMode] = useState('normal')

  const handleVoiceResult = (result) => {
    console.log('🎤 Voice search result:', result)
    
    const newResult = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      ...result
    }
    
    setResults(prev => [newResult, ...prev].slice(0, 10)) // Keep last 10 results
    
    if (result.success) {
      alert(`✅ Location found: ${result.transcript}\n📍 ${result.location.name}`)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '16px'
          }}>
            🎤 RiderGo Voice Search
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#6b7280',
            marginBottom: '20px'
          }}>
            Advanced voice recognition with multi-language support for seamless location search
          </p>
          
          {/* Demo Mode Selector */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {[
              { key: 'normal', label: '🎯 Normal Mode', desc: 'Standard voice search' },
              { key: 'accessibility', label: '♿ Accessibility Mode', desc: 'Larger buttons & enhanced UI' },
              { key: 'multilingual', label: '🌍 Multilingual Demo', desc: 'Hindi + English support' }
            ].map(mode => (
              <button
                key={mode.key}
                onClick={() => setDemoMode(mode.key)}
                style={{
                  padding: '12px 20px',
                  background: demoMode === mode.key ? '#3b82f6' : 'white',
                  color: demoMode === mode.key ? 'white' : '#374151',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
                title={mode.desc}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Demo Area */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          alignItems: 'start'
        }}>
          {/* Voice Search Panel */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              🎤 Voice Search Demo
            </h2>
            
            <VoiceSearchAdvanced
              onResult={handleVoiceResult}
              language="en-IN"
              showLanguageSelector={true}
              accessibilityMode={demoMode === 'accessibility'}
              style={{
                background: '#f8fafc',
                padding: '20px',
                borderRadius: '16px',
                border: '2px solid #e5e7eb'
              }}
            />

            {/* Feature Highlights */}
            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: '#f0f9ff',
              borderRadius: '12px',
              border: '1px solid #bae6fd'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#0c4a6e',
                marginBottom: '12px'
              }}>
                ✨ Features
              </h3>
              <ul style={{
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.6',
                paddingLeft: '20px'
              }}>
                <li>🌍 Multi-language support (English & Hindi)</li>
                <li>🎯 Real-time speech recognition</li>
                <li>📍 Automatic geocoding & location mapping</li>
                <li>♿ Accessibility mode for enhanced usability</li>
                <li>🔄 Error handling & retry functionality</li>
                <li>✅ Confirmation dialogs for accuracy</li>
              </ul>
            </div>

            {/* Usage Examples */}
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: '#f0fdf4',
              borderRadius: '12px',
              border: '1px solid #bbf7d0'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#166534',
                marginBottom: '12px'
              }}>
                💡 Try These Examples
              </h3>
              <div style={{
                display: 'grid',
                gap: '8px',
                fontSize: '14px',
                color: '#374151'
              }}>
                <div><strong>English:</strong> "Connaught Place Delhi", "India Gate New Delhi"</div>
                <div><strong>Hindi:</strong> "कनॉट प्लेस दिल्ली", "इंडिया गेट नई दिल्ली"</div>
                <div><strong>Mixed:</strong> "Red Fort Delhi", "Lotus Temple"</div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            maxHeight: '600px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                📊 Search Results
              </h2>
              <button
                onClick={clearResults}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🗑️ Clear
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '10px'
            }}>
              {results.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '16px',
                  padding: '40px 20px'
                }}>
                  🎤 Start speaking to see results here!
                </div>
              ) : (
                results.map(result => (
                  <div
                    key={result.id}
                    style={{
                      padding: '16px',
                      background: result.success ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: '12px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: result.success ? '#166534' : '#dc2626'
                      }}>
                        {result.success ? '✅ Success' : '❌ Failed'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {result.timestamp}
                      </div>
                    </div>
                    
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '8px'
                    }}>
                      🎤 "{result.transcript}"
                    </div>
                    
                    {result.success && result.location && (
                      <div style={{
                        fontSize: '14px',
                        color: '#374151',
                        background: 'rgba(255,255,255,0.7)',
                        padding: '8px 12px',
                        borderRadius: '8px'
                      }}>
                        <div><strong>📍 Location:</strong> {result.location.name}</div>
                        <div><strong>🌐 Coordinates:</strong> {result.location.lat.toFixed(4)}, {result.location.lng.toFixed(4)}</div>
                        {result.language && (
                          <div><strong>🗣️ Language:</strong> {result.language}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Technical Info */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          marginTop: '30px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            🔧 Technical Implementation
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                🎤 Speech Recognition
              </h3>
              <ul style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                <li>Web Speech API integration</li>
                <li>Real-time transcript processing</li>
                <li>Multi-language support (en-IN, hi-IN)</li>
                <li>Error handling & fallbacks</li>
              </ul>
            </div>
            
            <div style={{
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                🌍 Geocoding
              </h3>
              <ul style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                <li>OpenStreetMap Nominatim API</li>
                <li>Multiple query strategies</li>
                <li>India-focused location search</li>
                <li>Coordinate & address mapping</li>
              </ul>
            </div>
            
            <div style={{
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                ♿ Accessibility
              </h3>
              <ul style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                <li>Large button mode for easier access</li>
                <li>Clear visual feedback</li>
                <li>Bilingual error messages</li>
                <li>Keyboard navigation support</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div style={{
          textAlign: 'center',
          marginTop: '30px'
        }}>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/user/home')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
            style={{
              padding: '16px 32px',
              background: 'white',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            🏠 Back to RiderGo Home
          </button>
        </div>
      </div>
    </div>
  )
}
