import { createFileRoute } from '@tanstack/react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

export const Route = createFileRoute('/demo/infinite-scroll')({
  component: InfiniteScrollDemo,
});

// Mock data generator
const fetchPosts = async ({ pageParam = 0 }) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const pageSize = 10;
  const totalPosts = 50;

  const posts = Array.from({ length: pageSize })
    .map((_, i) => {
      const id = pageParam * pageSize + i;
      return {
        id,
        title: `Post #${id + 1}`,
        description: `This is the description for post number ${id + 1}. It contains some placeholder text for the infinite scroll demo.`,
      };
    })
    .filter((post) => post.id < totalPosts);

  return {
    posts,
    nextPage: pageParam < 4 ? pageParam + 1 : undefined,
  };
};

function InfiniteScrollDemo() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: ['infinite-posts'],
    queryFn: fetchPosts,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 1.0 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8">
      <div className="page-wrap max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--sea-ink)] mb-2">Infinite Scroll Demo</h1>
          <p className="text-[var(--sea-ink-soft)]">
            A simple implementation of infinite scrolling using TanStack Query and Intersection
            Observer.
          </p>
        </header>

        {status === 'pending' ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--sea-ink)]" />
          </div>
        ) : status === 'error' ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">
            Error loading data. Please try again.
          </div>
        ) : (
          <div className="space-y-4">
            {data?.pages.map((page, pageIndex) => (
              <div key={pageIndex} className="space-y-4">
                {page.posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-6 rounded-xl border border-[var(--line)] bg-[var(--background)] shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h2 className="text-xl font-semibold text-[var(--sea-ink)] mb-2">
                      {post.title}
                    </h2>
                    <p className="text-[var(--sea-ink-soft)]">{post.description}</p>
                  </div>
                ))}
              </div>
            ))}

            <div ref={loadMoreRef} className="flex justify-center p-8">
              {isFetchingNextPage ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--sea-ink)]" />
              ) : hasNextPage ? (
                <span className="text-[var(--sea-ink-soft)]">Scroll down to load more...</span>
              ) : (
                <span className="text-[var(--sea-ink-soft)]">No more posts to load.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
