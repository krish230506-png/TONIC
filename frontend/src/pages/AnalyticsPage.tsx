import { useState, useEffect } from 'react';
import axios from 'axios';
import PredictionsSection from '../components/PredictionsSection';

export default function AnalyticsPage() {
  const [crises, setCrises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:3000/needs')
      .then(res => {
        setCrises(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6 text-inherit animate-pulse">Loading Analytics Dashboard...</div>;

  const validCrises = crises || [];
  const extractCity = (name: string) => name.split(' (')[0] || name;

  const uniqueCities = new Set(validCrises.map(c => extractCity(c.location.name))).size;
  const openCrises = validCrises.filter(c => c.status !== "RESOLVED").length;
  const resolvedCrises = validCrises.filter(c => c.status === "RESOLVED").length;

  const typeCounts = validCrises.reduce((acc, c) => {
    const type = c.crisisType.charAt(0).toUpperCase() + c.crisisType.slice(1).toLowerCase();
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const scoreRanges = [
    { label: "0-30", count: validCrises.filter(c => c.criticalityScore <= 30).length, color: "#10B981" },
    { label: "31-60", count: validCrises.filter(c => c.criticalityScore > 30 && c.criticalityScore <= 60).length, color: "#F59E0B" },
    { label: "61-80", count: validCrises.filter(c => c.criticalityScore > 60 && c.criticalityScore <= 80).length, color: "#F97316" },
    { label: "81-100", count: validCrises.filter(c => c.criticalityScore > 80).length, color: "#EF4444" },
  ];

  const typeColors: Record<string, string> = {
    Medical: "#EF4444",
    Infrastructure: "#F59E0B",
    Food: "#10B981",
    Flood: "#3B82F6",
    Water: "#3B82F6",
    Fire: "#F97316"
  };

  const maxTypeCount = Math.max(1, ...Object.values(typeCounts));

  // Calculate Avg Response time by City
  const cityResponseTimes: Record<string, { totalTime: number, count: number }> = {};
  validCrises.filter(c => c.status === 'RESOLVED' && c.resolvedAt).forEach(c => {
    const city = extractCity(c.location.name);
    const timeMs = c.resolvedAt - c.reportedAt;
    if (!cityResponseTimes[city]) cityResponseTimes[city] = { totalTime: 0, count: 0 };
    cityResponseTimes[city].totalTime += timeMs;
    cityResponseTimes[city].count += 1;
  });

  const responseTimeData = Object.entries(cityResponseTimes).map(([city, data]) => ({
    city,
    avgTimeMins: Math.round(data.totalTime / data.count / 60000)
  })).sort((a, b) => b.avgTimeMins - a.avgTimeMins);

  const maxResponseTime = Math.max(1, ...responseTimeData.map(d => d.avgTimeMins));

  return (
    <div className="h-full bg-transparent p-6 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-[1.6rem] font-bold text-inherit">Analytics Overview</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest border border-blue-500/20">Real-time Data Feed</span>
        </div>
      </div>

      <PredictionsSection />

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-10">
        {[
          { label: "Total Crises", value: validCrises.length, color: "#EF4444" },
          { label: "Open Now", value: openCrises, color: "#F59E0B" },
          { label: "Resolved", value: resolvedCrises, color: "#10B981" },
          { label: "Cities Covered", value: uniqueCities, color: "#3B82F6" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#161B22] border border-gray-800 border-t-[3px] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all" style={{ borderTopColor: kpi.color }}>
            <p className="text-[0.65rem] text-gray-400 font-bold uppercase tracking-[0.15em] mb-2">{kpi.label}</p>
            <p className="text-[2.2rem] text-gray-100 mono font-bold leading-none">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Crisis Types */}
        <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-8 shadow-lg">
          <h3 className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-[0.2em]">Crisis Distribution</h3>
          <div className="space-y-6">
            {Object.entries(typeCounts).length === 0 ? <p className="text-gray-500 text-sm italic">No data available.</p> : Object.entries(typeCounts).map(([type, count]) => (
              <div key={type} className="flex flex-col group">
                <div className="flex justify-between mb-2">
                  <span className="text-[0.8rem] text-gray-100 font-bold">{type}</span>
                  <span className="text-[0.75rem] text-gray-400 mono font-bold">{count as number}</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(count as number / maxTypeCount) * 100}%`, backgroundColor: typeColors[type] || '#8B9CB8' }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-8 shadow-lg">
          <h3 className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-[0.2em]">City Efficiency (Avg Response)</h3>
          <div className="space-y-6">
            {responseTimeData.length === 0 ? <p className="text-gray-500 text-sm mt-8 text-center italic">Resolve incidents to compute AI dispatch metrics.</p> : responseTimeData.map((data) => (
              <div key={data.city} className="flex flex-col group">
                <div className="flex justify-between mb-2">
                  <span className="text-[0.8rem] text-gray-100 font-bold truncate pr-2" title={data.city}>{data.city}</span>
                  <span className="text-[0.75rem] text-gray-400 mono font-bold">{data.avgTimeMins}m</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(data.avgTimeMins / maxResponseTime) * 100}%`, backgroundColor: data.avgTimeMins > 120 ? '#EF4444' : data.avgTimeMins > 60 ? '#F59E0B' : '#10B981' }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Ranges */}
        <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-8 shadow-lg">
          <h3 className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-[0.2em]">Severity Segments</h3>
          <div className="flex items-end justify-between h-[200px] pt-4 px-4">
            {scoreRanges.map(range => (
              <div key={range.label} className="flex flex-col items-center flex-1 space-y-4">
                <div className="relative w-8 group">
                  <div 
                    className="w-full rounded-t-lg transition-all duration-1000 ease-out"
                    style={{ height: `${validCrises.length ? (range.count / validCrises.length) * 180 : 0}px`, backgroundColor: range.color }}
                  ></div>
                </div>
                <div className="text-center">
                  <p className="text-[0.7rem] text-gray-100 mono font-bold">{range.label}</p>
                  <p className="text-[0.6rem] text-gray-400 mono">{range.count} Cases</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-8 mb-20 shadow-lg">
        <h3 className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-[0.2em]">System Activity Log</h3>
        <div className="space-y-1">
          {validCrises.sort((a, b) => b.reportedAt - a.reportedAt).map((crisis) => (
            <div key={crisis.id} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-lg transition-colors group">
              <div className="flex items-center space-x-6 shrink-0 md:shrink">
                <span className="text-[0.75rem] text-gray-400 mono font-bold w-20 shrink-0 group-hover:text-blue-400 transition-colors">
                  {Math.floor((Date.now() - crisis.reportedAt) / 60000)}m ago
                </span>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: typeColors[crisis.crisisType.charAt(0).toUpperCase() + crisis.crisisType.slice(1).toLowerCase()] || '#8B9CB8' }}></div>
                <div className="flex flex-col truncate pr-4">
                  <span className="text-[0.85rem] text-gray-100 font-bold truncate capitalize">{crisis.crisisType} Signal detected in {extractCity(crisis.location.name)}</span>
                  <span className="text-[0.7rem] text-gray-400 mono uppercase tracking-wider">Criticality Score: {Math.round(crisis.criticalityScore)}</span>
                </div>
              </div>
              <div className={`px-3 py-1 w-24 text-center rounded-full text-[0.65rem] font-bold uppercase tracking-widest ${crisis.status === 'OPEN' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : crisis.status === 'CRITICAL_VELOCITY' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                {crisis.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
