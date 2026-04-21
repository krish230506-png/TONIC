import { useEffect, useState } from 'react';
import axios from 'axios';
import type { NeedEntity } from './types';
import { CheckCircleIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const API_BASE = 'http://localhost:3000';

export default function VolunteerApp() {
  const [needs, setNeeds] = useState<NeedEntity[]>([]);

  useEffect(() => {
    // Polling exclusively for needs that might be assigned to them
    const fetchNeeds = async () => {
      try {
        const response = await axios.get(`${API_BASE}/needs`);
        // For the MVP demo, we simply show OPEN or CRITICAL needs that they can accept
        setNeeds(response.data.filter((n: NeedEntity) => n.status !== 'RESOLVED'));
      } catch (error) {
        console.error(error);
      }
    };
    fetchNeeds();
    const interval = setInterval(fetchNeeds, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string) => {
    // Just a dummy optimistic update to show UI sync for the demo
    setNeeds(prev => prev.filter(n => n.id !== id));
    alert('Task marked as COMPLETED! Backend would sync this state now.');
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col text-white font-sans max-w-md mx-auto border-x border-gray-800 shadow-2xl">
      <header className="bg-indigo-600 p-4 shadow-lg sticky top-0 z-50">
        <h1 className="text-xl font-bold flex items-center justify-center">
          <CheckCircleIcon className="w-6 h-6 mr-2" />
          Volunteer Field Portal
        </h1>
        <p className="text-center text-xs text-indigo-200 mt-1">Logged in as: Amit</p>
      </header>

      <div className="p-4 flex-1 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Nearby Dispatches</h2>
        
        {needs.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            No active dispatches near you.
          </div>
        )}

        {needs.map(need => (
          <div key={need.id} className="bg-[#1e1e1e] rounded-xl border border-gray-700 p-4 shadow-lg flex flex-col">
            <div className="flex justify-between items-start">
              <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase">
                {need.crisisType}
              </span>
              <span className="text-xs text-gray-500">{formatDistanceToNow(need.reportedAt)} ago</span>
            </div>
            
            <h3 className="text-lg font-bold mt-2">{need.location.name}</h3>
            <p className="text-sm text-gray-400 mt-1 flex items-start">
               <MapPinIcon className="w-4 h-4 mr-1 mt-0.5 text-gray-500 flex-shrink-0" />
               {need.urgencyReasoning}
            </p>

            <div className="bg-[#121212] rounded p-3 mt-4 mb-4 border border-gray-800">
               <div className="text-xs text-gray-400 flex justify-between">
                 <span>Affecting: ~{need.estimatedScale} people</span>
                 <span className="text-yellow-500">Criticality: {need.criticalityScore.toFixed(1)}</span>
               </div>
            </div>

            <button 
              onClick={() => handleResolve(need.id)}
              className="mt-auto w-full py-3 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold rounded-lg transition-transform active:scale-95"
            >
              Mark As Resolved
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
