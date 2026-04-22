import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VOLUNTEERS = [
  { id: 1, name: "Kabir Sharma", city: "Jaipur", skills: ["Medical", "First Aid"], hours: 18, rating: 92.3, status: "Available" },
  { id: 2, name: "Priya Nair", city: "Mumbai", skills: ["Food", "Logistics"], hours: 12, rating: 88.1, status: "Busy" },
  { id: 3, name: "Arjun Mehta", city: "Delhi", skills: ["Engineering"], hours: 20, rating: 76.5, status: "Off Duty" },
  { id: 4, name: "Sneha Pillai", city: "Chennai", skills: ["Medical", "Counseling"], hours: 8, rating: 95.0, status: "Available" },
  { id: 5, name: "Rohan Das", city: "Kolkata", skills: ["Flood", "Rescue"], hours: 15, rating: 83.7, status: "Available" },
  { id: 6, name: "Ananya Singh", city: "Hyderabad", skills: ["Food", "Medical"], hours: 19, rating: 79.2, status: "Busy" },
  { id: 7, name: "Vikram Patel", city: "Ahmedabad", skills: ["Engineering"], hours: 5, rating: 91.4, status: "Available" },
  { id: 8, name: "Meera Iyer", city: "Pune", skills: ["First Aid", "Logistics"], hours: 11, rating: 87.6, status: "Available" },
];

const AVATAR_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

export default function VolunteersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredVolunteers = VOLUNTEERS.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                          v.city.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || v.status === filter || v.skills.includes(filter);
    return matchesSearch && matchesFilter;
  });

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <div className="h-full bg-[#070B14] p-6 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-[1.6rem] font-bold text-white">Volunteer Roster</h1>
        <span className="bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-sm mono font-bold">
          {VOLUNTEERS.length} TOTAL
        </span>
      </div>

      <div className="flex items-center space-x-4 mb-8">
        <input 
          type="text"
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#16202E] border border-white/10 rounded-lg px-4 py-2.5 text-white w-80 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
        />
        <div className="flex bg-[#16202E]/50 p-1 rounded-lg border border-white/5">
          {["All", "Available", "Busy", "Medical", "Engineering", "Food"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-[#8B9CB8] hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVolunteers.map(v => (
          <div key={v.id} className="bg-[#16202E] border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.18] hover:-translate-y-1 transition-all duration-200 group">
            <div className="flex items-center space-x-4 mb-4">
              <div 
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner"
                style={{ backgroundColor: AVATAR_COLORS[v.id % 6] }}
              >
                {getInitials(v.name)}
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{v.name}</h3>
                <p className="text-[0.8rem] text-[#8B9CB8] flex items-center">
                  <span className="mr-1">📍</span> {v.city}
                </p>
              </div>
              <div className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${v.status === 'Available' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : v.status === 'Busy' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                {v.status}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {v.skills.map(s => (
                <span key={s} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-[#93C5FD] rounded text-[0.65rem] font-bold uppercase tracking-wider">
                  {s}
                </span>
              ))}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[0.6rem] text-[#8B9CB8] font-bold uppercase tracking-[0.1em]">Hours This Week</span>
                <span className="text-[0.7rem] text-white mono font-bold">{v.hours}/20h</span>
              </div>
              <div className="w-full h-1.5 bg-[#0D1421] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${v.hours >= 18 ? 'bg-[#EF4444]' : 'bg-[#10B981]'}`}
                  style={{ width: `${(v.hours / 20) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[0.8rem] text-[#8B9CB8] mono flex items-center">
                  <span className="text-yellow-500 mr-1">★</span> {v.rating.toFixed(1)}% Reliability
                </span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 group-hover:gap-3"
            >
              Dispatch <span className="transition-all">→</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
