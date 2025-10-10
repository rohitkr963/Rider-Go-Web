import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer style={{
      background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
      color: '#fff',
      padding: '40px 0 20px',
      marginTop: '40px'
    }} className="footer-responsive">
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 16px'
      }} className="footer-container">
        {/* Main Footer Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 40,
          marginBottom: 40
        }} className="footer-grid">
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
            }} className="footer-social-icons">
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
        }} className="footer-bottom">
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 24,
            marginBottom: 16
          }} className="footer-links">
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

      {/* Responsive CSS Styles */}
      <style>{`
        /* Mobile-first responsive styles */
        @media (max-width: 640px) {
          .footer-responsive {
            padding: 24px 0 16px !important;
            margin-top: 24px !important;
          }
          
          .footer-container {
            padding: 0 12px !important;
          }
          
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
            margin-bottom: 24px !important;
          }
          
          .footer-social-icons {
            justify-content: center !important;
            gap: 8px !important;
          }
          
          .footer-bottom {
            padding-top: 20px !important;
            gap: 12px !important;
          }
          
          .footer-links {
            gap: 16px !important;
            margin-bottom: 12px !important;
            text-align: center !important;
          }
          
          .footer-links a {
            font-size: 13px !important;
          }
          
          /* Company section mobile */
          .footer-grid > div:first-child h3 {
            font-size: 20px !important;
            justify-content: center !important;
            text-align: center !important;
          }
          
          .footer-grid > div:first-child p {
            text-align: center !important;
            font-size: 14px !important;
            margin-bottom: 16px !important;
          }
          
          /* Section headers mobile */
          .footer-grid > div h4 {
            font-size: 16px !important;
            text-align: center !important;
            margin-bottom: 12px !important;
          }
          
          /* Lists mobile */
          .footer-grid > div ul {
            text-align: center !important;
          }
          
          .footer-grid > div ul li {
            margin-bottom: 6px !important;
            font-size: 13px !important;
          }
          
          /* Contact section mobile */
          .footer-grid > div:last-child > div {
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
          }
          
          .footer-grid > div:last-child > div > div {
            justify-content: center !important;
            font-size: 13px !important;
          }
        }
        
        @media (max-width: 768px) {
          .footer-responsive {
            padding: 32px 0 20px !important;
            margin-top: 32px !important;
          }
          
          .footer-container {
            padding: 0 16px !important;
          }
          
          .footer-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 28px !important;
          }
          
          .footer-links {
            gap: 20px !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1023px) {
          .footer-responsive {
            padding: 48px 0 24px !important;
          }
          
          .footer-container {
            padding: 0 20px !important;
          }
          
          .footer-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 32px !important;
          }
        }
        
        @media (min-width: 1024px) {
          .footer-responsive {
            padding: 60px 0 30px !important;
            margin-top: 60px !important;
          }
          
          .footer-container {
            padding: 0 24px !important;
          }
          
          .footer-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 40px !important;
            margin-bottom: 40px !important;
          }
        }
        
        /* Hover effects for mobile */
        @media (hover: none) {
          .footer-social-icons > div:hover {
            transform: none !important;
          }
        }
        
        /* Additional mobile improvements */
        @media (max-width: 480px) {
          .footer-responsive {
            padding: 20px 0 12px !important;
          }
          
          .footer-grid {
            gap: 20px !important;
          }
          
          .footer-social-icons > div {
            width: 36px !important;
            height: 36px !important;
          }
          
          .footer-links {
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .footer-bottom > div:last-child p {
            font-size: 12px !important;
          }
        }
      `}</style>
    </footer>
  )
}

export default Footer
