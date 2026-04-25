import { useState, useEffect } from 'react';

const TYPE_COLORS: Record<string, string> = {
  Medical: "#EF4444",
  Infrastructure: "#F59E0B",
  Food: "#10B981",
  Flood: "#3B82F6",
  Water: "#3B82F6",
  Fire: "#F97316"
};

export default function HistoryPage() {
  const [needs, setNeeds] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const handleResolve = async (id: string) => {
    try {
      await fetch(`http://localhost:3000/needs/${id}/resolve`, { method: 'POST' });
      setNeeds(prev => prev.map(n => n.id === id ? { ...n, status: 'RESOLVED' } : n));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch('http://localhost:3000/needs')
      .then(res => res.json())
      .then(data => {
        setNeeds(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  const filteredNeeds = (needs || []).filter(n => {
    const locName = n?.location?.name || "";
    const cType = n?.crisisType || "";
    const matchesFilter = filter === "All" || n?.status === filter || n?.crisisType === filter;
    const matchesSearch = locName.toLowerCase().includes(search.toLowerCase()) || 
                          cType.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="h-full bg-transparent p-6 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-[1.6rem] font-bold text-inherit leading-tight">Response History</h1>
          <p className="text-[0.8rem] text-gray-400 mt-1">Archived signals and resolution activity log.</p>
        </div>
        <div className="flex space-x-4">
          <input 
            type="text"
            placeholder="Search signals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-inherit w-64 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
          />
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            {["All", "OPEN", "RESOLVED"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-blue-400'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#161B22] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-[#0D1421] border-b border-gray-800">
            <tr>
              <th className="px-6 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-[0.2em]">Signal Type</th>
              <th className="px-6 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-[0.2em]">Location</th>
              <th className="px-6 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-[0.2em]">Score</th>
              <th className="px-6 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-[0.2em]">Est. Scale</th>
              <th className="px-6 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-[0.2em]">Timestamp</th>
              <th className="px-6 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-[0.2em]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-6 bg-white/[0.02] h-16"></td>
                </tr>
              ))
            ) : filteredNeeds.length > 0 ? (
              filteredNeeds.map((need) => (
                <tr key={need.id} className={`hover:bg-white/[0.02] transition-colors group ${need.status === 'RESOLVED' ? 'bg-green-500/5' : ''}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: need.status === 'RESOLVED' ? '#10B981' : (TYPE_COLORS[need.crisisType] || '#8B5CF6') }}></div>
                      <span className={`text-[0.85rem] font-bold ${need.status === 'RESOLVED' ? 'text-green-400' : 'text-gray-100'}`}>{need.crisisType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className={`text-[0.85rem] font-medium transition-colors ${need.status === 'RESOLVED' ? 'text-green-300/60' : 'text-gray-300 group-hover:text-blue-400'}`}>📍 {need.location.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[0.75rem] mono font-bold ${need.status === 'RESOLVED' ? 'text-green-500/40' : need.criticalityScore > 75 ? 'text-red-400' : 'text-green-400'}`}>
                      {need.criticalityScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-[0.75rem] text-gray-400 mono font-bold">
                    ~{need.estimatedScale} <span className="text-[10px] opacity-60">PPL</span>
                  </td>
                  <td className="px-6 py-5 text-[0.7rem] text-gray-400 mono">
                    {new Date(need.reportedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-4">
                      <span className={`px-2.5 py-1 rounded-full text-[0.6rem] font-bold uppercase tracking-widest border ${
                        need.status === 'OPEN' 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}>
                        {need.status}
                      </span>
                      
                      {need.status === 'OPEN' && (
                        <button 
                          onClick={() => handleResolve(need.id)}
                          className="opacity-0 group-hover:opacity-100 transition-all text-[10px] bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-500 shadow-lg"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-gray-500 text-sm animate-fade-in italic">
                   No archival signals found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
