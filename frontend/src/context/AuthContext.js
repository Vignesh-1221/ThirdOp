import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';  // Updated import syntax

// Create the context
export const AuthContext = createContext();

// Create a custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Add this line

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkLoggedIn = async () => {
      if (token) {
        try {
          // First validate the token format before making API call
          if (token.split('.').length !== 3) {
            // Invalid token format, clear it
            console.log('Invalid token format, clearing token');
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
          
          // Try to decode the token locally first
          try {
            const decoded = jwtDecode(token);
            // Check if token is expired
            const currentTime = Date.now() / 1000;
            if (decoded.exp && decoded.exp < currentTime) {
              console.log('Token expired, clearing token');
              localStorage.removeItem('token');
              setToken(null);
              setUser(null);
              setIsAuthenticated(false);
              setLoading(false);
              return;
            }
            
            // If we can decode the token, set the user from the decoded data
            // This allows the app to work even if the backend is not available
            setUser({
              id: decoded.id || decoded.userId || decoded.sub,
              name: decoded.name || 'User',
              email: decoded.email || ''
            });
            setIsAuthenticated(true);
            
          } catch (decodeError) {
            console.log('Token decode error:', decodeError);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
          
          // Skip backend verification if we're in development mode and know the endpoint doesn't exist
          // This allows the app to work without a backend during development
          if (process.env.NODE_ENV === 'development') {
            console.log('Development mode: Skipping backend verification');
            setLoading(false);
            return;
          }
          
          try {
            // Verify token with backend (but don't fail if backend is unavailable)
            const response = await axios.get('/api/auth/user', {
              headers: { Authorization: `Bearer ${token}` }
            });
            // If we get a successful response, update the user data
            setUser(response.data);
            setIsAuthenticated(true);
          } catch (err) {
            console.log('Auth verification error:', err);
            // Don't clear the token if it's just a 404 error (backend route not found)
            if (err.response && err.response.status !== 404) {
              localStorage.removeItem('token');
              setToken(null);
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        } catch (err) {
          console.log('Auth verification error:', err);
          // Don't clear token on network errors in development
          if (process.env.NODE_ENV !== 'development') {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
      setLoading(false);
    };
  
    checkLoggedIn();
  }, [token]);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      setError(null);
      let response;
      
      // Try different endpoints that might be used by your backend
      try {
        response = await axios.post('/api/auth/signup', { name, email, password });
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // If signup endpoint not found, try register endpoint
          response = await axios.post('/api/auth/register', { name, email, password });
        } else {
          // Re-throw the error if it's not a 404
          throw err;
        }
      }
      
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Registration error:', err);
      
      // Provide more specific error messages based on the error
      if (err.response) {
        if (err.response.status === 404) {
          setError('Registration endpoint not found. Please check if the backend server is running.');
        } else if (err.response.status === 400) {
          setError(err.response.data.message || 'Invalid registration data.');
        } else if (err.response.status === 409) {
          setError('Email already exists. Please use a different email.');
        } else {
          setError(err.response.data.message || 'Registration failed');
        }
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('Registration failed: ' + err.message);
      }
      
      return { 
        success: false, 
        message: err.response?.data?.message || 'Registration failed. Please check if the backend server is running.'
      };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Context value
  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};