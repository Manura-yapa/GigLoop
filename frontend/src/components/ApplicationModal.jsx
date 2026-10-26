import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

export default function ApplicationModal({
  gig,
  onClose,
  onSubmitted
}) {
  const dialogRef = useRef(null);
  const submittingRef = useRef(false);

  const [formData, setFormData] = useState({
    bidAmount: String(gig.budget ?? ''),
    estimatedDays: '3',
    pitch: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      dialog.close();
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submittingRef.current) return;

    setError('');

    const bidAmount = Number(formData.bidAmount);
    const estimatedDays = Number(formData.estimatedDays);
    const pitch = formData.pitch.trim();

    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      setError('Enter a positive bid amount.');
      return;
    }

    if (!Number.isSafeInteger(estimatedDays) || estimatedDays < 1) {
      setError('Estimated days must be a positive whole number.');
      return;
    }

    if (!pitch || pitch.length > 2000) {
      setError('Your proposal must contain 1 to 2000 characters.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    let application;

    try {
      const response = await api.post(
        `/applications/${gig._id}/apply`,
        {
          bidAmount,
          estimatedDays,
          pitch
        }
      );

      application = response.data.application;
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Could not confirm submission. Check your connection before retrying.'
      );

      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    // Submission succeeded. The parent closes the modal and updates the feed.
    onSubmitted(application);
  };

  const handleCancel = (event) => {
    event.preventDefault();

    if (!submittingRef.current) {
      onClose();
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      aria-labelledby="application-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50"
    >
      <div className="flex justify-between items-start gap-4 mb-4">
        <div>
          <h2 id="application-title" className="text-xl font-bold">
            Submit a proposal
          </h2>

          <p className="text-gray-600 text-sm mt-1">
            {gig.title}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close proposal form"
          className="text-2xl text-gray-500 hover:text-gray-900 disabled:opacity-50"
        >
          ×
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-5">
        Listed budget: LKR {Number(gig.budget).toLocaleString()}
      </p>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitting} className="space-y-4">
          <div>
            <label
              htmlFor="bidAmount"
              className="block text-sm font-medium mb-1"
            >
              Your bid (LKR)
            </label>

            <input
              id="bidAmount"
              name="bidAmount"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.bidAmount}
              onChange={handleChange}
              className={inputClass}
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="estimatedDays"
              className="block text-sm font-medium mb-1"
            >
              Estimated delivery time (days)
            </label>

            <input
              id="estimatedDays"
              name="estimatedDays"
              type="number"
              min="1"
              step="1"
              value={formData.estimatedDays}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="pitch"
              className="block text-sm font-medium mb-1"
            >
              Proposal
            </label>

            <textarea
              id="pitch"
              name="pitch"
              rows={5}
              maxLength={2000}
              placeholder="Explain how you would complete the project and describe your relevant skills."
              value={formData.pitch}
              onChange={handleChange}
              className={inputClass}
              required
            />

            <p className="text-xs text-gray-500 mt-1">
              {formData.pitch.length}/2000 characters
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit proposal'}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}