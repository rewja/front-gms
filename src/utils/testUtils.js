// Test utilities for GMS application
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import NotificationProvider from '../components/NotificationSystem';
import ErrorBoundary from '../components/ErrorBoundary';

// Mock API responses
export const mockApiResponses = {
  todos: {
    success: {
      data: [
        {
          id: 1,
          title: 'Test Todo',
          description: 'Test Description',
          status: 'not_started',
          priority: 'medium',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          user_id: 1,
          user: { name: 'Test User', email: 'test@example.com' }
        }
      ]
    },
    empty: { data: [] },
    error: { message: 'Failed to load todos' }
  },
  users: {
    success: {
      data: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
          category: 'all'
        }
      ]
    }
  },
  requests: {
    success: {
      data: [
        {
          id: 1,
          item_name: 'Test Item',
          description: 'Test Description',
          status: 'pending',
          category: 'office',
          quantity: 1,
          estimated_cost: 100,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]
    }
  }
};

// Mock user data
export const mockUsers = {
  admin_ga: {
    id: 1,
    name: 'Admin GA',
    email: 'admin@example.com',
    role: 'admin_ga',
    category: 'all'
  },
  user: {
    id: 2,
    name: 'Regular User',
    email: 'user@example.com',
    role: 'user',
    category: 'ob'
  },
  procurement: {
    id: 3,
    name: 'Procurement User',
    email: 'procurement@example.com',
    role: 'procurement',
    category: 'all'
  }
};

// Custom render function with all providers
export const renderWithProviders = (
  ui,
  {
    user = mockUsers.user,
    theme = 'light',
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              {children}
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock API functions
export const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn()
};

// Mock localStorage
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock window.confirm
export const mockConfirm = (returnValue = true) => {
  window.confirm = jest.fn(() => returnValue);
};

// Mock window.alert
export const mockAlert = () => {
  window.alert = jest.fn();
};

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));
};

// Test data generators
export const generateTodos = (count = 5) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `Todo ${index + 1}`,
    description: `Description for todo ${index + 1}`,
    status: ['not_started', 'in_progress', 'completed'][index % 3],
    priority: ['low', 'medium', 'high'][index % 3],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 1,
    user: { name: 'Test User', email: 'test@example.com' }
  }));
};

export const generateUsers = (count = 5) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    role: ['admin_ga', 'user', 'procurement'][index % 3],
    category: ['all', 'ob', 'driver', 'security'][index % 4]
  }));
};

export const generateRequests = (count = 5) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    item_name: `Item ${index + 1}`,
    description: `Description for item ${index + 1}`,
    status: ['pending', 'approved', 'rejected'][index % 3],
    category: ['office', 'it', 'furniture'][index % 3],
    quantity: Math.floor(Math.random() * 10) + 1,
    estimated_cost: Math.floor(Math.random() * 1000) + 100,
    created_at: new Date().toISOString()
  }));
};

// Common test helpers
export const waitForLoadingToFinish = () => {
  return waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

export const expectElementToBeInDocument = (text) => {
  expect(screen.getByText(text)).toBeInTheDocument();
};

export const expectElementNotToBeInDocument = (text) => {
  expect(screen.queryByText(text)).not.toBeInTheDocument();
};

export const clickButton = (text) => {
  fireEvent.click(screen.getByText(text));
};

export const typeInInput = (placeholder, text) => {
  const input = screen.getByPlaceholderText(placeholder);
  fireEvent.change(input, { target: { value: text } });
};

export const selectOption = (selectElement, optionText) => {
  fireEvent.change(selectElement, { target: { value: optionText } });
};

// Mock file upload
export const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Mock FormData
export const mockFormData = () => {
  const formData = new FormData();
  formData.append = jest.fn();
  formData.get = jest.fn();
  formData.has = jest.fn();
  formData.delete = jest.fn();
  formData.set = jest.fn();
  formData.entries = jest.fn();
  formData.keys = jest.fn();
  formData.values = jest.fn();
  return formData;
};

// Setup mocks for all tests
export const setupMocks = () => {
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });

  // Mock window.confirm
  mockConfirm();

  // Mock window.alert
  mockAlert();

  // Mock IntersectionObserver
  mockIntersectionObserver();

  // Mock ResizeObserver
  mockResizeObserver();

  // Mock FormData
  global.FormData = jest.fn(() => mockFormData());
};

// Cleanup after tests
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};

export default {
  renderWithProviders,
  mockApiResponses,
  mockUsers,
  mockApi,
  mockLocalStorage,
  mockConfirm,
  mockAlert,
  mockIntersectionObserver,
  mockResizeObserver,
  generateTodos,
  generateUsers,
  generateRequests,
  waitForLoadingToFinish,
  expectElementToBeInDocument,
  expectElementNotToBeInDocument,
  clickButton,
  typeInInput,
  selectOption,
  createMockFile,
  mockFormData,
  setupMocks,
  cleanupMocks
};



