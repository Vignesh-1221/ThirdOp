import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Appointments from './pages/Appointments';
import UploadReport from './pages/UploadReport';
import ReportDetail from './pages/ReportDetail';
import Profile from './pages/Profile';
import ThirdOp from './pages/ThirdOp';
import AnyReportAnalysisResult from './pages/AnyReportAnalysisResult';
import NotFound from './pages/NotFound';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/doctors" 
              element={
                <PrivateRoute>
                  <Doctors />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/appointments" 
              element={
                <PrivateRoute>
                  <Appointments />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/upload-report" 
              element={
                <PrivateRoute>
                  <UploadReport />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/reports/:id" 
              element={
                <PrivateRoute>
                  <ReportDetail />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/thirdop/:id" 
              element={
                <PrivateRoute>
                  <ThirdOp />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/any-report-analysis/:reportId" 
              element={
                <PrivateRoute>
                  <AnyReportAnalysisResult />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
