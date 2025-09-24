import React from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

const FooterPage = () => {
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
        color: '#fff',
        padding: '60px 0'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: 48,
            fontWeight: 800,
            marginBottom: 16,
            margin: 0
          }}>
            🛺 RiderGo
          </h1>
          <p style={{
            fontSize: 20,
            opacity: 0.9,
            maxWidth: 600,
            margin: '16px auto 0'
          }}>
            Your trusted ride-sharing partner connecting you with verified auto rickshaw captains across India
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '60px 24px'
      }}>
        {/* Company Information */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 40,
          marginBottom: 60
        }}>
          <div style={{
            background: '#f8fafc',
            borderRadius: 16,
            padding: 32,
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              🏢 About RiderGo
            </h2>
            <p style={{
              color: '#6b7280',
              lineHeight: 1.6,
              marginBottom: 20
            }}>
              RiderGo is India's leading ride-sharing platform that connects passengers with verified auto rickshaw captains. We're committed to providing safe, affordable, and convenient transportation solutions across Indian cities.
            </p>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {[
                'Founded in 2024',
                'Serving 10+ cities',
                '1000+ happy riders',
                '500+ verified captains',
                '24/7 customer support'
              ].map((item, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                  color: '#374151',
                  fontSize: 14
                }}>
                  <span style={{ color: '#10b981' }}>✅</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            background: '#f8fafc',
            borderRadius: 16,
            padding: 32,
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              🎯 Our Mission
            </h2>
            <p style={{
              color: '#6b7280',
              lineHeight: 1.6,
              marginBottom: 20
            }}>
              To revolutionize urban transportation in India by making auto rickshaw rides more accessible, transparent, and technology-driven while empowering drivers with better earning opportunities.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 16
            }}>
              {[
                { icon: '🚀', text: 'Innovation' },
                { icon: '🛡️', text: 'Safety' },
                { icon: '💰', text: 'Affordability' },
                { icon: '🤝', text: 'Trust' }
              ].map((value, index) => (
                <div key={index} style={{
                  textAlign: 'center',
                  padding: 16,
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{value.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{value.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 800,
            color: '#111',
            marginBottom: 32,
            textAlign: 'center'
          }}>
            🛺 Our Services
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24
          }}>
            {[
              {
                icon: '🛺',
                title: 'Auto Rickshaw Rides',
                desc: 'Book verified auto rickshaws with transparent pricing and real-time tracking',
                features: ['Instant booking', 'Live tracking', 'Verified drivers', 'Fair pricing']
              },
              {
                icon: '🎤',
                title: 'Voice Search',
                desc: 'Speak your destination in English or Hindi - no need to type long addresses',
                features: ['Multi-language', 'Accurate recognition', 'Quick booking', 'Hands-free']
              },
              {
                icon: '👥',
                title: 'Group Booking',
                desc: 'Book multiple seats for your family or friends in the same auto rickshaw',
                features: ['Up to 3 passengers', 'Shared rides', 'Cost effective', 'Group travel']
              },
              {
                icon: '🗺️',
                title: 'Real-time Tracking',
                desc: 'Track your captain\'s location in real-time with accurate arrival estimates',
                features: ['Live GPS', 'ETA updates', 'Route optimization', 'Safety alerts']
              },
              {
                icon: '🆘',
                title: '24/7 Support',
                desc: 'Round-the-clock customer support and emergency assistance for all users',
                features: ['Emergency button', 'Live chat', 'Phone support', 'Quick response']
              },
              {
                icon: '💳',
                title: 'Secure Payments',
                desc: 'Multiple payment options with secure transactions and transparent billing',
                features: ['Cash payments', 'Digital wallet', 'No hidden charges', 'Instant receipts']
              }
            ].map((service, index) => (
              <div key={index} style={{
                background: '#fff',
                borderRadius: 16,
                padding: 24,
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
              }}
              >
                <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>
                  {service.icon}
                </div>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#111',
                  marginBottom: 12,
                  textAlign: 'center'
                }}>
                  {service.title}
                </h3>
                <p style={{
                  color: '#6b7280',
                  lineHeight: 1.6,
                  marginBottom: 16,
                  textAlign: 'center'
                }}>
                  {service.desc}
                </p>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  {service.features.map((feature, idx) => (
                    <li key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                      color: '#374151',
                      fontSize: 14
                    }}>
                      <span style={{ color: '#10b981', fontSize: 12 }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%)',
          borderRadius: 20,
          padding: 40,
          marginBottom: 60
        }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 800,
            color: '#111',
            marginBottom: 32,
            textAlign: 'center'
          }}>
            📞 Get in Touch
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 24
          }}>
            {[
              {
                icon: '📍',
                title: 'Our Office',
                content: 'Connaught Place, New Delhi, India - 110001',
                action: 'Get Directions'
              },
              {
                icon: '📞',
                title: 'Call Us',
                content: '+91 98765 43210',
                action: 'Call Now'
              },
              {
                icon: '📧',
                title: 'Email Us',
                content: 'support@ridergo.in',
                action: 'Send Email'
              },
              {
                icon: '💬',
                title: 'Live Chat',
                content: 'Available 24/7 for instant support',
                action: 'Start Chat'
              }
            ].map((contact, index) => (
              <div key={index} style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  width: 60,
                  height: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  margin: '0 auto 16px'
                }}>
                  {contact.icon}
                </div>
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#111',
                  marginBottom: 8
                }}>
                  {contact.title}
                </h3>
                <p style={{
                  color: '#6b7280',
                  marginBottom: 16,
                  fontSize: 14
                }}>
                  {contact.content}
                </p>
                <button
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => alert(`${contact.action} feature coming soon!`)}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#2563eb'
                    e.target.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#3b82f6'
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  {contact.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Back to Home */}
        <div style={{
          textAlign: 'center',
          marginBottom: 40
        }}>
          <Link
            to="/user/home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = 'none'
            }}
          >
            🏠 Back to Home
          </Link>
        </div>
      </div>

      {/* Footer Component */}
      <Footer />
    </div>
  )
}

export default FooterPage
