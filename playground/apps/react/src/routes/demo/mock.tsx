import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export const Route = createFileRoute('/demo/mock')({
  component: RouteComponent,
});

async function requestMock(endpoint: string) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ts: Date.now() }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data ? JSON.stringify(data) : `status: ${res.status}`);
  }
  return data ?? { status: res.status };
}

function RouteComponent() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mswMutation = useMutation({
    mutationFn: () => requestMock('/api/mock'),
    onMutate: () => {
      setError(null);
      setResult(null);
    },
    onSuccess: (data) => {
      setResult(JSON.stringify(data, null, 2));
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    },
  });

  const proxyMutation = useMutation({
    mutationFn: () => requestMock('/api/mockoon'),
    onMutate: () => {
      setError(null);
      setResult(null);
    },
    onSuccess: (data) => {
      setResult(JSON.stringify(data, null, 2));
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    },
  });

  const isPending = mswMutation.isPending || proxyMutation.isPending;
  const handleMswRequest = useCallback(() => {
    mswMutation.mutate();
  }, [mswMutation]);
  const handleProxyRequest = useCallback(() => {
    proxyMutation.mutate();
  }, [proxyMutation]);

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          aria-label="request msw mock"
          onClick={handleMswRequest}
          disabled={isPending}
          className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-green-700 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {mswMutation.isPending ? 'Requesting...' : 'Request MSW'}
        </button>

        <button
          aria-label="request whistle mockoon"
          onClick={handleProxyRequest}
          disabled={isPending}
          className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-blue-700 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {proxyMutation.isPending ? 'Requesting...' : 'Request Whistle + Mockoon'}
        </button>
      </div>

      {result && <pre className="mt-3 p-3 bg-gray-800 text-sm text-white rounded">{result}</pre>}
      {error && <div className="mt-3 text-sm text-red-400">Error: {error}</div>}
    </div>
  );
}
