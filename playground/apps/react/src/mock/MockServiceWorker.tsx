import { useEffect } from 'react';

export function MockServiceWorker() {
  useEffect(() => {
    // if (!import.meta.env.DEV) {
    //   return;
    // }
    // void import('./browser').then(({ worker }) => {
    //   return worker.start({
    //     onUnhandledRequest: 'bypass',
    //   });
    // });
  }, []);

  return null;
}
