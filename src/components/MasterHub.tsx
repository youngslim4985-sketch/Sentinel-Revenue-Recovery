import React from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  leadsToday: number;
  health: number;
  groupId: string;
}

interface MasterHubProps {
  locations: Location[];
  onSelectRegion: (groupId: string) => void;
  activeRegion: string;
}

const MasterHub: React.FC<MasterHubProps> = ({ locations, onSelectRegion, activeRegion }) => {
  return (
    <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-white shadow-2xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-blue-500" /> Sentinel Multi-Node Dashboard
        </h2>
        <div className="text-right">
          <p className="text-slate-400 text-sm">Aggregated 10-Day Revenue Impact</p>
          <p className="text-3xl font-mono text-green-400">+$12,450.00</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {locations.map((loc) => (
          <button 
            key={loc.id} 
            onClick={() => onSelectRegion(loc.groupId)}
            className={`text-left bg-slate-900 p-4 rounded-lg border transition-all ${
              activeRegion === loc.groupId 
                ? 'border-blue-500 ring-1 ring-blue-500/50 bg-slate-800' 
                : 'border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex justify-between">
              <span className="text-slate-300 font-semibold">{loc.name}</span>
              <MapPin size={16} className={activeRegion === loc.groupId ? "text-blue-400 animate-pulse" : "text-slate-500"} />
            </div>
            <p className="text-2xl mt-2 font-bold">{loc.leadsToday} <span className="text-xs text-slate-500 font-normal">leads today</span></p>
            <div className="w-full bg-slate-800 h-1 mt-3 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-1000" 
                style={{ width: `${loc.health}%` }}
              ></div>
            </div>
          </button>
        ))}
      </div>

      {/* Map Placeholder - UX Tip: Use a styled Mapbox or Google Map with custom 'Night' styling */}
      <div className="relative w-full h-64 bg-slate-900 rounded-lg border border-dashed border-slate-700 flex items-center justify-center overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
        <div className="z-10 text-center">
          <p className="text-slate-500 italic">Live Territory Heatmap Active</p>
          <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">Scanning Global Nodes...</p>
        </div>
        
        {/* Decorative scanning line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-[scan_3s_linear_infinite]" />
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(256px); }
        }
      `}} />
    </div>
  );
};

export default MasterHub;
