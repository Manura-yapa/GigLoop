import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function UserReviews({ userId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchReviews() {
      try {
        const response = await api.get(`/reviews/user/${userId}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setReviews(response.data);
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.error || 'Failed to load received reviews.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchReviews();

    return () => controller.abort();
  }, [userId, reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError('');
    setReloadKey((value) => value + 1);
  };

  const average =
    reviews.length > 0
      ? (
          reviews.reduce((total, review) => total + review.rating, 0) /
          reviews.length
        ).toFixed(1)
      : null;

  return (
    <section className="space-y-4 rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Received reviews</h2>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p role="status" className="text-sm text-gray-600">
          Loading reviews...
        </p>
      ) : error ? (
        <div role="alert" className="text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-1 underline"
          >
            Retry
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-600">
          No reviews yet. Reviews appear after completed gigs.
        </p>
      ) : (
        <>
          <p className="font-medium">
            <span className="text-yellow-600" aria-hidden="true">
              ★{' '}
            </span>
            {average}/5 · {reviews.length}{' '}
            {reviews.length === 1 ? 'review' : 'reviews'}
          </p>

          <div className="space-y-3">
            {reviews.map((review) => (
              <article
                key={review._id}
                className="space-y-2 rounded border bg-gray-50 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-semibold">
                    {review.reviewerId?.name || 'Unavailable account'}
                  </h3>

                  <p className="text-sm font-medium">
                    {review.rating}/5
                  </p>
                </div>

                <p className="text-xs text-gray-500">
                  {review.gigId?.title || 'Gig no longer available'}
                  {' · '}
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>

                <p className="whitespace-pre-wrap break-words text-sm">
                  {review.comment}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}