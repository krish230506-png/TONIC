import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import type { NeedEntity, VolunteerProfile } from './types';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { BoltIcon, ExclamationTriangleIcon, UserGroupIcon, PaperAirplaneIcon, SignalIcon, SignalSlashIcon, MicrophoneIcon, StopCircleIcon, BellAlertIcon } from '@heroicons/react/24/outline';
import { saveOfflineReport, syncOfflineReports, clearOfflineQueue } from './offlineSync';

const API_BASE = 'http://localhost:3000';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '0.75rem' };
const center: [number, number] = [19.0760, 72.8777];

// Custom Heatmap Layer using leaflet.heat
function HeatmapOverlay({ data }: { data: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Heatmap data format: [[lat, lng, intensity], ...]
    const points = data.map(p => [p.location[0], p.location[1], p.weight]);
    
    // @ts-ignore - leaflet.heat is a plugin
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      max: 100,
      gradient: {
        0.0: 'rgba(0, 255, 0, 0)',
        0.2: 'rgba(0, 255, 0, 1)',
        0.4: 'rgba(173, 255, 47, 1)',
        0.6: 'rgba(255, 215, 0, 1)',
        0.8: 'rgba(255, 140, 0, 1)',
        1.0: 'rgba(255, 0, 0, 1)'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [data, map]);

  return null;
}

// Add this component to handle map re-centering
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [center, zoom, map]);
  return null;
}

export default function App() {
  const [needs, setNeeds] = useState<NeedEntity[]>([]);
  const [selectedNeed, setSelectedNeed] = useState<NeedEntity | null>(null);
  const [dispatchResult, setDispatchResult] = useState<{ volunteer: VolunteerProfile, dispatchMessage: string } | null>(null);
  const [loadingDispatch, setLoadingDispatch] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Offline UI
  const [offlineSyncMessage, setOfflineSyncMessage] = useState<string | null>(null);

  // Ingest form
  const [ingestText, setIngestText] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  // Audio Recording — now uses Web Speech API (SpeechRecognition)
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // UI State
  const [mapLayer, setMapLayer] = useState<'dark' | 'satellite'>('dark');
  const [alertBanner, setAlertBanner] = useState<NeedEntity | null>(null);

  useEffect(() => {
    // Request notification permission for simulated FCM
    if ("Notification" in window) {
       Notification.requestPermission();
    }

    const doSync = async () => {
      await syncOfflineReports(API_BASE, (count) => {
         setOfflineSyncMessage(`Syncing ${count} queued reports...`);
      });
      setTimeout(() => setOfflineSyncMessage(null), 3000);
    };

    const handleOnline = () => { setIsOnline(true); doSync(); };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.onLine) doSync();

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
        const fetchedNeeds: NeedEntity[] = response.data;
        
        // Auto-Alert Logic (Priority > 80 or unassigned > 30mins)
        // Find the most critical actionable incident that hasn't been assigned
        const actionableAlert = fetchedNeeds.find(n => 
           n.status !== 'RESOLVED' && 
           (n.criticalityScore > 80 || (Date.now() - n.reportedAt > 30 * 60 * 1000))
        );
        
        if (actionableAlert && (!alertBanner || alertBanner.id !== actionableAlert.id)) {
           setAlertBanner(actionableAlert);
           if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Urgent Crisis at ${actionableAlert.location.name}`, {
                 body: `Score: ${actionableAlert.criticalityScore.toFixed(1)}. Please assign a volunteer.`,
                 icon: '/favicon.svg'
              });
           }
        } else if (!actionableAlert) {
           setAlertBanner(null);
        }

        setNeeds(fetchedNeeds);
      } catch (error) {
        console.error("Error fetching needs:", error);
      }
    };
    fetchNeeds();
    const interval = setInterval(fetchNeeds, 3000);
    return () => clearInterval(interval);
  }, [isOnline, alertBanner]);



  const handleDispatch = async (needId: string) => {
    if (!isOnline) return alert("Must be online to dispatch resources.");
    setLoadingDispatch(true);
    setDispatchResult(null);
    try {
      const response = await axios.post(`${API_BASE}/dispatch`, { needId });
      setDispatchResult(response.data);
      if (alertBanner?.id === needId) setAlertBanner(null);
    } catch (error: any) {
      alert("Dispatch error: " + (error.response?.data?.error || error.message));
    } finally {
      setLoadingDispatch(false);
    }
  };

  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome and type your report.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Supports Indian English, Hindi accents
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIngestText(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setIngestText('[Voice input failed. Please type your report below.]');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    (mediaRecorderRef.current as any) = recognition;
    recognition.start();

    // Auto-stop after 15 seconds
    setTimeout(() => {
      try { recognition.stop(); } catch {}
    }, 15000);
  };

  const stopRecording = () => {
    const recognition = mediaRecorderRef.current as any;
    if (recognition) {
      try { recognition.stop(); } catch {}
      setIsRecording(false);
    }
  };

  // processAudio kept for compatibility but no longer used with Web Speech API
  const processAudio = async (_base64Audio: string) => {};



  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all rescue signals and the offline queue?")) return;
    try {
      await axios.delete(`${API_BASE}/needs`);
      await clearOfflineQueue();
      setNeeds([]);
      setSelectedNeed(null);
      setDispatchResult(null);
      setAlertBanner(null);
    } catch (e) {
      console.error('Failed to clear:', e);
      alert("Failed to clear history.");
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestText.trim()) return;
    setIsIngesting(true);
    
    try {
      if (!isOnline) {
        await saveOfflineReport({ text: ingestText });
        alert("Offline Mode: Report saved locally. It will sync automatically when your internet returns.");
        setIngestText('');
      } else {
        const res = await axios.post(`${API_BASE}/ingest`, { text: ingestText });
        console.log("Ingest response:", res.data);
        setIngestText('');
      }
    } catch (error: any) {
      console.error("Submission failed:", error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`Submission Error: ${errorMsg}. Don't worry, saving to offline storage instead.`);
      await saveOfflineReport({ text: ingestText });
      setIngestText('');
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

  const getScoreColor = (score: number) => {
    if (score > 70) return 'bg-red-600 text-white';
    if (score > 40) return 'bg-yellow-500 text-gray-900';
    return 'bg-green-500 text-white';
  };

  const heatmapData = needs.length > 0 
     ? needs.map(n => ({
         location: [n.location.lat, n.location.lng],
         weight: n.criticalityScore
       }))
     : [];

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col font-sans relative">
      <header className="fixed top-0 left-0 w-full z-[1001] p-4 flex items-center justify-between border-b border-gray-800 shadow-lg glass-header">
        <div className="flex items-center space-x-3">
          <BoltIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            CommunityPulse
          </h1>
        </div>

        <div className="flex items-center space-x-4 text-sm font-medium">
          {!isOnline && !offlineSyncMessage && (
            <span className="text-yellow-400 font-bold tracking-wide border border-yellow-700/50 bg-yellow-900/20 px-3 py-1 rounded">
               You are offline — reports will sync when connected
            </span>
          )}
          {offlineSyncMessage && (
             <span className="text-blue-400 font-bold bg-blue-900/30 px-3 py-1 rounded animate-pulse">
               {offlineSyncMessage}
             </span>
          )}

          {isOnline ? (
            <span className="flex items-center text-green-400 bg-green-500/10 px-3 py-1 rounded-full"><SignalIcon className="w-4 h-4 mr-2" /> Online Mode</span>
          ) : (
            <span className="flex items-center text-red-400 bg-red-500/10 px-3 py-1 rounded-full"><SignalSlashIcon className="w-4 h-4 mr-2" /> Offline</span>
          )}
        </div>
      </header>

      {/* FCM Simulated Global Alert Banner */}
      {alertBanner && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 w-[600px] bg-red-900/90 border border-red-500 p-4 rounded-xl shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-10 backdrop-blur-md">
           <div className="flex items-center">
              <BellAlertIcon className="w-10 h-10 text-white mr-4 animate-bounce" />
              <div>
                 <h2 className="text-red-100 font-bold text-lg">CRITICAL ALERT (Score: {alertBanner.criticalityScore.toFixed(1)})</h2>
                 <p className="text-red-200 text-sm">Zone: {alertBanner.location.name} | Needs: {alertBanner.crisisType.toUpperCase()}</p>
                 {Date.now() - alertBanner.reportedAt > 30 * 60 * 1000 && <p className="text-yellow-300 text-xs mt-1 font-bold">Unassigned for over 30 mins!</p>}
              </div>
           </div>
           <button 
             onClick={() => { setSelectedNeed(alertBanner); setDispatchResult(null); }} 
             className="bg-white text-red-900 px-4 py-2 rounded font-bold hover:bg-gray-200 transition-colors shadow"
           >
             Assign Now
           </button>
        </div>
      )}

      <main className="flex-1 grid grid-cols-12 gap-6 p-6 pt-24 h-[calc(100vh)]">
        
        {/* PANEL 1: Live Ingestion Feed */}
        <section className="col-span-3 bg-[#1e1e1e] rounded-xl border border-gray-800 flex flex-col shadow-xl">
          <div className="p-4 border-b border-gray-800 bg-[#252525]">
            <h2 className="text-lg font-semibold flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-warning" />
              Live Ingestion Feed
            </h2>
            <button 
              onClick={handleClearAll}
              className="text-[10px] bg-red-900/30 text-red-400 border border-red-800/50 px-2 py-1 rounded hover:bg-red-900/50 transition-colors focus:outline-none"
            >
              Clear All
            </button>
          </div>
          
          <div className="p-4 border-b border-gray-800 bg-[#121212]">
             <form onSubmit={handleIngest} className="flex flex-col space-y-2 relative">
                <textarea 
                  value={ingestText}
                  onChange={e => setIngestText(e.target.value)}
                  placeholder="Paste rescue ping... or use Voice Mic" 
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 min-h-[80px]"
                />
                
                {/* Voice Record Button — click to start, click again to stop */}
                <button 
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`absolute bottom-[42px] right-2 p-2 rounded-full transition-all ${isRecording ? 'bg-red-600 animate-pulse scale-110' : 'bg-[#1e1e1e] hover:bg-gray-700 border border-gray-600 text-gray-300'}`}
                  title={isRecording ? 'Click to stop recording' : 'Click to start voice input'}
                >
                  {isRecording ? <StopCircleIcon className="w-5 h-5 text-white" /> : <MicrophoneIcon className="w-5 h-5" />}
                </button>

                <button type="submit" disabled={isIngesting} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded shadow text-sm">
                  {isIngesting ? 'AI Processing...' : 'Submit to Pipeline'}
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
                  className={`p-4 rounded-lg border transition-all cursor-pointer hover:bg-[#2a2a2a] relative animate-slide-in ${selectedNeed?.id === need.id ? 'border-blue-500 bg-[#252535]' : 'border-gray-700 bg-[#252525]'}`}
                  onClick={() => { setSelectedNeed(need); setDispatchResult(null); }}
                >
                  {/* Golden Hour Bar */}
                  <div className="absolute top-0 left-0 w-full h-1 overflow-hidden rounded-t-lg bg-gray-800">
                    <div className={`h-full ${sla.color}`} style={{ width: `${Math.min(100, (differenceInMinutes(Date.now(), need.reportedAt) / 60) * 100)}%`}}></div>
                  </div>

                  <div className="flex justify-between items-start mb-2 mt-1">
                     <div className="flex space-x-2">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow ${getScoreColor(need.criticalityScore)}`}>
                            {need.criticalityScore.toFixed(0)} SC
                         </span>
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${need.status === 'CRITICAL_VELOCITY' ? 'bg-red-900/50 text-red-400 border border-red-800/50' : 'bg-blue-900/50 text-blue-400 border border-blue-800/50'}`}>
                           {need.status}
                         </span>
                     </div>
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
                </div>
              );
            })}
          </div>
        </section>

        <section className="col-span-6 bg-[#1e1e1e] rounded-xl border border-gray-800 overflow-hidden shadow-xl flex flex-col pt-1 relative">
          <div className="p-4 absolute z-[1000] w-full pointer-events-none">
            <div className="inline-block bg-[#121212]/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700 pointer-events-auto shadow-lg flex items-center space-x-4">
              <h2 className="text-sm font-semibold flex items-center">
                 48h Crisis Heatmap & Dispatch Engine
              </h2>
              <div className="h-4 w-px bg-gray-700"></div>
              <div className="flex bg-[#222] p-0.5 rounded-lg border border-gray-800">
                <button 
                  onClick={() => setMapLayer('dark')}
                  className={`px-2 py-1 text-[10px] rounded-md transition-all ${mapLayer === 'dark' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Dark
                </button>
                <button 
                  onClick={() => setMapLayer('satellite')}
                  className={`px-2 py-1 text-[10px] rounded-md transition-all ${mapLayer === 'satellite' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Satellite
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 relative z-10">
            <MapContainer center={center} zoom={12} style={mapContainerStyle} zoomControl={false}>
              <ChangeView 
                center={selectedNeed ? [selectedNeed.location.lat, selectedNeed.location.lng] : center} 
                zoom={selectedNeed ? 14 : 12} 
              />
              <TileLayer
                url={mapLayer === 'dark' 
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                }
                attribution={mapLayer === 'dark'
                  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  : 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                }
              />
              {needs.map(need => (
                <Circle
                  key={need.id}
                  center={[need.location.lat, need.location.lng]}
                  radius={need.criticalityScore > 70 ? 1200 : 600}
                  pathOptions={{
                    fillColor: 'transparent',
                    color: '#fff',
                    opacity: 0.2,
                    weight: 1,
                  }}
                  eventHandlers={{
                    click: () => setSelectedNeed(need)
                  }}
                />
              ))}
              <HeatmapOverlay data={heatmapData} />
            </MapContainer>
          </div>
        </section>

        {/* PANEL 3: Dispatch Queue */}
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
                  <div className="flex justify-between items-center mb-1">
                     <p className="text-lg text-white">{selectedNeed.location.name}</p>
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow ${getScoreColor(selectedNeed.criticalityScore)}`}>
                        {selectedNeed.criticalityScore.toFixed(0)} SCORE
                     </span>
                  </div>
                  <p className="text-sm text-gray-300">Type: <span className="capitalize border-b border-gray-600">{selectedNeed.crisisType}</span></p>
                  
                  {/* Criticality Score UI math breakdown */}
                  <div className="mt-4 pt-4 border-t border-gray-800 bg-[#1a1a1a] -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                    <p className="text-[10px] text-uppercase tracking-wider text-gray-500 mb-2">Mathematical Score Breakdown (Max 100)</p>
                    <div className="flex items-center text-xs font-mono text-gray-300">
                      <div className="flex-1 text-center bg-[#222] rounded py-1 px-1">{((selectedNeed.reportCount / (Math.max((Date.now() - selectedNeed.reportedAt) / (1000 * 60 * 60), 0.1)) * 5)*0.4).toFixed(0)} <span className="text-[9px] block opacity-50">Vel. Wt</span></div>
                      <span className="mx-1">+</span>
                      <div className="flex-1 text-center bg-[#222] rounded py-1 px-1">{(100 * 0.4).toFixed(0)} <span className="text-[9px] block opacity-50">Sev. Wt</span></div>
                      <span className="mx-1">+</span>
                      <div className="flex-1 text-center bg-[#222] rounded py-1 px-1">{(Math.min(100, selectedNeed.estimatedScale * 5) * 0.2).toFixed(0)} <span className="text-[9px] block opacity-50">Vul. Idx</span></div>
                      <span className="mx-1">=</span>
                      <div className={`flex-1 text-center font-bold rounded py-1 px-1 ${getScoreColor(selectedNeed.criticalityScore)}`}>{selectedNeed.criticalityScore.toFixed(1)} <span className="text-[9px] block opacity-50 text-white/50">Total</span></div>
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
                    <div className="bg-[#252525] p-4 rounded-lg border border-green-800/30 shadow-lg">
                      <h4 className="text-xs text-uppercase text-gray-400 mb-1 tracking-wider uppercase">Assigned To</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-green-400">{dispatchResult.volunteer.name}</span>
                        <span className="text-xs bg-[#121212] px-2 py-1 rounded text-gray-400 border border-gray-800">{dispatchResult.volunteer.reliabilityRate * 100}% Rating</span>
                      </div>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                         <span className="bg-blue-900/40 text-blue-300 px-2 rounded mr-2">{dispatchResult.volunteer.preferredLanguage} Speaker</span>
                         Hours: {dispatchResult.volunteer.hoursLast30Days}/20
                      </div>
                    </div>

                    <div className="bg-[#121212] p-4 rounded-lg border border-gray-800 relative shadow-inner">
                      <h4 className="text-[10px] text-gray-400 mb-2 absolute -top-2 left-4 bg-[#121212] px-2 py-0 border border-gray-800 rounded">AI Personalised WhatsApp Text</h4>
                      <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap font-mono relative z-10 leading-relaxed">
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


