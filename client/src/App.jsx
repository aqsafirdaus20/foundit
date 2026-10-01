import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import ItemDetailPage from './pages/ItemDetailPage'
import ClaimFormPage from './pages/ClaimFormPage'
import MyClaimsPage from './pages/MyClaimsPage'
import AdminItemsPage from './pages/AdminItemsPage'
import AdminItemFormPage from './pages/AdminItemFormPage'
import AdminClaimsPage from './pages/AdminClaimsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search/:id"
            element={
              <ProtectedRoute>
                <ItemDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/claim/:id"
            element={
              <ProtectedRoute>
                <ClaimFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-claims"
            element={
              <ProtectedRoute>
                <MyClaimsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/items"
            element={
              <ProtectedRoute adminOnly>
                <AdminItemsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/items/new"
            element={
              <ProtectedRoute adminOnly>
                <AdminItemFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/items/:id"
            element={
              <ProtectedRoute adminOnly>
                <AdminItemFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/claims"
            element={
              <ProtectedRoute adminOnly>
                <AdminClaimsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
