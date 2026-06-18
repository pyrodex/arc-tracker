import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-arc-bg flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-red-900/20 border border-red-500/30 rounded-xl p-6">
            <h1 className="text-red-400 font-bold text-lg mb-2">Something went wrong</h1>
            <pre className="text-red-300/80 text-xs overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 btn-primary"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
