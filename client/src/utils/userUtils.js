// Utility functions for user management

// Generate unique user ID if not exists
export const getUserId = () => {
  let userId = localStorage.getItem('userId')
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('userId', userId)
    console.log('🆔 Generated new unique userId:', userId)
  }
  return userId
}

// Get user email
export const getUserEmail = () => {
  return localStorage.getItem('userEmail') || 'user@example.com'
}

// Get user name
export const getUserName = () => {
  return localStorage.getItem('userName') || 'User'
}

// Clear user data
export const clearUserData = () => {
  localStorage.removeItem('userId')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userName')
  localStorage.removeItem('token')
  localStorage.removeItem('user_acceptedRides')
  console.log('🧹 Cleared all user data')
}
