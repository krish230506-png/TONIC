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
    <div className="h-full bg-[#070B14] p-6 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-[1.6rem] font-bold text-white leading-tight">Response History</h1>
          <p className="text-[0.8rem] text-[#8B9CB8] mt-1">Archived signals and resolution activity log.</p>
        </div>
        <div className="flex space-x-4">
          <input 
            type="text"
            placeholder="Search signals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#16202E] border border-white/10 rounded-lg px-4 py-2 text-white w-64 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
          />
          <div className="flex bg-[#16202E]/50 p-1 rounded-lg border border-white/5">
            {["All", "OPEN", "RESOLVED"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-white/10 text-white shadow-lg' : 'text-[#8B9CB8] hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#16202E] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-[#0D1421] border-b border-white/[0.05]">
            <tr>
              <th className="px-6 py-4 text-[0.65rem] font-bold text-[#8B9CB8] uppercase tracking-[0.2em]">Signal Type</th>
              <th className="px-6 py-4 text-[0.65rem] font-bold text-[#8B9CB8] uppercase tracking-[0.2em]">Location</th>
              <th className="px-6 py-4 text-[0.65rem] font-bold text-[#8B9CB8] uppercase tracking-[0.2em]">Score</th>
              <th className="px-6 py-4 text-[0.65rem] font-bold text-[#8B9CB8] uppercase tracking-[0.2em]">Estimated Scale</th>
              <th className="px-6 py-4 text-[0.65rem] font-bold text-[#8B9CB8] uppercase tracking-[0.2em]">Timestamp</th>
              <th className="px-6 py-4 text-[0.65rem] font-bold text-[#8B9CB8] uppercase tracking-[0.2em]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-4 bg-white/[0.01] h-12"></td>
                </tr>
              ))
            ) : filteredNeeds.length > 0 ? (
              filteredNeeds.map((need) => (
                <tr key={need.id} className={`hover:bg-white/[0.02] transition-colors group ${need.status === 'RESOLVED' ? 'bg-green-500/[0.02]' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: need.status === 'RESOLVED' ? '#10B981' : (TYPE_COLORS[need.crisisType] || '#8B5CF6') }}></div>
                      <span className={`text-[0.85rem] font-semibold ${need.status === 'RESOLVED' ? 'text-green-400' : 'text-white'}`}>{need.crisisType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`text-[0.85rem] transition-colors ${need.status === 'RESOLVED' ? 'text-green-300/70' : 'text-white group-hover:text-blue-400'}`}>📍 {need.location.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[0.75rem] mono font-bold ${need.status === 'RESOLVED' ? 'text-green-500/50' : need.criticalityScore > 75 ? 'text-red-400' : 'text-green-400'}`}>
                      {need.criticalityScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[0.75rem] text-[#8B9CB8] mono font-semibold">
                    ~{need.estimatedScale} People
                  </td>
                  <td className="px-6 py-4 text-[0.7rem] text-[#8B9CB8] mono">
                    {new Date(need.reportedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 flex items-center space-x-4">
                    <span className={`px-2.5 py-1 rounded text-[0.6rem] font-bold uppercase tracking-widest border ${
                      need.status === 'OPEN' 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                        : 'bg-green-500/10 text-green-400 border-green-500/20'
                    }`}>
                      {need.status}
                    </span>
                    
                    {need.status === 'OPEN' && (
                      <button 
                        onClick={() => handleResolve(need.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-green-600/20 text-green-400 border border-green-500/30 px-2 py-1 rounded hover:bg-green-600/40"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#8B9CB8] text-sm animate-fade-in italic">
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
