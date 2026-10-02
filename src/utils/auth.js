const TOKEN_KEY = 'campus_market_token'
const REFRESH_KEY = 'campus_market_refresh_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || ''
}

export function setRefreshToken(token) {
  localStorage.setItem(REFRESH_KEY, token)
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_KEY)
}
