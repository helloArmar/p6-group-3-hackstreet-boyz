import { useCallback, useEffect, useState } from 'react';

// Every list screen needs the same three states and a way to refetch after a
// mutation. `deps` re-runs the fetch when a filter changes.
export default function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    run()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [run]);

  useEffect(load, [load]);

  // setData is exposed for callers that get live updates pushed to them
  // (e.g. a socket event) and want to merge them in without a re-fetch.
  return { data, error, loading, refetch: load, setData };
}
