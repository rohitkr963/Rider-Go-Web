import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer style={{
      background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
      color: '#fff',
      padding: '60px 0 30px',
      marginTop: '60px'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px'
      }}>
        {/* Main Footer Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 40,
          marginBottom: 40
        }}>
          {/* Company Info */}
          <div>
            <h3 style={{
              fontSize: 24,
              fontWeight: 800,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              🛺 RiderGo
            </h3>
            <p style={{
              color: '#d1d5db',
              lineHeight: 1.6,
              marginBottom: 20
            }}>
              Your trusted ride-sharing partner connecting you with verified auto rickshaw captains across India.
            </p>
            <div style={{
              display: 'flex',
              gap: 12
            }}>
              {['📱', '🌐', '📧', '📞'].map((icon, index) => (
                <div key={index} style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#3b82f6'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(59, 130, 246, 0.1)'
                  e.target.style.transform = 'translateY(0)'
                }}
                >
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 16,
              color: '#f9fafb'
            }}>
              Quick Links
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {[
                { text: 'Home', link: '/user/home' },
                { text: 'Book a Ride', link: '/user/home' },
                { text: 'My Rides', link: '/user/rides' },
                { text: 'Profile', link: '/user/profile' },
                { text: 'Help & Support', link: '/footer' }
              ].map((item, index) => (
                <li key={index} style={{ marginBottom: 8 }}>
                  <Link
                    to={item.link}
                    style={{
                      color: '#d1d5db',
                      textDecoration: 'none',
                      fontSize: 14,
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                    onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
                  >
                    {item.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 16,
              color: '#f9fafb'
            }}>
              Our Services
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {[
                '🛺 Auto Rickshaw Rides',
                '🎤 Voice Search',
                '👥 Group Booking',
                '🗺️ Real-time Tracking',
                '🆘 24/7 Support'
              ].map((service, index) => (
                <li key={index} style={{
                  color: '#d1d5db',
                  fontSize: 14,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 16,
              color: '#f9fafb'
            }}>
              Contact Us
            </h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              {[
                { icon: '📍', text: 'Connaught Place, New Delhi' },
                { icon: '📞', text: '+91 98765 43210' },
                { icon: '📧', text: 'support@ridergo.in' },
                { icon: '🕒', text: '24/7 Available' }
              ].map((contact, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#d1d5db',
                  fontSize: 14
                }}>
                  <span>{contact.icon}</span>
                  <span>{contact.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid #374151',
          paddingTop: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 24,
            marginBottom: 16
          }}>
            {[
              'Privacy Policy',
              'Terms of Service',
              'Cookie Policy',
              'Safety Guidelines',
              'About Us'
            ].map((link, index) => (
              <Link
                key={index}
                to="/footer"
                style={{
                  color: '#9ca3af',
                  textDecoration: 'none',
                  fontSize: 14,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
              >
                {link}
              </Link>
            ))}
          </div>
          
          <div style={{
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 14
          }}>
            <p style={{ margin: 0 }}>
              © 2024 RiderGo. All rights reserved. Made with ❤️ in India
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 12 }}>
              Connecting riders with trusted auto rickshaw captains across India
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
