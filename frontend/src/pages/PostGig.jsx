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

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-2xl mx-auto mt-6 bg-white p-6 sm:p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-2">Post a new gig</h1>

      <p className="text-gray-600 text-sm mb-6">
        Describe your project, budget, deadline, and required skills.
      </p>

      {user.userType === 'student' &&
        user.activeRole !== 'customer' && (
          <p className="mb-5 rounded bg-blue-50 p-3 text-sm text-blue-800">
            Posting this gig will switch your account to customer mode.
          </p>
        )}

      {error && (
        <p role="alert" className="mb-4 text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitting} className="space-y-4">
          <div>
            <label htmlFor="title" className="block font-medium mb-1">
              Project title
            </label>
            <input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block font-medium mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              value={formData.description}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block font-medium mb-1">
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
              <label htmlFor="budget" className="block font-medium mb-1">
                Budget (LKR)
              </label>
              <input
                id="budget"
                name="budget"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.budget}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="deadline" className="block font-medium mb-1">
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
            <label htmlFor="skillsRequired" className="block font-medium mb-1">
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
            <p className="text-xs text-gray-500 mt-1">
              Separate skills with commas. Maximum 20 skills.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post gig'}
          </button>
        </fieldset>
      </form>
    </div>
  );
}