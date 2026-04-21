import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import type { NeedEntity, VolunteerProfile } from './types';
import { GoogleMap, useJsApiLoader, Circle } from '@react-google-maps/api';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { BoltIcon, ExclamationTriangleIcon, UserGroupIcon, PaperAirplaneIcon, SignalIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import { saveOfflineReport, syncOfflineReports } from './offlineSync';

const API_BASE = 'http://localhost:3000';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '0.75rem' };
const center = { lat: 19.0760, lng: 72.8777 };

export default function App() {
  const [needs, setNeeds] = useState<NeedEntity[]>([]);
  const [selectedNeed, setSelectedNeed] = useState<NeedEntity | null>(null);
  const [dispatchResult, setDispatchResult] = useState<{ volunteer: VolunteerProfile, dispatchMessage: string } | null>(null);
  const [loadingDispatch, setLoadingDispatch] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Ingest form
  const [ingestText, setIngestText] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineReports(API_BASE); };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.onLine) syncOfflineReports(API_BASE);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchNeeds = async () => {
      if (!isOnline) return;
      try {
        const response = await axios.get(`${API_BASE}/needs`);
        setNeeds(response.data);
      } catch (error) {
        console.error("Error fetching needs:", error);
      }
    };
    fetchNeeds();
    const interval = setInterval(fetchNeeds, 3000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '' 
  });

  const handleDispatch = async (needId: string) => {
    if (!isOnline) return alert("Must be online to dispatch resources.");
    setLoadingDispatch(true);
    setDispatchResult(null);
    try {
      const response = await axios.post(`${API_BASE}/dispatch`, { needId });
      setDispatchResult(response.data);
    } catch (error: any) {
      alert("Dispatch error: " + (error.response?.data?.error || error.message));
    } finally {
      setLoadingDispatch(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestText.trim()) return;
    setIsIngesting(true);
    
    try {
      if (!isOnline) {
        await saveOfflineReport({ text: ingestText });
        setIngestText('');
        alert("Saved offline! Will sync when connection returns.");
      } else {
        await axios.post(`${API_BASE}/ingest`, { text: ingestText });
        setIngestText('');
      }
    } catch (error) {
      console.error(error);
      await saveOfflineReport({ text: ingestText });
      setIngestText('');
      alert("Network failed. Saved offline automatically.");
    } finally {
      setIsIngesting(false);
    }
  };

  const getSlaStatus = (reportedAt: number) => {
    const mins = differenceInMinutes(Date.now(), reportedAt);
    if (mins < 30) return { color: 'bg-green-500', text: 'Within SLA' };
    if (mins < 60) return { color: 'bg-yellow-500', text: 'Approaching SLA' };
    return { color: 'bg-red-500', text: 'SLA Breached' };
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col font-sans">
      <header className="bg-[#1e1e1e] p-4 flex items-center justify-between border-b border-gray-800 shadow-lg relative z-20">
        <div className="flex items-center space-x-3">
          <BoltIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            CommunityPulse
          </h1>
        </div>
        <div className="flex space-x-4 text-sm font-medium">
          {isOnline ? (
            <span className="flex items-center text-green-400 bg-green-500/10 px-3 py-1 rounded-full"><SignalIcon className="w-4 h-4 mr-2" /> Online Mode</span>
          ) : (
            <span className="flex items-center text-red-400 bg-red-500/10 px-3 py-1 rounded-full"><SignalSlashIcon className="w-4 h-4 mr-2" /> Offline (PWA Intercepting)</span>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-6 p-6 h-[calc(100vh-73px)]">
        
        {/* PANEL 1: Live Ingestion Feed */}
        <section className="col-span-3 bg-[#1e1e1e] rounded-xl border border-gray-800 flex flex-col shadow-xl">
          <div className="p-4 border-b border-gray-800 bg-[#252525]">
            <h2 className="text-lg font-semibold flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-warning" />
              Live Ingestion Feed
            </h2>
          </div>
          
          <div className="p-4 border-b border-gray-800 bg-[#121212]">
             <form onSubmit={handleIngest} className="flex flex-col space-y-2">
                <textarea 
                  value={ingestText}
                  onChange={e => setIngestText(e.target.value)}
                  placeholder="Paste rescue ping here (Hinglish/Tamil/Bengali supported)..." 
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 min-h-[60px]"
                />
                <button type="submit" disabled={isIngesting} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-1 rounded shadow text-sm">
                  {isIngesting ? 'AI Processing...' : 'Ingest Signal'}
                </button>
             </form>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {needs.length === 0 && <p className="text-gray-500 text-sm">No recent distress signals.</p>}
            {needs.map(need => {
              const sla = getSlaStatus(need.reportedAt);
              return (
                <div 
                  key={need.id} 
                  className={`p-4 rounded-lg border transition-all cursor-pointer hover:bg-[#2a2a2a] relative ${selectedNeed?.id === need.id ? 'border-blue-500 bg-[#252535]' : 'border-gray-700 bg-[#252525]'}`}
                  onClick={() => { setSelectedNeed(need); setDispatchResult(null); }}
                >
                  {/* Golden Hour Bar */}
                  <div className="absolute top-0 left-0 w-full h-1 overflow-hidden rounded-t-lg bg-gray-800">
                    <div className={`h-full ${sla.color}`} style={{ width: `${Math.min(100, (differenceInMinutes(Date.now(), need.reportedAt) / 60) * 100)}%`}}></div>
                  </div>

                  <div className="flex justify-between items-start mb-2 mt-1">
                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${need.status === 'CRITICAL_VELOCITY' ? 'bg-red-900/50 text-red-400 border border-red-800/50' : 'bg-blue-900/50 text-blue-400 border border-blue-800/50'}`}>
                      {need.status}
                    </span>
                    <span className="text-[10px] text-gray-500 flex flex-col items-end">
                      {formatDistanceToNow(need.reportedAt)} ago
                      <span className="mt-1" style={{color: sla.text.includes('Breach') ? '#ef4444' : '#9ca3af'}}>{sla.text}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                     <h3 className="font-semibold text-gray-200 capitalize">{need.crisisType} Crisis</h3>
                     {need.originalLanguage && <span className="text-[10px] bg-gray-700/50 px-2 py-0.5 rounded text-gray-300 border border-gray-600">{need.originalLanguage}</span>}
                  </div>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{need.urgencyReasoning}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span><UserGroupIcon className="h-4 w-4 inline mr-1" /> {need.estimatedScale} approx</span>
                    <span>Reports: {need.reportCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PANEL 2: 48h Crisis Map */}
        <section className="col-span-6 bg-[#1e1e1e] rounded-xl border border-gray-800 overflow-hidden shadow-xl flex flex-col pt-1">
          <div className="p-4 absolute z-10 w-full pointer-events-none">
            <div className="inline-block bg-[#121212]/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700 pointer-events-auto shadow-lg">
              <h2 className="text-sm font-semibold flex items-center">
                 48h Crisis Trajectory Map
              </h2>
            </div>
          </div>
          <div className="flex-1 relative">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={12}
                options={{ styles: darkMapStyle, disableDefaultUI: true, zoomControl: true }}
              >
                {needs.map(need => {
                  const isCritical = need.status === 'CRITICAL_VELOCITY';
                  return (
                    <Circle
                      key={need.id}
                      center={{ lat: need.location.lat, lng: need.location.lng }}
                      radius={isCritical ? 1500 : 800}
                      options={{
                        fillColor: isCritical ? '#ef4444' : '#f59e0b',
                        fillOpacity: Math.min(0.8, need.criticalityScore / 10),
                        strokeColor: isCritical ? '#ef4444' : '#f59e0b',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                      }}
                      onClick={() => setSelectedNeed(need)}
                    />
                  );
                })}
              </GoogleMap>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#151515]">
                Map Loading...
              </div>
            )}
          </div>
        </section>

        {/* PANEL 3: Top 5 Dispatch Queue */}
        <section className="col-span-3 bg-[#1e1e1e] rounded-xl border border-gray-800 overflow-hidden flex flex-col shadow-xl">
          <div className="p-4 border-b border-gray-800 bg-[#252525]">
            <h2 className="text-lg font-semibold flex items-center">
              <PaperAirplaneIcon className="h-5 w-5 mr-2 text-indigo-400" />
              Dispatch Central
            </h2>
          </div>
          <div className="flex-1 p-4 overflow-y-auto w-full">
            {!selectedNeed ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center space-y-3">
                <PaperAirplaneIcon className="h-10 w-10 opacity-20" />
                <p>Select a crisis on the left feed<br/>to initiate AI volunteer dispatch.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-[#121212] p-4 rounded-lg border border-gray-800 relative shadow-inner">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Selected Need</h3>
                  <p className="text-lg text-white mb-1">{selectedNeed.location.name}</p>
                  <p className="text-sm text-gray-300">Type: <span className="capitalize border-b border-gray-600">{selectedNeed.crisisType}</span></p>
                  
                  {/* Criticality Score UI math breakdown */}
                  <div className="mt-4 pt-4 border-t border-gray-800 bg-[#1a1a1a] -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                    <p className="text-xs text-uppercase tracking-wider text-gray-500 mb-2">Mathematical Score Breakdown</p>
                    <div className="flex items-center text-sm font-mono text-gray-300">
                      <div className="flex-1 text-center bg-[#222] rounded py-1 px-1">{selectedNeed.reportCount} <span className="text-[10px] block opacity-50">Reports</span></div>
                      <span className="mx-2">×</span>
                      <div className="flex-1 text-center bg-[#222] rounded py-1 px-1">{(selectedNeed.criticalityScore / selectedNeed.reportCount / 1.5).toFixed(1)}/h <span className="text-[10px] block opacity-50">Velocity</span></div>
                      <span className="mx-2">×</span>
                      <div className="flex-1 text-center bg-[#222] rounded py-1 px-1">1.X <span className="text-[10px] block opacity-50">Severity Wt</span></div>
                      <span className="mx-2">=</span>
                      <div className="flex-1 text-center bg-blue-900/30 text-blue-400 font-bold rounded py-1 px-1">{selectedNeed.criticalityScore.toFixed(1)} <span className="text-[10px] block opacity-50">Total</span></div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleDispatch(selectedNeed.id)}
                  disabled={loadingDispatch || !isOnline}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed rounded-lg font-bold text-white transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] flex justify-center items-center"
                >
                  {loadingDispatch ? (
                    <span className="flex items-center"><span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent mr-2"></span> Finding Best Match...</span>
                  ) : (
                    'Dispatch Volunteer'
                  )}
                </button>

                {dispatchResult && (
                  <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#252525] p-4 rounded-lg border border-green-800/30">
                      <h4 className="text-xs text-uppercase text-gray-400 mb-1 tracking-wider uppercase">Assigned To</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-green-400">{dispatchResult.volunteer.name}</span>
                        <span className="text-xs bg-[#121212] px-2 py-1 rounded text-gray-400">{dispatchResult.volunteer.reliabilityRate * 100}% Rating</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Hours: {dispatchResult.volunteer.hoursLast30Days}/20</p>
                    </div>

                    <div className="bg-[#121212] p-4 rounded-lg border border-gray-800 relative">
                      <h4 className="text-xs text-gray-500 mb-2 absolute -top-3 left-4 bg-[#121212] px-2">Generated WhatsApp Message</h4>
                      <p className="text-sm text-gray-200 mt-3 whitespace-pre-wrap font-mono relative z-10 leading-relaxed">
                        {dispatchResult.dispatchMessage}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
];
