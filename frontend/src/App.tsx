import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import VideoPlayerPage from './pages/VideoPlayerPage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminVideoEditPage from './pages/AdminVideoEditPage';
import UserLoginPage from './pages/UserLoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import WatchHistoryPage from './pages/WatchHistoryPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ApiInterceptor } from '@/components/ApiInterceptor';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ApiInterceptor />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/video/:videoId" element={<VideoPlayerPage />} />
          <Route path="/video/:videoId/:episodeId" element={<VideoPlayerPage />} />
          <Route path="/login" element={<UserLoginPage />} />
          <Route path="/login/callback" element={<OAuthCallbackPage />} />
          <Route path="/history" element={<WatchHistoryPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/edit/:videoId" element={<AdminVideoEditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
