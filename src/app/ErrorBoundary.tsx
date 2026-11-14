import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CrashScreen } from './CrashScreen';

type Props = { children: ReactNode };
type State = { failed: boolean };

/** Last line of defence: anything that throws outside the router lands here. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render() {
    return this.state.failed ? <CrashScreen /> : this.props.children;
  }
}
