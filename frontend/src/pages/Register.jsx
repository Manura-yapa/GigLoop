import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', faculty: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', formData);
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Student Signup</h2>
      {message && <p className="mb-4 text-center text-red-500">{message}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="text" placeholder="Full Name" className="border p-2 rounded" 
          onChange={(e) => setFormData({...formData, name: e.target.value})} required />
        <input type="email" placeholder="University Email (@eng.ruh.ac.lk)" className="border p-2 rounded" 
          onChange={(e) => setFormData({...formData, email: e.target.value})} required />
        <input type="password" placeholder="Password" className="border p-2 rounded" 
          onChange={(e) => setFormData({...formData, password: e.target.value})} required />
        <input type="text" placeholder="Faculty" className="border p-2 rounded" 
          onChange={(e) => setFormData({...formData, faculty: e.target.value})} required />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Register
        </button>
      </form>
    </div>
  );
}