import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Feed() {
  const [gigs, setGigs] = useState([]);
  const [newGig, setNewGig] = useState({ title: '', description: '', category: '', budget: '', deadline: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if the user doesn't have a token
    if (!localStorage.getItem('token')) {
      navigate('/login');
    } else {
      fetchGigs();
    }
  }, [navigate]);

  const fetchGigs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/gigs/all');
      setGigs(res.data);
    } catch (err) {
      setError('Failed to load gigs.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // The x-auth-token header bypasses the 401 Unauthorized error you saw in Postman
      await axios.post('http://localhost:5000/api/gigs/create', newGig, {
        headers: { 'x-auth-token': token }
      });
      setNewGig({ title: '', description: '', category: '', budget: '', deadline: '' });
      fetchGigs(); // Instantly refresh the feed to show the new gig
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create gig.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Create Gig Form */}
      <div className="md:col-span-1 bg-white p-6 rounded shadow h-fit">
        <h3 className="font-bold text-lg mb-4">Post a New Gig</h3>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="text" placeholder="Gig Title (e.g., Design triptych stage backdrop)" className="border p-2 rounded text-sm" 
            value={newGig.title} onChange={e => setNewGig({...newGig, title: e.target.value})} required />
          <textarea placeholder="Description (e.g., Need a futuristic Roman Colosseum tech hub theme for an upcoming exhibition...)" className="border p-2 rounded text-sm h-24" 
            value={newGig.description} onChange={e => setNewGig({...newGig, description: e.target.value})} required />
          <input type="text" placeholder="Category (e.g., Design, Programming)" className="border p-2 rounded text-sm" 
            value={newGig.category} onChange={e => setNewGig({...newGig, category: e.target.value})} required />
          <input type="number" placeholder="Budget (LKR)" className="border p-2 rounded text-sm" 
            value={newGig.budget} onChange={e => setNewGig({...newGig, budget: e.target.value})} required />
          <input type="date" className="border p-2 rounded text-sm" 
            value={newGig.deadline} onChange={e => setNewGig({...newGig, deadline: e.target.value})} required />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold transition">
            Post Gig
          </button>
        </form>
      </div>
      
      {/* Gig Feed */}
      <div className="md:col-span-2">
        <h3 className="font-bold text-xl mb-4">Recent Gigs</h3>
        <div className="flex flex-col gap-4">
          {gigs.length === 0 ? (
            <p className="text-gray-500">No gigs posted yet. Be the first!</p>
          ) : (
            gigs.map(gig => (
              <div key={gig._id} className="bg-white p-5 rounded shadow border-l-4 border-blue-600">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-lg">{gig.title}</h4>
                  <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">Rs {gig.budget}</span>
                </div>
                <p className="text-gray-700 mt-2 text-sm">{gig.description}</p>
                <div className="mt-4 flex justify-between items-center text-xs text-gray-500 border-t pt-3">
                  <span>Posted by: <span className="font-semibold text-gray-800">{gig.posterId?.name}</span> ({gig.posterId?.faculty})</span>
                  <span>Deadline: {new Date(gig.deadline).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}