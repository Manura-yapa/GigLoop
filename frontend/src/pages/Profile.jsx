import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserReviews from '../components/UserReviews';

export default function Profile() {
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState(() => ({
    bio: user.bio || '',
    skills: (user.skills || []).join(', '),
    faculty: user.faculty || '',
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isStudent = user.userType === 'student';

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError('');
    setNotice('');

    const bio = form.bio.trim();
    const faculty = form.faculty.trim();

    const skills = [
      ...new Set(
        form.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
      ),
    ];

    if (bio.length > 1000) {
      setError('Your bio must contain no more than 1,000 characters.');
      return;
    }

    if (skills.length > 20 || skills.some((skill) => skill.length > 50)) {
      setError('Enter up to 20 skills, with no more than 50 characters each.');
      return;
    }

    if (isStudent && faculty.length > 120) {
      setError('Faculty must contain no more than 120 characters.');
      return;
    }

    const payload = { bio, skills };

    if (isStudent) {
      payload.faculty = faculty;
    }

    setSaving(true);

    try {
      await updateProfile(payload);

      setForm({
        bio,
        skills: skills.join(', '),
        faculty,
      });

      setNotice('Your profile was updated successfully.');
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Account Settings
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">My profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Update the details and skills you share with other GigLoop users.
        </p>
      </header>

      <section className="ui-card p-6 flex flex-wrap items-center gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700">
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
          <p className="text-sm text-slate-500">{user.email}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="ui-badge ui-badge-indigo">
              {user.userType} account
            </span>

            {isStudent && (
              <span className={user.isVerifiedStudent ? 'ui-badge ui-badge-success' : 'ui-badge ui-badge-neutral'}>
                {user.isVerifiedStudent ? 'Verified student' : 'Unverified student'}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="ui-card ui-form-card">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          Edit profile details
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p role="alert" className="ui-error">
              {error}
            </p>
          )}

          {notice && (
            <p role="status" className="ui-notice">
              {notice}
            </p>
          )}

          <fieldset disabled={saving} className="space-y-4">
            <div>
              <label htmlFor="profile-bio" className="block text-sm font-semibold text-slate-700 mb-1">
                Bio
              </label>

              <textarea
                id="profile-bio"
                name="bio"
                rows={4}
                maxLength={1000}
                value={form.bio}
                onChange={handleChange}
                placeholder="Tell others about your experience, interests, and what gigs you look for."
                className="ui-field"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {form.bio.length}/1000
              </p>
            </div>

            <div>
              <label
                htmlFor="profile-skills"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Skills
              </label>

              <input
                id="profile-skills"
                name="skills"
                value={form.skills}
                onChange={handleChange}
                placeholder="React, JavaScript, UI design"
                aria-describedby="skills-help"
                className="ui-field"
              />

              <p id="skills-help" className="mt-1 text-xs text-slate-500">
                Separate skills with commas. Maximum 20 skills.
              </p>
            </div>

            {isStudent && (
              <div>
                <label
                  htmlFor="profile-faculty"
                  className="block text-sm font-semibold text-slate-700 mb-1"
                >
                  Faculty
                </label>

                <input
                  id="profile-faculty"
                  name="faculty"
                  maxLength={120}
                  value={form.faculty}
                  onChange={handleChange}
                  placeholder="e.g. Faculty of Engineering"
                  className="ui-field"
                />
              </div>
            )}

            <button
              type="submit"
              className="ui-button ui-button-primary"
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </fieldset>
        </form>
      </div>

      <UserReviews key={user.id} userId={user.id} />
    </div>
  );
}