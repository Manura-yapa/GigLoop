import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function GigReview({ gigId }) {
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const submittingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchReviews() {
      try {
        const response = await api.get(`/reviews/gig/${gigId}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setReviews(response.data);
          setLoadError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setLoadError(
            err.response?.data?.error || 'Failed to load gig reviews.'
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
  }, [gigId, reloadKey]);

  // GET returns populated users; POST returns their IDs.
  const ownReview = reviews.find((review) => {
    const reviewerId =
      review.reviewerId?._id || review.reviewerId;

    return reviewerId === user.id;
  });

  const reloadReviews = () => {
    setLoading(true);
    setLoadError('');
    setReloadKey((value) => value + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submittingRef.current || ownReview) return;

    setSubmitError('');
    setNotice('');

    const numericRating = Number(rating);
    const cleanComment = comment.trim();

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      setSubmitError('Choose a rating from 1 to 5.');
      return;
    }

    if (!cleanComment || cleanComment.length > 2000) {
      setSubmitError('Write a review between 1 and 2,000 characters.');
      return;
    }

    submittingRef.current = true;
    setSaving(true);

    try {
      const response = await api.post('/reviews', {
        gigId,
        rating: numericRating,
        comment: cleanComment,
      });

      setReviews((previous) => [
        response.data.review,
        ...previous,
      ]);

      setComment('');
      setNotice('Your review was submitted successfully.');
    } catch (err) {
      setSubmitError(
        err.response?.data?.error || 'Failed to submit your review.'
      );

      // Another tab may already have submitted this user's review.
      if (err.response?.status === 409) {
        reloadReviews();
      }
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Gig Review
        </h4>
        {ownReview && (
          <span className="ui-badge ui-badge-success">
            Review submitted
          </span>
        )}
      </div>

      {notice && (
        <p role="status" className="ui-notice">
          {notice}
        </p>
      )}

      {loading ? (
        <p role="status" className="text-sm text-slate-500">
          Checking review status...
        </p>
      ) : loadError ? (
        <div role="alert" className="ui-error">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={reloadReviews}
            className="mt-1 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : ownReview ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-slate-900">Your rating</span>
            <span className="font-bold text-amber-600 text-sm">
              ★ {ownReview.rating}/5
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-slate-600 leading-relaxed">
            {ownReview.comment}
          </p>
          <p className="text-xs text-slate-400">
            You have already submitted a review for this gig.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Share your feedback on working together. Reviews are published on participant profiles.
          </p>

          {submitError && (
            <p role="alert" className="ui-error">
              {submitError}
            </p>
          )}

          <fieldset disabled={saving} className="space-y-3">
            <div>
              <label htmlFor="gig-rating" className="block text-xs font-semibold text-slate-700 mb-1">
                Rating
              </label>
              <select
                id="gig-rating"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                className="ui-field"
              >
                <option value="5">★ ★ ★ ★ ★ (5 — Excellent)</option>
                <option value="4">★ ★ ★ ★ ☆ (4 — Good)</option>
                <option value="3">★ ★ ★ ☆ ☆ (3 — Average)</option>
                <option value="2">★ ★ ☆ ☆ ☆ (2 — Needs Improvement)</option>
                <option value="1">★ ☆ ☆ ☆ ☆ (1 — Poor)</option>
              </select>
            </div>

            <div>
              <label htmlFor="gig-comment" className="block text-xs font-semibold text-slate-700 mb-1">
                Comment
              </label>
              <textarea
                id="gig-comment"
                required
                rows={3}
                maxLength={2000}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Describe the quality of communication, delivery, and overall experience..."
                className="ui-field"
              />
              <p className="text-right text-xs text-slate-400 mt-1">
                {comment.length}/2000
              </p>
            </div>

            <button
              type="submit"
              className="ui-button ui-button-primary"
            >
              {saving ? 'Submitting...' : 'Submit review'}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}