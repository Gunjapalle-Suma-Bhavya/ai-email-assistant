import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Login/LoginPage';
import SignupPage from './pages/Signup/SignupPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import InboxPage from './pages/Inbox/InboxPage';
import EmailDetailsPage from './pages/EmailDetails/EmailDetailsPage';
import DraftsPage from './pages/Drafts/DraftsPage';
import CalendarPage from './pages/Calendar/CalendarPage';
import PreferencesPage from './pages/Preferences/PreferencesPage';
import ProfilePage from './pages/Profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Authenticated SaaS Workspace Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/inbox/:threadId" element={<EmailDetailsPage />} />
              <Route path="/drafts" element={<DraftsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/preferences" element={<PreferencesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
