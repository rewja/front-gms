import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, setupMocks, cleanupMocks } from '../../utils/testUtils';
import NotificationProvider, { useNotification } from '../../components/NotificationSystem';

// Test component that uses the notification system
const TestComponent = () => {
  const { success, error, warning, info, addNotification } = useNotification();

  return (
    <div>
      <button onClick={() => success('Success message')}>Show Success</button>
      <button onClick={() => error('Error message')}>Show Error</button>
      <button onClick={() => warning('Warning message')}>Show Warning</button>
      <button onClick={() => info('Info message')}>Show Info</button>
      <button onClick={() => addNotification({ 
        type: 'custom', 
        title: 'Custom', 
        message: 'Custom message',
        duration: 0 
      })}>Show Custom</button>
    </div>
  );
};

describe('NotificationSystem', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  it('renders notification provider without crashing', () => {
    renderWithProviders(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
  });

  it('shows success notification when success is called', async () => {
    renderWithProviders(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  it('shows error notification when error is called', async () => {
    renderWithProviders(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('shows warning notification when warning is called', async () => {
    renderWithProviders(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    await waitFor(() => {
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  it('shows info notification when info is called', async () => {
    renderWithProviders(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    await waitFor(() => {
      expect(screen.getByText('Information')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  it('shows custom notification when addNotification is called', async () => {
    renderWithProviders(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Custom'));

    await waitFor(() => {
      expect(screen.getByText('Custom')).toBeInTheDocument();
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });
  });

  it('removes notification when close button is clicked', async () => {
    renderWithProviders(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('auto-removes notification after duration', async () => {
    jest.useFakeTimers();

    renderWithProviders(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('does not auto-remove notification with duration 0', async () => {
    jest.useFakeTimers();

    renderWithProviders(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Custom'));

    await waitFor(() => {
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});



