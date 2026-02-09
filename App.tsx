
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Database, PackageSearch, ClipboardList, Plus, Trash2, 
  CheckCircle2, AlertCircle, Copy, Search, Save, X, ArrowRight, Filter, 
  MapPin, CheckCircle, FileText, ChevronDown, ChevronUp, Download, 
  Upload, BookMarked, FileSpreadsheet, Globe, ExternalLink, Package, ShieldCheck 
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- TYPES ---
interface MasterRecord {
  id: string;
  style: string;
  po: string;
  color: string;
  size: string;
  cartonNo: string;
  qty: number;
  destination: string;
}

interface PackingRecord {
  id: string;
  date: string;
  line: string;
  cartonNo: string;
  style: string;
  po: string;
  color: string;
  size: string;
  destination: string;
}

// --- SUB-COMPONENTS ---

const Header = () => (
  <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl rotate-3">
        <Package className="text-white w-7 h-7" />
      </div>
      <div>
        <h1 className="font-black text-2xl tracking-tighter text-slate-900 uppercase italic leading-none">
          Packing<span className="text-indigo-600">Expert</span>
        </h1>
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Standalone Web App v1.0 • Pro</p>
      </div>
    </div>
    <div className="hidden md:flex items-center gap-6">
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-black text-slate-400 uppercase italic">Validation Engine</span>
        <div className="flex items-center gap-1.5 text-emerald-500 font-black text-xs uppercase"><ShieldCheck size={14} /> Active</div>
      </div>
      <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-3">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <span className="text-[10px] font-black text-slate-500 uppercase">Local Secure</span>
      </div>
    </div>
  </header>
);

// --- MAIN APP ---

const App = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'input' | 'report'>('dashboard');
  const [masterData, setMasterData] = useState<MasterRecord[]>([]);
  const [packingData, setPackingData] = useState<PackingRecord[]>([]);
  const [poSearch, setPoSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState('L-01');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<Partial<MasterRecord>[]>([]);
  const [inputCarton, setInputCarton] = useState('');
  const [packingStatus, setPackingStatus] = useState<{ type: 'success' | 'error' | 'warning' | null, msg: string }>({ type: null, msg: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedMaster = localStorage.getItem('pack_master');
    const savedPacking = localStorage.getItem('pack_data');
    if (savedMaster) setMasterData(JSON.parse(savedMaster));
    if (savedPacking) setPackingData(JSON.parse(savedPacking));
  }, []);

  useEffect(() => {
    localStorage.setItem('pack_master', JSON.stringify(masterData));
    localStorage.setItem('pack_data', JSON.stringify(packingData));
  }, [masterData, packingData]);

  const groupedMaster = useMemo(() => {
    return masterData.reduce((acc, curr) => {
      const key = `${curr.style}|${curr.po}|${curr.color}|${curr.size}`;
      if (!acc[key]) acc[key] = { 
        style: curr.style, po: curr.po, color: curr.color, size: curr.size, 
        cartons: [], totalQty: 0, destination: curr.destination, key: key 
      };
      acc[key].cartons.push(curr.cartonNo);
      acc[key].totalQty += curr.qty;
      return acc;
    }, {} as Record<string, any>);
  }, [masterData]);

  const filteredInputGroups = useMemo(() => {
    const s = poSearch.toLowerCase();
    return Object.values(groupedMaster).filter((g: any) => g.po.toLowerCase().includes(s) || g.style.toLowerCase().includes(s));
  }, [groupedMaster, poSearch]);

  const filteredReportGroups = useMemo(() => {
    const s = reportSearch.toLowerCase();
    return Object.values(groupedMaster).filter((g: any) => g.po.toLowerCase().includes(s) || g.style.toLowerCase().includes(s));
  }, [groupedMaster, reportSearch]);

  const liveCartonInfo = useMemo(() => {
    if (!inputCarton) return null;
    return masterData.find(m => m.cartonNo.trim().toUpperCase() === inputCarton.trim().toUpperCase());
  }, [inputCarton, masterData]);

  const activeGroup = selectedGroupKey ? groupedMaster[selectedGroupKey] : null;

  const handlePackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return setPackingStatus({ type: 'error', msg: 'PILIH BATCH DULU!' });
    const ctn = inputCarton.trim().toUpperCase();
    if (!ctn) return;

    const masterInfo = masterData.find(m => m.cartonNo === ctn);
    if (!masterInfo) {
      setPackingStatus({ type: 'error', msg: `KARTON ${ctn} TIDAK ADA DI MASTER!` });
    } else if (masterInfo.style !== activeGroup.style || masterInfo.po !== activeGroup.po) {
      setPackingStatus({ type: 'error', msg: `SALAH BARANG! Karton ini untuk PO ${masterInfo.po}` });
    } else if (packingData.find(p => p.cartonNo === ctn)) {
      setPackingStatus({ type: 'warning', msg: `KARTON ${ctn} DOUBLE!` });
    } else {
      setPackingData([{ id: Date.now().toString(), date: new Date().toLocaleDateString(), line: activeLine, cartonNo: ctn, style: activeGroup.style, po: activeGroup.po, color: activeGroup.color, size: activeGroup.size, destination: masterInfo.destination }, ...packingData]);
      setPackingStatus({ type: 'success', msg: `OK - KARTON ${ctn} DITERIMA.` });
      setInputCarton('');
    }
  };

  const exportToExcel = () => {
    const data = Object.values(groupedMaster).map((g: any) => {
      const packed = packingData.filter(p => p.style === g.style && p.po === g.po && p.color === g.color && p.size === g.size);
      const missing = g.cartons.filter((c: string) => !packed.find(p => p.cartonNo === c));
      return { 'STYLE': g.style, 'PO': g.po, 'COLOR': g.color, 'SIZE': g.size, 'TOTAL': g.cartons.length, 'INBOX': packed.length, 'SISA': missing.length, 'MISSING LIST': missing.join(', ') };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PackingReport");
    XLSX.writeFile(wb, `Packing_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const backupData = () => {
    const blob = new Blob([JSON.stringify({ master: masterData, packing: packingData })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Packing_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <nav className="w-64 bg-slate-900 p-4 flex flex-col gap-2 shadow-2xl z-20">
          <SidebarLink active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <SidebarLink active={activeTab === 'master'} onClick={() => setActiveTab('master')} icon={<Database size={18}/>} label="Master Data" />
          <SidebarLink active={activeTab === 'input'} onClick={() => setActiveTab('input')} icon={<PackageSearch size={18}/>} label="Input Packing" />
          <SidebarLink active={activeTab === 'report'} onClick={() => setActiveTab('report')} icon={<ClipboardList size={18}/>} label="Laporan Harian" />
        </nav>

        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total Order" value={masterData.length} sub="Cartons" />
                <StatCard label="Packed" value={packingData.length} sub="Cartons" />
                <StatCard label="Pending" value={masterData.length - packingData.length} sub="Cartons" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                  <h3 className="text-xl font-black uppercase italic text-slate-900">Hosting & URL</h3>
                  <div className="space-y-4">
                    <GuideStep num="1" title="GITHUB PAGES" desc="Upload file index.html, index.tsx, App.tsx ke GitHub Repo." />
                    <GuideStep num="2" title="VERCEL" desc="Drag & drop folder ke Vercel Dashboard untuk URL instan." />
                    <GuideStep num="3" title="BACKUP" desc="Data disimpan di browser. Selalu download backup setiap hari." />
                  </div>
                </div>
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-6">
                  <h3 className="font-black uppercase italic text-sm text-slate-400">System Controls</h3>
                  <button onClick={backupData} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all">
                    <span className="font-black text-[11px] uppercase">Download Backup .json</span>
                    <Download size={20} className="text-indigo-400" />
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all">
                    <span className="font-black text-[11px] uppercase">Restore From Backup</span>
                    <Upload size={20} className="text-emerald-400" />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if(!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const data = JSON.parse(ev.target?.result as string);
                      setMasterData(data.master); setPackingData(data.packing); alert("Restore Sukses!");
                    };
                    reader.readAsText(file);
                  }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'master' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-black uppercase italic text-slate-800 flex items-center gap-2"><Database className="text-indigo-600" /> Database</h3>
                <button onClick={() => setShowBulkModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg">Import Master</button>
              </div>
              <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-200">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Style / PO</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Carton No</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Destination</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {masterData.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6"><div className="font-black text-slate-900 text-sm">{m.style}</div><div className="text-[10px] text-slate-400">{m.po}</div></td>
                        <td className="p-6 text-center font-mono font-black text-indigo-600 text-lg">{m.cartonNo}</td>
                        <td className="p-6 text-[10px] font-black text-slate-400 uppercase italic">{m.destination}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'input' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
              <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col gap-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pilih Batch PO</h4>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input value={poSearch} onChange={(e)=>setPoSearch(e.target.value)} placeholder="Search PO..." className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-indigo-500 outline-none" />
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar">
                  {filteredInputGroups.map((g: any) => (
                    <button key={g.key} onClick={() => setSelectedGroupKey(g.key)} className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedGroupKey === g.key ? 'border-indigo-600 bg-indigo-50 shadow-lg translate-x-1' : 'border-slate-50 bg-white hover:border-slate-200'}`}>
                      <div className="text-[10px] font-black text-slate-900 uppercase leading-none mb-1">{g.style}</div>
                      <div className="text-[9px] font-bold text-slate-400">{g.po}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-8 flex flex-col gap-6">
                {activeGroup ? (
                  <div className="animate-in fade-in duration-300 space-y-6">
                    <div className="bg-indigo-600 text-white p-10 rounded-[3rem] shadow-xl">
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter">{activeGroup.style}</h2>
                      <p className="font-bold text-indigo-100 text-sm mt-1">{activeGroup.po} • {activeGroup.color} • SIZE {activeGroup.size}</p>
                    </div>
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                      <div className="flex gap-4 mb-6">
                        <div className="flex-[1]"><InputUI label="Line" value={activeLine} onChange={setActiveLine} /></div>
                        <div className="flex-[3]">
                          <form onSubmit={handlePackingSubmit}>
                            <InputUI label="Scan No Karton" value={inputCarton} onChange={setInputCarton} autoFocus />
                          </form>
                        </div>
                      </div>
                      {packingStatus.type && (
                        <div className={`p-4 rounded-2xl font-black text-[11px] uppercase italic flex items-center gap-3 ${packingStatus.type === 'success' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-rose-600 text-white'}`}>
                          <CheckCircle2 size={18}/> {packingStatus.msg}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-slate-300">
                    <Filter size={48} />
                    <p className="mt-4 font-black uppercase text-xs">Pilih PO aktif di sebelah kiri</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] flex justify-between items-center shadow-2xl">
                <div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Daily Report</h2>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2">Live Inventory Tracking</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={exportToExcel} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg"><FileSpreadsheet size={18}/> Export Excel</button>
                  <input value={reportSearch} onChange={(e)=>setReportSearch(e.target.value)} placeholder="Filter PO..." className="bg-white/5 border border-white/10 px-6 rounded-2xl text-xs font-bold outline-none focus:bg-white/10 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {filteredReportGroups.map((g: any, idx) => {
                  const packed = packingData.filter(p => p.style === g.style && p.po === g.po);
                  const missing = g.cartons.filter((c: string) => !packed.find(p => p.cartonNo === c));
                  return (
                    <ReportCardUI key={idx} group={g} packedCount={packed.length} missingCartons={missing} />
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <h2 className="font-black uppercase italic tracking-widest">Import Master Data</h2>
              <button onClick={()=>setShowBulkModal(false)}><X /></button>
            </div>
            <div className="p-10 flex-1 grid grid-cols-2 gap-8 overflow-hidden">
              <textarea className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 font-mono text-[10px] outline-none" placeholder="Paste: Style	PO	Color	Size	Ctn	Qty	Dest" value={bulkText} onChange={(e)=>{
                setBulkText(e.target.value);
                const parsed = e.target.value.split('\n').filter(r=>r.trim()!=='').map(r=>{
                  const c = r.split('\t');
                  return { style: c[0], po: c[1], color: c[2], size: c[3], cartonNo: c[4], qty: Number(c[5]), destination: c[6] };
                });
                setBulkPreview(parsed);
              }} />
              <div className="bg-slate-50 rounded-[2rem] p-8 overflow-auto border border-slate-100">
                <table className="w-full text-[10px] font-bold uppercase">
                  <thead className="sticky top-0 bg-slate-200"><tr><th className="p-2 text-left">STYLE</th><th className="p-2">CTN</th></tr></thead>
                  <tbody>{bulkPreview.map((p,i)=><tr key={i} className="border-b border-slate-100"><td className="p-2">{p.style}</td><td className="p-2 text-center text-indigo-600 font-black">{p.cartonNo}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="p-10 bg-slate-50 flex justify-end gap-4">
              <button onClick={()=>{
                const newRecords = bulkPreview.map((p,i)=>({ ...p, id: (Date.now()+i).toString() } as MasterRecord));
                setMasterData([...masterData, ...newRecords]);
                setShowBulkModal(false); setBulkText('');
              }} className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs shadow-xl">Import Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- HELPER COMPONENTS ---

const SidebarLink = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-xl translate-x-2' : 'text-slate-500 hover:text-slate-300 hover:translate-x-1'}`}>
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, sub }: any) => (
  <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <div className="flex items-baseline gap-3">
      <span className="text-5xl font-black text-slate-900">{value}</span>
      <span className="text-[10px] font-black text-slate-400 uppercase italic">{sub}</span>
    </div>
  </div>
);

const GuideStep = ({ num, title, desc }: any) => (
  <div className="flex gap-4">
    <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center font-black text-indigo-600 text-xs shrink-0">{num}</div>
    <div>
      <h4 className="font-black text-[10px] uppercase text-slate-800">{title}</h4>
      <p className="text-[10px] text-slate-400 font-medium leading-tight">{desc}</p>
    </div>
  </div>
);

const InputUI = ({ label, value, onChange, autoFocus }: any) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <input autoFocus={autoFocus} value={value} onChange={(e)=>onChange(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all" />
  </div>
);

const ReportCardUI = ({ group, packedCount, missingCartons }: any) => {
  const [expanded, setExpanded] = useState(false);
  const isDone = missingCartons.length === 0;
  return (
    <div className={`bg-white rounded-[3rem] border-2 p-8 transition-all ${isDone ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100 hover:border-indigo-100 shadow-sm'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h4 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter">{group.style}</h4>
            {isDone && <CheckCircle size={20} className="text-emerald-500" />}
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase">PO: <span className="text-indigo-600 font-black">{group.po}</span> • {group.color} • SZ {group.size} • {group.destination}</p>
        </div>
        <div className="flex items-center gap-10">
          <div className="text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total</p><p className="text-2xl font-black italic">{group.cartons.length}</p></div>
          <div className="text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Inbox</p><p className="text-2xl font-black italic text-emerald-600">{packedCount}</p></div>
          <div className="w-64 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative shadow-inner">
             <div className="flex justify-between items-center mb-2">
                <p className="text-[9px] font-black text-slate-400 uppercase">Sisa Karton</p>
                <span className={`font-mono text-[10px] font-black px-2 py-0.5 rounded-full ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>{isDone ? 'DONE' : missingCartons.length}</span>
             </div>
             <div className={`mt-2 flex flex-wrap gap-1.5 overflow-hidden transition-all ${expanded ? 'max-h-[300px]' : 'max-h-[42px]'}`}>
               {isDone ? <span className="text-[10px] font-black text-emerald-500 italic">SHIPPED ✓</span> : 
                 missingCartons.map((c: string) => <span key={c} className="text-[9px] font-mono font-black bg-white text-rose-600 px-2 py-1 rounded-lg border border-rose-100">{c}</span>)
               }
             </div>
             {!isDone && missingCartons.length > 4 && (
               <button onClick={()=>setExpanded(!expanded)} className="mt-3 w-full text-[8px] font-black text-indigo-500 uppercase tracking-widest">{expanded ? 'Close' : 'View All'}</button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
