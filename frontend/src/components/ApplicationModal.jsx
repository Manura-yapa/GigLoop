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

  const inputClass = 'ui-field';

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      aria-labelledby="application-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex justify-between items-start gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Apply to project
          </p>
          <h2 id="application-title" className="text-2xl font-bold text-slate-900 mt-1">
            Submit a proposal
          </h2>
          <p className="text-sm font-medium text-slate-600 mt-1">
            {gig.title}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close proposal form"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 text-lg disabled:opacity-50"
        >
          ✕
        </button>
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 mb-5 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Project Budget</span>
        <span className="font-bold text-emerald-800 text-sm">
          LKR {Number(gig.budget).toLocaleString()}
        </span>
      </div>

      {error && (
        <p role="alert" className="ui-error mb-5">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitting} className="space-y-4">
          <div>
            <label
              htmlFor="bidAmount"
              className="block text-sm font-semibold text-slate-700 mb-1"
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
              className="block text-sm font-semibold text-slate-700 mb-1"
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
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              Proposal
            </label>

            <textarea
              id="pitch"
              name="pitch"
              rows={4}
              maxLength={2000}
              placeholder="Explain how you would complete the project and describe your relevant experience."
              value={formData.pitch}
              onChange={handleChange}
              className={inputClass}
              required
            />

            <p className="text-right text-xs text-slate-400 mt-1">
              {formData.pitch.length}/2000 characters
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="ui-button ui-button-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="ui-button ui-button-primary"
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