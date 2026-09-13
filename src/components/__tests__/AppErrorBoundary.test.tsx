import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import '../../i18n';
import { AppErrorBoundary } from '../AppErrorBoundary';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('renders a recovery message for the thrown error', () => {
    render(<AppErrorBoundary error={new Error('boom')} retry={jest.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText(/unexpected error/i)).toBeTruthy();
  });

  it('calls retry when the retry button is pressed', () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    render(<AppErrorBoundary error={new Error('boom')} retry={retry} />);

    fireEvent.press(screen.getByText('Retry'));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('navigates home and retries when "Go to Home" is pressed', () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    render(<AppErrorBoundary error={new Error('boom')} retry={retry} />);

    fireEvent.press(screen.getByText('Go to Home'));

    expect(router.replace).toHaveBeenCalledWith('/');
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('logs the error to the console for diagnostics', () => {
    const error = new Error('boom');
    render(<AppErrorBoundary error={error} retry={jest.fn().mockResolvedValue(undefined)} />);

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Resolia'), error);
  });
});
