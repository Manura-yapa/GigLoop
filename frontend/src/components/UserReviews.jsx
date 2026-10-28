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
    <section className="ui-card p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Received reviews</h2>
          <p className="text-xs text-slate-500">Feedback left by project collaborators</p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="ui-button ui-button-secondary !min-h-9 !py-1 text-xs"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p role="status" className="text-sm text-slate-500">
          Loading received reviews...
        </p>
      ) : error ? (
        <div role="alert" className="ui-error">
          <p>{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-1 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No reviews yet. Completed gigs and mutual feedback will show up here.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-xl bg-amber-50/70 border border-amber-200/60 p-3.5">
            <span className="text-xl text-amber-500" aria-hidden="true">★</span>
            <div>
              <p className="text-sm font-bold text-amber-950">
                {average} out of 5.0
              </p>
              <p className="text-xs text-amber-800">
                Based on {reviews.length} {reviews.length === 1 ? 'verified review' : 'verified reviews'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {reviews.map((review) => (
              <article
                key={review._id}
                className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    {review.reviewerId?.name || 'Unavailable account'}
                  </h3>

                  <span className="font-bold text-amber-600 text-xs rounded-lg bg-amber-50 px-2 py-0.5 border border-amber-100">
                    ★ {review.rating}/5
                  </span>
                </div>

                <p className="text-[11px] font-medium text-slate-400">
                  {review.gigId?.title || 'Gig listing'}
                  {' · '}
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>

                <p className="whitespace-pre-wrap break-words text-sm text-slate-600 leading-relaxed">
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