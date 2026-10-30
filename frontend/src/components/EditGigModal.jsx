import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const CATEGORIES = [
  'Web & App Dev',
  'Design & UI/UX',
  'Engineering & CAD',
  'Tutoring & Academics',
  'Writing & Translation',
  'Video & Animation'
];

export default function EditGigModal({ gig, onClose, onUpdated }) {
  const dialogRef = useRef(null);
  const submittingRef = useRef(false);

  // Format existing date to YYYY-MM-DD for <input type="date">
  const initialDeadline = gig?.deadline
    ? new Date(gig.deadline).toISOString().split('T')[0]
    : '';

  const initialSkills = Array.isArray(gig?.skillsRequired)
    ? gig.skillsRequired.join(', ')
    : '';

  const [formData, setFormData] = useState({
    title: gig?.title || '',
    description: gig?.description || '',
    category: gig?.category || CATEGORIES[0],
    budget: String(gig?.budget ?? ''),
    deadline: initialDeadline,
    skillsRequired: initialSkills
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog && dialog.open) {
        dialog.close();
      }
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

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required.');
      return;
    }

    const budget = Number(formData.budget);
    if (!Number.isFinite(budget) || budget <= 0) {
      setError('Budget must be a positive number.');
      return;
    }

    if (!formData.deadline) {
      setError('Deadline is required.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const response = await api.put(`/gigs/${gig._id}`, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        budget,
        deadline: formData.deadline,
        skillsRequired: formData.skillsRequired
      });

      onUpdated(response.data.gig);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Failed to update gig. Please verify your input and try again.'
      );
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleCancel = (event) => {
    event.preventDefault();
    if (!submitting) {
      onClose();
    }
  };

  const inputClass = 'ui-field';

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="fixed inset-0 m-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-900/40"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Edit Gig Details
          </span>
          <h2 className="text-xl font-bold text-slate-900">
            Update "{gig.title}"
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close dialog"
          className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1"
        >
          ×
        </button>
      </div>

      {error && (
        <div role="alert" className="ui-error mb-4">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-title" className="block text-sm font-semibold text-slate-700 mb-1">
            Project title
          </label>
          <input
            id="edit-title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={inputClass}
            required
            disabled={submitting}
          />
        </div>

        <div>
          <label htmlFor="edit-description" className="block text-sm font-semibold text-slate-700 mb-1">
            Description
          </label>
          <textarea
            id="edit-description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className={inputClass}
            required
            disabled={submitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-category" className="block text-sm font-semibold text-slate-700 mb-1">
              Category
            </label>
            <select
              id="edit-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={inputClass}
              disabled={submitting}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-budget" className="block text-sm font-semibold text-slate-700 mb-1">
              Budget (LKR)
            </label>
            <input
              id="edit-budget"
              name="budget"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.budget}
              onChange={handleChange}
              className={inputClass}
              required
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-deadline" className="block text-sm font-semibold text-slate-700 mb-1">
              Deadline
            </label>
            <input
              id="edit-deadline"
              name="deadline"
              type="date"
              value={formData.deadline}
              onChange={handleChange}
              className={inputClass}
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="edit-skills" className="block text-sm font-semibold text-slate-700 mb-1">
              Required skills (comma-separated)
            </label>
            <input
              id="edit-skills"
              name="skillsRequired"
              placeholder="e.g. React, Node.js"
              value={formData.skillsRequired}
              onChange={handleChange}
              className={inputClass}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="ui-button ui-button-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="ui-button ui-button-primary"
          >
            {submitting ? 'Saving changes...' : 'Save changes'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
