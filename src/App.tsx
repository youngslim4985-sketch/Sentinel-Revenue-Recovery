import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Users, 
  Bell, 
  Send, 
  X, 
  ChevronRight, 
  Phone, 
  User, 
  Clock,
  ShieldCheck,
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  CreditCard,
  Settings
} from "lucide-react";
import MasterHub from "./components/MasterHub";

// --- Types ---
interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  lastMessage: string;
  timestamp: string;
}

interface Message {
  role: "user" | "bot";
  text: string;
}

// --- Components ---

const LeadDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filterClientId, setFilterClientId] = useState<string>("");
  const [clients, setClients] = useState<any[]>([]);
  
  // Revenue Projection States
  const [avgDealValue, setAvgDealValue] = useState(1500);
  const conversionRate = 0.20;
  const potentialRevenue = leads.length * avgDealValue * conversionRate;

  const mockLocations = [
    { id: '1', name: 'North West Region', leadsToday: 42, health: 85, groupId: 'REGION_NORTH_WEST' },
    { id: '2', name: 'Europe Central', leadsToday: 28, health: 92, groupId: 'REGION_EUROPE' },
    { id: '3', name: 'Asia Pacific', leadsToday: 15, health: 78, groupId: 'REGION_APAC' },
  ];

  useEffect(() => {
    const fetchClients = async () => {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    };
    fetchClients();
  }, []);

  useEffect(() => {
    const fetchLeads = async (retries = 3) => {
      try {
        const url = filterClientId 
          ? `/api/leads?groupId=${filterClientId}&order=desc` 
          : `/api/leads?order=desc`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server responded with ${res.status}: ${text.substring(0, 100)}`);
        }
        const data = await res.json();
        setLeads(data);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        if (retries > 0) {
          console.log(`Retrying fetch... (${retries} attempts left)`);
          setTimeout(() => fetchLeads(retries - 1), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [filterClientId]);

  useEffect(() => {
    // WebSocket Setup
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_lead") {
        const newLead = data.lead;
        // Only add to list if it matches current filter (clientId or groupId)
        if (!filterClientId || newLead.clientId === filterClientId || newLead.groupId === filterClientId) {
          setLeads(prev => [newLead, ...prev]);
        }
        
        // Add notification
        const id = Date.now();
        setNotifications(prev => [...prev, { id, lead: newLead }]);
        
        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
      }
    };

    socket.onopen = () => console.log("Connected to Dashboard Real-time Feed");
    socket.onclose = () => console.log("Disconnected from Dashboard Real-time Feed");

    return () => {
      socket.close();
    };
  }, [filterClientId]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 relative">
      {/* Toast Notifications */}
      <div className="fixed top-20 right-8 z-[60] space-y-4">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl border border-indigo-400 flex items-center gap-4 min-w-[300px]"
            >
              <div className="bg-white/20 p-2 rounded-xl">
                <Bell className="animate-bounce" size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">New Lead Captured!</p>
                <p className="text-xs text-indigo-100">{n.lead.name || "Anonymous"} just messaged.</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="ml-auto hover:bg-white/10 p-1 rounded-lg"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] flex items-center gap-3">
            <LayoutDashboard className="text-indigo-600" />
            Lead Sentinel Hub
          </h1>
          <p className="text-slate-500 mt-1 italic">Real-time lead capture monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Clients (Master View)</option>
            <optgroup label="Business Clients">
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="Regional Nodes">
              {mockLocations.map(l => (
                <option key={l.groupId} value={l.groupId}>{l.name}</option>
              ))}
            </optgroup>
          </select>
          <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-slate-600">Live Monitoring</span>
          </div>
        </div>
      </header>

      <div className="mb-8">
        <MasterHub 
          locations={mockLocations} 
          onSelectRegion={(id) => setFilterClientId(prev => prev === id ? "" : id)}
          activeRegion={filterClientId}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Leads</h3>
              <Users className="text-indigo-500 w-5 h-5" />
            </div>
            <p className="text-4xl font-bold text-slate-800">{leads.length}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Potential Revenue</h3>
              <DollarSign className="text-emerald-500 w-5 h-5" />
            </div>
            <p className="text-4xl font-bold text-slate-800">
              ${potentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-50">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                <span>Avg. Deal Value</span>
                <span className="text-indigo-600">${avgDealValue}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="10000" 
                step="100"
                value={avgDealValue}
                onChange={(e) => setAvgDealValue(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                <TrendingUp size={10} /> Based on {conversionRate * 100}% conversion rate
              </p>
            </div>
          </div>
          
          <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
            <h3 className="text-lg font-semibold mb-2">Sentinel v2 Active</h3>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Your AI Lead Hunter is currently patrolling your site. All captures are encrypted and logged.
            </p>
          </div>
        </div>

        {/* Lead List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-bold text-slate-800">Recent Captures</h2>
              <Bell className="text-slate-400 w-5 h-5" />
            </div>
            
            <div className="divide-y divide-slate-50">
              {leads.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-medium">No leads captured yet. Start a chat to see them appear!</p>
                </div>
              ) : (
                leads.map((lead) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={lead.id} 
                    className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                          {lead.name?.[0] || "?"}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {lead.name || "Anonymous Lead"}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Phone size={14} /> {lead.phone || "No phone"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={14} /> {new Date(lead.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="mt-3 text-sm bg-slate-100 p-3 rounded-lg text-slate-600 italic border-l-2 border-indigo-400">
                            "{lead.lastMessage}"
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-indigo-400 transition-all" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatWidget = ({ activeClient }: { activeClient: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeClient) {
      setMessages([{ role: "bot", text: `Hello! I'm your AI concierge for ${activeClient.name}. How can I help you today?` }]);
    }
  }, [activeClient?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai-lead-concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userMsg,
          clientId: activeClient?.id,
          conversationId: "conv_" + Date.now()
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", text: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "bot", text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!activeClient) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-[380px] h-[520px] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-6"
          >
            {/* Header */}
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold">{activeClient.name}</h3>
                  <p className="text-xs text-indigo-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Online
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-3 uppercase tracking-widest font-semibold">
                Powered by Sentinel AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 w-16 h-16 rounded-full shadow-xl flex items-center justify-center text-white hover:bg-indigo-700 transition-colors"
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </motion.button>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<"dashboard" | "demo" | "partner" | "financials">("dashboard");
  const [clients, setClients] = useState<any[]>([]);
  const [activeClient, setActiveClient] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, activeRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/active-client")
        ]);
        const clientsData = await clientsRes.json();
        const activeData = await activeRes.json();
        setClients(clientsData);
        setActiveClient(activeData);
      } catch (err) {
        console.error("Initial Data Fetch Error:", err);
      }
    };
    fetchData();

    // WebSocket for real-time activation
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "client_activated") {
        setClients(prev => prev.map(c => 
          c.id === data.clientId ? { ...c, status: "active" } : c
        ));
        setActiveClient((prev: any) => {
          if (prev?.id === data.clientId) {
            return { ...prev, status: "active" };
          }
          return prev;
        });
      }
    };

    return () => socket.close();
  }, []); // Only run once on mount

  const switchClient = async (clientId: string) => {
    const res = await fetch("/api/set-active-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId })
    });
    const data = await res.json();
    setActiveClient(data.activeClient);
    // No longer reloading, state will update via useEffect in ChatWidget
  };

  return (
    <div className="font-sans antialiased text-slate-900">
      {/* Navigation for Demo Purposes */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40 flex items-center px-8 justify-between">
        <div className="flex items-center gap-2 font-bold text-indigo-600">
          <ShieldCheck />
          <span>SENTINEL CORE</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setView("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "dashboard" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setView("partner")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "partner" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Partner Program
          </button>
          <button 
            onClick={() => setView("financials")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "financials" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Financials
          </button>
          <button 
            onClick={() => setView("demo")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "demo" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Live Site Demo
          </button>
        </div>
      </nav>

      <main className="pt-16">
        {view === "dashboard" && <LeadDashboard />}
        
        {view === "partner" && (
          <div className="min-h-screen bg-[#F8FAFC] p-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-[#1E293B] flex items-center gap-3">
                <Users className="text-indigo-600" />
                Sentinel Partner Program
              </h1>
              <p className="text-slate-500 mt-1">Turn your clients into a commission-free sales force</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {clients.map(client => (
                  <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                          {client.name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">{client.name}</h3>
                          <p className="text-sm text-slate-500">{client.industry} • {client.status}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const subject = `A quick thank you + an invitation for ${client.name}`;
                          const body = `Hi ${client.name},\n\nNow that your Sentinel system is live and capturing leads, I wanted to reach out with a quick thank you for being an early partner.\n\nI’m looking to bring this technology to a few more businesses in the ${client.industry} space. Since you’ve seen the impact of the 'Revenue Recovery' firsthand, I wanted to set up a win-win referral program for you.\n\nHow it works:\nFor every business owner you introduce to me who implements a Sentinel Node, I will apply a $500 credit to your monthly maintenance retainer.\n\nIf you refer just one person, your system is essentially free for the next month. If you refer more, we can apply those credits toward new feature rollouts or system upgrades.\n\nIs there anyone in your network who is currently frustrated by missed phone calls or slow lead follow-ups? If so, I’d love a simple email introduction.\n\nBest,\n[Your Name]\nFounder, Sentinel Systems`;
                          window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        <Send size={16} />
                        Generate Partner Email
                      </button>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Preview</p>
                      <p className="text-sm text-slate-600 italic leading-relaxed">
                        "For every business owner you introduce to me who implements a Sentinel Node, I will apply a $500 credit to your monthly maintenance retainer..."
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                  <h3 className="text-lg font-semibold mb-2">The Strategy</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed">
                    By offering a high-value credit, you bypass the "sales pitch" and move straight into "trusted recommendation" territory.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4">Program Rules</h3>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5" />
                      $500 credit per successful referral
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5" />
                      Applies to monthly maintenance retainer
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5" />
                      Stackable credits for upgrades
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "financials" && (
          <div className="min-h-screen bg-[#F8FAFC] p-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-[#1E293B] flex items-center gap-3">
                <TrendingUp className="text-emerald-600" />
                Post-Sprint Financial Health
              </h1>
              <p className="text-slate-500 mt-1">10-Day Sprint Performance Audit</p>
            </header>

            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Category</th>
                      <th className="px-8 py-4 text-sm font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <tr>
                      <td className="px-8 py-6 font-medium text-slate-600">Starting Balance</td>
                      <td className="px-8 py-6 text-right font-mono text-slate-400">$0.11</td>
                    </tr>
                    <tr>
                      <td className="px-8 py-6 font-medium text-slate-600">Client 1 Revenue (Sentinel Solutions)</td>
                      <td className="px-8 py-6 text-right font-mono text-emerald-600 font-bold">$3,100.00</td>
                    </tr>
                    <tr>
                      <td className="px-8 py-6 font-medium text-slate-600">Group Client Revenue (Pro Sentinel Node)</td>
                      <td className="px-8 py-6 text-right font-mono text-emerald-600 font-bold">$6,200.00</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="px-8 py-6 font-bold text-slate-800">Gross Total</td>
                      <td className="px-8 py-6 text-right font-mono text-2xl font-black text-slate-900">$9,300.11</td>
                    </tr>
                    <tr>
                      <td className="px-8 py-6 font-medium text-slate-600">Estimated Expenses (API + Hosting)</td>
                      <td className="px-8 py-6 text-right font-mono text-rose-500">~ $45.00</td>
                    </tr>
                    <tr className="bg-emerald-50">
                      <td className="px-8 py-6 font-bold text-emerald-900 text-lg">Net Profit</td>
                      <td className="px-8 py-6 text-right font-mono text-3xl font-black text-emerald-600">$9,255.11</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <ShieldCheck className="text-indigo-600" size={18} />
                    Sprint Status: SUCCESS
                  </h3>
                  <p className="text-sm text-slate-500">
                    You have successfully executed a high-stakes pivot. Momentum is now self-sustaining.
                  </p>
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
                  <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                    <Bell className="text-amber-600" size={18} />
                    Maintenance Tip
                  </h3>
                  <p className="text-sm text-amber-700">
                    Monitor Firebase Usage daily. Upgrade to Blaze Plan once you cross 10 clients.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "demo" && (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-2xl">
              <div className="mb-12">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">Demo Configuration</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {clients.map(c => (
                    <div key={c.id} className="relative">
                      <button
                        onClick={() => switchClient(c.id)}
                        className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all border-2 flex flex-col items-center gap-1 ${
                          activeClient?.id === c.id 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md" 
                            : "border-slate-100 text-slate-400 hover:border-slate-200"
                        }`}
                      >
                        <span>{c.industry}: {c.name}</span>
                        <span className={`text-[10px] uppercase tracking-tighter px-2 py-0.5 rounded-full ${
                          c.status === "active" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        }`}>
                          {c.status}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Widget Integration Snippet */}
              <div className="mb-12 max-w-2xl mx-auto text-left">
                <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-slate-300 text-sm font-bold flex items-center gap-2">
                      <Settings size={16} className="text-indigo-400" />
                      Widget Integration Snippet
                    </h3>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md font-mono">v2.0.4</span>
                  </div>
                  <pre className="text-indigo-300 font-mono text-xs overflow-x-auto p-4 bg-black/30 rounded-xl border border-white/5 leading-relaxed">
{`<script 
  src="https://cdn.sentinel-systems.io/v2/widget.js" 
  data-client-id="${activeClient?.id}" 
  data-theme="dark"
  async>
</script>`}
                  </pre>
                  <p className="text-slate-500 text-[10px] mt-4 italic">
                    Paste this snippet before the closing &lt;/body&gt; tag of your website to activate the Sentinel Concierge.
                  </p>
                </div>
              </div>

              {activeClient?.status === "pending" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-12 p-6 bg-amber-50 border border-amber-200 rounded-3xl max-w-md mx-auto"
                >
                  <p className="text-amber-800 text-sm font-medium mb-4">
                    This client's AI service is currently <span className="font-bold">Pending Activation</span>. 
                    The widget will not respond until the setup fee is paid.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={async () => {
                        const res = await fetch("/api/create-checkout-session", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ clientId: activeClient.id })
                        });
                        const data = await res.json();
                        if (data.url) {
                          window.location.href = data.url;
                        } else {
                          alert(data.error || "Failed to create checkout session. Make sure STRIPE_SECRET_KEY is set in Settings.");
                        }
                      }}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                      <CreditCard size={18} />
                      Pay $3,100 (Real Stripe)
                    </button>
                    
                    <button 
                      onClick={async () => {
                        // Simulate Stripe Webhook
                        await fetch("/api/webhook/stripe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            type: "checkout.session.completed",
                            data: { object: { metadata: { clientId: activeClient.id }, amount_total: 310000, customer: "cus_mock_123" } }
                          })
                        });
                      }}
                      className="bg-amber-100 text-amber-700 px-6 py-2 rounded-xl text-sm font-bold hover:bg-amber-200 transition-colors"
                    >
                      Simulate Payment (Mock)
                    </button>
                  </div>
                </motion.div>
              )}

              {activeClient?.status === "active" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-12 p-6 bg-emerald-50 border border-emerald-200 rounded-3xl max-w-md mx-auto"
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <ShieldCheck size={18} />
                    </div>
                    <h3 className="font-bold text-emerald-900">Sentinel Node Active</h3>
                  </div>
                  <p className="text-emerald-800 text-sm mb-4">
                    The AI Concierge is live and recovering leads. Revenue tracking and real-time routing are enabled.
                  </p>
                  <button 
                    onClick={async () => {
                      const res = await fetch("/api/create-portal-session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ clientId: activeClient.id })
                      });
                      const data = await res.json();
                      if (data.url) {
                        window.location.href = data.url;
                      } else {
                        alert(data.error || "Failed to open billing portal.");
                      }
                    }}
                    className="flex items-center justify-center gap-2 text-emerald-700 text-sm font-bold hover:text-emerald-800 transition-colors mx-auto"
                  >
                    <Settings size={16} />
                    Manage Billing & Subscription
                  </button>
                </motion.div>
              )}

              <h1 className="text-5xl font-black text-slate-900 mb-6 leading-tight">
                {activeClient?.name} <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Website</span>
              </h1>
              <p className="text-xl text-slate-500 leading-relaxed mb-12">
                This is a live demo of the Sentinel Widget for the <span className="font-bold text-slate-800">{activeClient?.industry}</span> industry. 
                The AI persona is tuned to capture leads for <span className="italic">{activeClient?.name}</span>.
              </p>
              
              <div className="grid grid-cols-3 gap-6 opacity-20 grayscale pointer-events-none">
                <div className="h-40 bg-slate-200 rounded-3xl" />
                <div className="h-40 bg-slate-200 rounded-3xl" />
                <div className="h-40 bg-slate-200 rounded-3xl" />
              </div>
            </div>
          </div>
        )}
      </main>

      <ChatWidget activeClient={activeClient} />
    </div>
  );
}
