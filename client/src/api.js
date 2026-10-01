import axios from 'axios'

// Relative baseURL: the Vite dev server proxies /api to the backend (see vite.config.js),
// so this works in dev without CORS, and withCredentials keeps the session cookie flowing.
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})
