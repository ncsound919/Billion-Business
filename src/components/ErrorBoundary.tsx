import React, { useState, useEffect, ReactNode, ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | undefined>();

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
      console.error("ErrorBoundary caught an error:", event.error);
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-800 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
          <p className="text-slate-300 mb-6">
            We're sorry for the inconvenience. Please try again or contact support if the problem persists.
          </p>
          {fallback || (
            <div className="bg-slate-700 p-4 rounded-lg text-sm text-slate-300">
              <p className="font-medium">Error details:</p>
              <p className="mt-2">{error?.message}</p>
              {errorInfo?.componentStack && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-slate-400">Technical details</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-yellow-400 text-slate-900 py-2 px-4 rounded-lg font-medium hover:bg-yellow-300 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}