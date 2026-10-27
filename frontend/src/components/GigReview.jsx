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
    <section className="space-y-3 border-t pt-4">
      <h4 className="font-semibold">Your review</h4>

      {notice && (
        <p role="status" className="text-sm text-green-700">
          {notice}
        </p>
      )}

      {loading ? (
        <p role="status" className="text-sm text-gray-600">
          Checking reviews...
        </p>
      ) : loadError ? (
        <div role="alert" className="text-sm text-red-700">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={reloadReviews}
            className="mt-1 underline"
          >
            Retry
          </button>
        </div>
      ) : ownReview ? (
        <div className="space-y-2 rounded bg-gray-50 p-3">
          <p className="text-sm font-medium">
            Your rating: {ownReview.rating}/5
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">
            {ownReview.comment}
          </p>
          <p className="text-xs text-gray-500">
            You have already reviewed this gig.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-gray-600">
            Review your experience working with the other participant.
            Reviews are public and cannot be edited in this version.
          </p>

          {submitError && (
            <p role="alert" className="text-sm text-red-700">
              {submitError}
            </p>
          )}

          <fieldset disabled={saving} className="space-y-3">
            <label className="block text-sm font-medium">
              Rating
              <select
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                className="mt-1 block w-full rounded border bg-white p-2"
              >
                <option value="5">5 — Excellent</option>
                <option value="4">4 — Good</option>
                <option value="3">3 — Average</option>
                <option value="2">2 — Poor</option>
                <option value="1">1 — Very poor</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Comment
              <textarea
                required
                rows={4}
                maxLength={2000}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Describe your experience working together."
                className="mt-1 block w-full rounded border p-2"
              />
            </label>

            <p className="text-right text-xs text-gray-500">
              {comment.length}/2000
            </p>

            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Submitting...' : 'Submit review'}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}