import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export const Route = createFileRoute('/demo/mock')({
  component: RouteComponent,
});

function RouteComponent() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ts: Date.now() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data ? JSON.stringify(data) : `status: ${res.status}`);
      }
      return data ?? { status: res.status };
    },
    onMutate: () => {
      setError(null);
      setResult(null);
    },
    onSuccess: (data) => {
      setResult(JSON.stringify(data));
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    },
  });

  function handleRequest() {
    mutation.mutate();
  }

  return (
    <div>
      <button
        aria-label="request"
        onClick={handleRequest}
        disabled={mutation.isPending}
        className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-green-700 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {mutation.isPending ? 'Requesting...' : 'Request'}
      </button>

      {result && <pre className="mt-3 p-3 bg-gray-800 text-sm text-white rounded">{result}</pre>}
      {error && <div className="mt-3 text-sm text-red-400">Error: {error}</div>}
    </div>
  );
}
