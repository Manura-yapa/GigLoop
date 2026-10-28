import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [searchParams] = useSearchParams();

  const [userType, setUserType] = useState(
    () => searchParams.get('type') === 'client' ? 'client' : 'student'
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    faculty: '',
    studentId: '',
    skills: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isStudent = userType === 'student';

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleTypeChange = (nextType) => {
    setUserType(nextType);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const cleanEmail = formData.email.trim().toLowerCase();

    if (
      isStudent &&
      !/^[^@\s]+@(eng\.ruh\.ac\.lk|ruh\.ac\.lk)$/.test(cleanEmail)
    ) {
      setError('Student accounts require a University of Ruhuna email.');
      return;
    }

    if (
      formData.password.length < 8 ||
      new TextEncoder().encode(formData.password).length > 72
    ) {
      setError(
        'Password must have at least 8 characters and at most 72 bytes.'
      );
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: cleanEmail,
      password: formData.password,
      userType
    };

    if (isStudent) {
      payload.faculty = formData.faculty.trim();
      payload.studentId = formData.studentId.trim();
      payload.skills = formData.skills;
    }

    setSubmitting(true);

    try {
      const result = await register(payload);

      setSuccess(
        result.message || 'Account created successfully!'
      );

      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        faculty: '',
        studentId: '',
        skills: ''
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Registration failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'ui-field';

  if (success) {
    return (
      <div className="ui-card ui-form-card mx-auto my-6 max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-bold text-emerald-600">
          ✓
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Account created
        </h1>

        <p role="status" className="ui-notice mb-6">
          {success}
        </p>

        <Link
          to="/login"
          className="ui-button ui-button-primary w-full"
        >
          Continue to login
        </Link>
      </div>
    );
  }

  return (
    <div className="ui-card ui-form-card mx-auto my-6 max-w-xl">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Join GigLoop
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Join as a student freelancer or a client hiring students.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitting} className="space-y-4">
          <legend className="block text-sm font-semibold text-slate-700 mb-2">
            Account type
          </legend>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label
              className={`rounded-xl border p-4 text-sm font-semibold cursor-pointer transition-colors ${
                isStudent
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="accountType"
                value="student"
                checked={isStudent}
                onChange={() => handleTypeChange('student')}
                className="mr-2"
              />
              Student freelancer
            </label>

            <label
              className={`rounded-xl border p-4 text-sm font-semibold cursor-pointer transition-colors ${
                !isStudent
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="accountType"
                value="client"
                checked={!isStudent}
                onChange={() => handleTypeChange('client')}
                className="mr-2"
              />
              Public client
            </label>
          </div>

          <p className="text-xs text-slate-500">
            {isStudent
              ? 'Use your Ruhuna email. You can freely switch between freelancer and customer modes.'
              : 'Use your regular email to create a client account and post projects for students.'}
          </p>

          {error && (
            <p role="alert" className="ui-error">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">
              {isStudent ? 'Full name' : 'Name or organization name'}
            </label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              value={formData.name}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
              {isStudent ? 'University email' : 'Email address'}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={
                isStudent ? 'name@eng.ruh.ac.lk' : 'name@example.com'
              }
              value={formData.email}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          {isStudent && (
            <>
              <div>
                <label htmlFor="faculty" className="block text-sm font-semibold text-slate-700 mb-1">
                  Faculty (optional)
                </label>
                <input
                  id="faculty"
                  name="faculty"
                  maxLength={120}
                  placeholder="Faculty of Engineering"
                  value={formData.faculty}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="studentId" className="block text-sm font-semibold text-slate-700 mb-1">
                  Student ID (optional)
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  maxLength={50}
                  value={formData.studentId}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="skills" className="block text-sm font-semibold text-slate-700 mb-1">
                  Skills (optional)
                </label>
                <input
                  id="skills"
                  name="skills"
                  placeholder="React, Python, Graphic Design"
                  value={formData.skills}
                  onChange={handleChange}
                  className={inputClass}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Separate skills with commas. Maximum 20 skills.
                </p>
              </div>

              <p className="text-xs text-slate-500">
                Registering does not automatically verify your student status.
              </p>
            </>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={formData.confirmPassword}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <button
            type="submit"
            className="ui-button ui-button-primary w-full mt-2"
            disabled={submitting}
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </fieldset>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-indigo-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}