import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  // Agar user logged in nahi hai, toh login page par bhej do
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Agar logged in hai, toh page access karne do
  return children;
}