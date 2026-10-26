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

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-10 bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">
          Account created
        </h1>

        <p role="status" className="text-green-700 mb-6">
          {success}
        </p>

        <Link
          to="/login"
          className="inline-block bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Continue to login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white p-6 sm:p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-center">
        Create your GigLoop account
      </h1>

      <p className="text-sm text-gray-600 text-center mt-2 mb-6">
        Join as a student freelancer or a client hiring students.
      </p>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitting} className="space-y-4">
          <legend className="font-semibold mb-3">
            Account type
          </legend>

          <div className="grid grid-cols-2 gap-3">
            <label
              className={`border rounded-lg p-3 cursor-pointer ${
                isStudent
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300'
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
              Student
            </label>

            <label
              className={`border rounded-lg p-3 cursor-pointer ${
                !isStudent
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300'
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

          <p className="text-sm text-gray-600">
            {isStudent
              ? 'Use your Ruhuna email. You can switch between freelancer and customer modes.'
              : 'Use your regular email to create a customer account and hire students.'}
          </p>

          {error && (
            <p role="alert" className="text-red-600 text-sm">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              {isStudent ? 'Full name' : 'Name or company name'}
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
            <label htmlFor="email" className="block text-sm font-medium mb-1">
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
                <label htmlFor="faculty" className="block text-sm font-medium mb-1">
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
                <label htmlFor="studentId" className="block text-sm font-medium mb-1">
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
                <label htmlFor="skills" className="block text-sm font-medium mb-1">
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
                <p className="text-xs text-gray-500 mt-1">
                  Separate skills with commas. Maximum 20 skills.
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Registering does not automatically verify your student status.
              </p>
            </>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
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
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
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
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </fieldset>
      </form>

      <p className="text-center text-sm text-gray-600 mt-5">
        Already registered?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}