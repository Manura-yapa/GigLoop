import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Web & App Dev',
  'Design & UI/UX',
  'Engineering & CAD',
  'Tutoring & Academics',
  'Writing & Translation',
  'Video & Animation'
];

export default function PostGig() {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    budget: '',
    deadline: '',
    skillsRequired: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Enter a title and description.');
      return;
    }

    const budget = Number(formData.budget);

    if (!Number.isFinite(budget) || budget <= 0) {
      setError('Budget must be a positive number.');
      return;
    }

    setSubmitting(true);

    try {
      // Students use customer mode when posting work.
      if (
        user.userType === 'student' &&
        user.activeRole !== 'customer'
      ) {
        await switchRole('customer');
      }

      await api.post('/gigs/create', {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        budget
      });

      // The dashboard will be added in a later step.
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to post gig. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'ui-field';

  return (
    <div className="ui-card ui-form-card mx-auto my-6 max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Create a listing
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Post a new gig
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Describe your project, budget, deadline, and skills required to find the right student talent.
        </p>
      </div>

      {user.userType === 'student' &&
        user.activeRole !== 'customer' && (
          <div className="ui-notice mb-5">
            Posting this gig will automatically switch your account to customer mode.
          </div>
        )}

      {error && (
        <p role="alert" className="ui-error mb-5">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitting} className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1">
              Project title
            </label>
            <input
              id="title"
              name="title"
              placeholder="e.g. Build a React landing page for student club"
              value={formData.title}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              placeholder="Provide a clear description of the tasks, requirements, and deliverables..."
              value={formData.description}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={inputClass}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget" className="block text-sm font-semibold text-slate-700 mb-1">
                Budget (LKR)
              </label>
              <input
                id="budget"
                name="budget"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="5000"
                value={formData.budget}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-semibold text-slate-700 mb-1">
                Deadline
              </label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                value={formData.deadline}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="skillsRequired" className="block text-sm font-semibold text-slate-700 mb-1">
              Required skills (optional)
            </label>
            <input
              id="skillsRequired"
              name="skillsRequired"
              placeholder="React, Node.js, MongoDB"
              value={formData.skillsRequired}
              onChange={handleChange}
              className={inputClass}
            />
            <p className="text-xs text-slate-500 mt-1">
              Separate skills with commas. Maximum 20 skills.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="ui-button ui-button-primary w-full mt-2"
          >
            {submitting ? 'Posting gig...' : 'Post gig'}
          </button>
        </fieldset>
      </form>
    </div>
  );
}