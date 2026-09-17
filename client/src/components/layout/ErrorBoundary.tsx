import { Component, type ErrorInfo, type ReactNode } from 'react';
import { leaveCurrentRoom } from '../../hooks/useSocket';
import { Button } from '../ui/Button';
import { FullPageStatus } from './FullPageStatus';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches render crashes anywhere in the app and offers a way back home. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private handleBackHome = (): void => {
    try {
      leaveCurrentRoom();
    } finally {
      // A full navigation guarantees a clean render tree after the crash.
      window.location.assign('/');
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <FullPageStatus
        emoji="🙈"
        title="Something went wrong — go back home"
        message="The game hit an unexpected error. Your progress in this room can't be recovered from here."
      >
        <Button onClick={this.handleBackHome} className="px-8">
          🏠 Back to Home
        </Button>
      </FullPageStatus>
    );
  }
}
