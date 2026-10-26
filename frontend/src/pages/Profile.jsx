import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="text-sm text-gray-600">
          Update the details you share with other GigLoop users.
        </p>
      </header>

      <section className="space-y-2 rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold">{user.name}</h2>

        <p className="text-sm text-gray-600">{user.email}</p>

        <p className="text-sm capitalize">
          Account type: {user.userType}
        </p>

        {isStudent && (
          <p className="text-sm">
            Student verification:{' '}
            {user.isVerifiedStudent ? 'Verified' : 'Not verified'}
          </p>
        )}
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border bg-white p-5"
      >
        {error && (
          <p role="alert" className="rounded bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="rounded bg-green-50 p-3 text-green-800"
          >
            {notice}
          </p>
        )}

        <fieldset disabled={saving} className="space-y-4">
          <div>
            <label htmlFor="profile-bio" className="mb-1 block font-medium">
              Bio
            </label>

            <textarea
              id="profile-bio"
              name="bio"
              rows={5}
              maxLength={1000}
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell others about your experience and interests."
              className="w-full rounded border p-3"
            />

            <p className="text-right text-xs text-gray-500">
              {form.bio.length}/1000
            </p>
          </div>

          <div>
            <label
              htmlFor="profile-skills"
              className="mb-1 block font-medium"
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
              className="w-full rounded border p-3"
            />

            <p id="skills-help" className="mt-1 text-xs text-gray-500">
              Separate skills with commas. Maximum 20 skills.
            </p>
          </div>

          {isStudent && (
            <div>
              <label
                htmlFor="profile-faculty"
                className="mb-1 block font-medium"
              >
                Faculty
              </label>

              <input
                id="profile-faculty"
                name="faculty"
                maxLength={120}
                value={form.faculty}
                onChange={handleChange}
                placeholder="Faculty of Engineering"
                className="w-full rounded border p-3"
              />
            </div>
          )}

          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </fieldset>
      </form>
    </div>
  );
}