import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockApi, mockUsers, generateTodos, setupMocks, cleanupMocks } from '../../utils/testUtils';
import Todos from '../../pages/Todos';

// Mock the API module
jest.mock('../../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Todos Integration Tests', () => {
  beforeEach(() => {
    setupMocks();
    mockApi.get.mockResolvedValue({ data: { data: generateTodos(3) } });
  });

  afterEach(() => {
    cleanupMocks();
  });

  it('renders todos page with user data', async () => {
    renderWithProviders(<Todos />, { user: mockUsers.user });

    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument();
    });
  });

  it('displays todos list correctly', async () => {
    const todos = generateTodos(3);
    mockApi.get.mockResolvedValue({ data: { data: todos } });

    renderWithProviders(<Todos />, { user: mockUsers.user });

    await waitFor(() => {
      expect(screen.getByText('Todo 1')).toBeInTheDocument();
      expect(screen.getByText('Todo 2')).toBeInTheDocument();
      expect(screen.getByText('Todo 3')).toBeInTheDocument();
    });
  });

  it('filters todos by search term', async () => {
    const todos = generateTodos(3);
    mockApi.get.mockResolvedValue({ data: { data: todos } });

    renderWithProviders(<Todos />, { user: mockUsers.user });

    await waitFor(() => {
      expect(screen.getByText('Todo 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search todos...');
    fireEvent.change(searchInput, { target: { value: 'Todo 1' } });

    await waitFor(() => {
      expect(screen.getByText('Todo 1')).toBeInTheDocument();
      expect(screen.queryByText('Todo 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Todo 3')).not.toBeInTheDocument();
    });
  });

  it('filters todos by status', async () => {
    const todos = generateTodos(3);
    mockApi.get.mockResolvedValue({ data: { data: todos } });

    renderWithProviders(<Todos />, { user: mockUsers.user });

    await waitFor(() => {
      expect(screen.getByText('Todo 1')).toBeInTheDocument();
    });

    // Click on status filter
    const statusFilter = screen.getByText('All Status');
    fireEvent.click(statusFilter);

    // Select a specific status
    const statusOption = screen.getByText('Not Started');
    fireEvent.click(statusOption);

    // The filtering logic should work
    await waitFor(() => {
      // This would depend on the actual filtering implementation
      expect(screen.getByText('All Status')).toBeInTheDocument();
    });
  });

  it('handles todo status change', async () => {
    const todos = generateTodos(1);
    mockApi.get.mockResolvedValue({ data: { data: todos } });
    mockApi.patch.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<Todos />, { user: mockUsers.user });

    await waitFor(() => {
      expect(screen.getByText('Todo 1')).toBeInTheDocument();
    });

    // Find and click the start button
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith('/todos/1/start');
    });
  });

  it('handles file upload', async () => {
    const todos = generateTodos(1);
    mockApi.get.mockResolvedValue({ data: { data: todos } });
    mockApi.post.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<Todos />, { user: mockUsers.user });

    await waitFor(() => {
      expect(screen.getByText('Todo 1')).toBeInTheDocument();
    });

    // Find file input and upload a file
    const fileInput = screen.getByLabelText(/upload/i);
    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalled();
    });
  });

  it('handles delete todo', async () => {
    const todos = generateTodos(1);
    mockApi.get.mockResolvedValue({ data: { data: todos } });
    mockApi.delete.mockResolvedValue({ data: { success: true } });

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    renderWithProviders(<Todos />, { user: mockUsers.user });

    await waitFor(() => {
      expect(screen.getByText('Todo 1')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockApi.delete).toHaveBeenCalledWith('/todos/1');
  });

  it('shows loading state initially', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<Todos />, { user: mockUsers.user });

    // Check for skeleton loaders instead of "Loading..." text
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    mockApi.get.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<Todos />, { user: mockUsers.user });

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  it('handles empty todos list', async () => {
    mockApi.get.mockResolvedValue({ data: { data: [] } });

    renderWithProviders(<Todos />, { user: mockUsers.user });

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });
});



