import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Prediction {
  city: string;
  predictedCrisisType: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceScore: number;
  reasoning: string;
  recommendedPreventiveAction: string;
}

const PredictionsSection: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/predictions');
      setPredictions(res.data.predictions);
      setLastUpdated(res.data.lastUpdated);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
    const refreshInterval = setInterval(fetchPredictions, 90000);
    const counterInterval = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
      }
    }, 1000);
    return () => {
      clearInterval(refreshInterval);
      clearInterval(counterInterval);
    };
  }, [lastUpdated]);

  const getRiskStyles = (level: string) => {
    switch (level) {
      case 'CRITICAL': return { border: '#ef4444', text: '#ef4444', bg: 'bg-red-500/10', dot: 'bg-red-500 animate-pulse' };
      case 'HIGH': return { border: '#f97316', text: '#f97316', bg: 'bg-orange-500/10', dot: 'bg-orange-500 animate-pulse' };
      case 'MEDIUM': return { border: '#eab308', text: '#eab308', bg: 'bg-yellow-500/10', dot: '' };
      case 'LOW': return { border: '#22c55e', text: '#22c55e', bg: 'bg-green-500/10', dot: '' };
      default: return { border: '#64748b', text: '#64748b', bg: 'bg-gray-500/10', dot: '' };
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flood': return '🌊';
      case 'fire': return '🔥';
      case 'medical': return '🏥';
      case 'storm': return '🌪';
      case 'power': return '⚡';
      case 'traffic': return '🚗';
      default: return '⚠️';
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 italic">Analyzing patterns...</div>;

  return (
    <div className="bg-[#161B22] rounded-2xl p-8 mb-10 border border-gray-800 shadow-xl">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-orange-600 text-white shadow-lg shadow-orange-900/20">
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <h2 className="text-[1.2rem] font-bold text-gray-100 leading-none mb-2">
              AI Predictive Intelligence — Next 6 Hours
            </h2>
            <p className="text-[0.75rem] text-gray-500 font-bold uppercase tracking-widest">
              Incident patterns and regional data analysis
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-[0.75rem] text-gray-500 font-mono font-bold">
            Updated: {secondsAgo}s ago
          </span>
          <button 
            onClick={fetchPredictions}
            className="w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-gray-400 shadow-sm"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {predictions.map((p, idx) => {
          const styles = getRiskStyles(p.riskLevel);
          return (
            <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col hover:border-white/10 transition-all group" style={{ borderTop: `4px solid ${styles.border}` }}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col">
                  <h3 className="text-[16px] font-bold text-gray-100 mb-1">{p.city}</h3>
                  <p className="text-[11.5px] text-gray-500 font-bold uppercase tracking-wider flex items-center">
                    <span className="mr-2">{getIcon(p.predictedCrisisType)}</span>
                    {p.predictedCrisisType} Risk
                  </p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold border flex items-center uppercase tracking-widest ${styles.bg}`} style={{ color: styles.text, borderColor: styles.border }}>
                  {styles.dot && <span className={`w-1.5 h-1.5 rounded-full mr-2 ${styles.dot}`}></span>}
                  {p.riskLevel}
                </div>
              </div>

              {/* Confidence Circle */}
              <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-center mb-6">
                <div className="relative w-10 h-10 mr-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      stroke="#1f2937"
                      strokeWidth="3.5"
                      fill="transparent"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      stroke={styles.border}
                      strokeWidth="3.5"
                      fill="transparent"
                      strokeDasharray={113.1}
                      strokeDashoffset={113.1 - (113.1 * p.confidenceScore) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-gray-100">
                    {p.confidenceScore}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Confidence</span>
                  <span className="text-[11px] font-bold text-gray-100">{p.confidenceScore} / 100 Score</span>
                </div>
              </div>

              <p className="text-[11px] italic text-gray-400 leading-relaxed mb-6 border-l-2 border-gray-700 pl-4 py-1">
                "{p.reasoning}"
              </p>

              <div className="bg-black/20 rounded-xl p-4 mt-auto border border-white/5">
                <p className="text-[9px] font-bold text-gray-500 uppercase mb-2 flex items-center">
                  <span className="text-blue-500 mr-2">●</span>
                  Recommended Action
                </p>
                <p className="text-[11px] text-gray-300 leading-snug font-medium">{p.recommendedPreventiveAction}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-10 pt-6 border-t border-white/5 text-[10px] text-gray-500 text-center font-bold uppercase tracking-widest">
        AI pre-emptive resource staging only • Confidence Interval 95%
      </div>
    </div>
  );
};

export default PredictionsSection;
