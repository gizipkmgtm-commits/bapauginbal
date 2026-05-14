import React, { useState } from 'react';
import { Baby, Calendar, Scale, Ruler, ArrowRight, Save, Send, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  getWeightForAgeStatus, 
  getHeightForAgeStatus, 
  getWeightForHeightStatus,
  StatusCategory
} from './utils/growthStandards';

interface ChildData {
  name: string;
  nik: string;
  parentName: string;
  posyanduName: string;
  birthDate: string;
  ageMonths: number;
  gender: 'male' | 'female';
  weight: number;
  height: number;
  location?: {
    lat: number;
    lng: number;
  };
}

interface Results {
  weightForAge: StatusCategory;
  heightForAge: StatusCategory;
  weightForHeight: StatusCategory;
}

const calculateDetailedAge = (birthDate: string) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += lastMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = (years * 12) + months;
  return { years, months, days, totalMonths };
};

const EDU_LINK = 'https://s.shopee.co.id/4ft3EgP8y7';

const POSYANDU_OPTIONS = [
  'Posyandu Nusantara',
  'Posyandu Lily Raya',
  'Posyandu Abadi I',
  'Posyandu Jasmine',
  'Posyandu Asoka',
  'Posyandu Sehat Sejahtera',
  'Posyandu Pesona Bhayangkara',
  'Posyandu Assyifa',
  'Posyandu Benawa Raya',
  'Posyandu Citra',
  'Posyandu Rosela',
  'Posyandu Manggis',
  'Posyandu Sekar Tanjung',
  'Posyandu Kuranji',
  'Posyandu Lestari',
  'Posyandu Akhlak Mulia',
  'Posyandu Mustika Indah'
];

export default function App() {
  const [data, setData] = useState<ChildData>({
    name: '',
    nik: '',
    parentName: '',
    posyanduName: '',
    birthDate: '',
    ageMonths: 0,
    gender: 'male',
    weight: 0,
    height: 0,
  });

  const detailedAge = calculateDetailedAge(data.birthDate);

  const [results, setResults] = useState<Results | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [recapStatus, setRecapStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const calculateStatus = async () => {
    if (!data.name || data.weight <= 0 || data.height <= 0) return;

    let currentLocation = data.location;
    if ("geolocation" in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch (err) {
        console.warn("Could not get location:", err);
      }
    }

    const res: Results = {
      weightForAge: getWeightForAgeStatus(data.weight, data.ageMonths, data.gender),
      heightForAge: getHeightForAgeStatus(data.height, data.ageMonths, data.gender),
      weightForHeight: getWeightForHeightStatus(data.weight, data.height, data.gender),
    };

    const updatedData = { ...data, location: currentLocation };
    setData(updatedData);
    setResults(res);
    setExplanation('');
    setRecapStatus('idle');

    // Get AI Explanation
    setLoading(true);

    // Open Education link in new tab automatically
    window.open(EDU_LINK, '_blank');

    try {
      const response = await fetch('/api/nutrition/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childData: updatedData, statusResults: res }),
      });
      const result = await response.json();
      setExplanation(result.explanation);
      
      // Auto Recap (as requested)
      await sendToRecap(updatedData, res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadFormat = () => {
    const headers = "NIK,Nama Balita,Nama Orang Tua,Nama Posyandu,Tanggal Lahir (YYYY-MM-DD),Jenis Kelamin (L/P),Berat Badan (kg),Tinggi Badan (cm)\n";
    const example = "637202...,Ahmad Zaidan,Bpk. Budi,Posyandu Nusantara,2022-05-14,L,12.5,88.0";
    const csvContent = "data:text/csv;charset=utf-8," + headers + example;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Format_Input_Gizi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendToRecap = async (child: ChildData, res: Results) => {
    setRecapStatus('sending');
    try {
      const detailed = calculateDetailedAge(child.birthDate);
      const ageString = detailed ? `${detailed.years} Thn ${detailed.months} Bln ${detailed.days} Hr` : `${child.ageMonths} Bulan`;

      await fetch('/api/nutrition/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timestamp: new Date().toISOString(),
          child, 
          results: res,
          ageString
        }),
      });
      setRecapStatus('success');
    } catch (err) {
      console.error(err);
      setRecapStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-500/20">
            <img 
              src="/logo-puskesmas.png" 
              alt="Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.parentElement) {
                  // Fallback to medical-style icon
                  target.parentElement.innerHTML = `
                    <div class="w-full h-full bg-emerald-600 flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </div>
                  `;
                }
              }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">BaPau <span className="text-emerald-600">GinBal</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Barcode Pemantauan Gizi Anak Balita</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Live Sync Active</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Side: Input Data */}
        <section className="col-span-12 md:col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
              <Baby size={14} className="text-emerald-600" />
              Input Data Antropometri
            </h2>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Nama Lengkap Anak</label>
                <input 
                  type="text" 
                  value={data.name}
                  onChange={e => setData({...data, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                  placeholder="Ahmad Zaidan"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">NIK sesuai KK</label>
                <input 
                  type="text" 
                  value={data.nik}
                  onChange={e => setData({...data, nik: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                  placeholder="637202"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Nama Orang Tua</label>
                <input 
                  type="text" 
                  value={data.parentName}
                  onChange={e => setData({...data, parentName: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                  placeholder="Nama Ayah/Ibu"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Nama Posyandu</label>
                <select 
                  value={data.posyanduName}
                  onChange={e => setData({...data, posyanduName: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium appearance-none"
                >
                  <option value="">Pilih Posyandu</option>
                  {POSYANDU_OPTIONS.sort().map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Tanggal Lahir</label>
                <input 
                  type="date" 
                  value={data.birthDate}
                  onChange={e => {
                    const newDate = e.target.value;
                    const calculated = calculateDetailedAge(newDate);
                    setData({
                      ...data, 
                      birthDate: newDate,
                      ageMonths: calculated ? calculated.totalMonths : data.ageMonths
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                />
              </div>

              {detailedAge && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Usia Saat Ini</span>
                  <div className="text-xs font-bold text-emerald-900">
                    {detailedAge.years} Thn {detailedAge.months} Bln {detailedAge.days} Hr
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Jenis Kelamin</label>
                  <select 
                    value={data.gender}
                    onChange={e => setData({...data, gender: e.target.value as 'male' | 'female'})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium appearance-none"
                  >
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Umur (Bulan)</label>
                  <input 
                    type="number" 
                    value={data.ageMonths || ''}
                    onChange={e => setData({...data, ageMonths: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                    placeholder="24"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">*Bisa diubah manual jika perlu</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Berat (kg)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={data.weight || ''}
                      onChange={e => setData({...data, weight: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                      placeholder="12.4"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Tinggi (cm)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={data.height || ''}
                      onChange={e => setData({...data, height: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                      placeholder="88.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button 
                onClick={calculateStatus}
                disabled={!data.name || data.weight <= 0 || data.height <= 0}
                className="w-full bg-slate-900 text-white py-3.5 rounded-lg font-bold hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2"
              >
                Analisis Gizi
                <ArrowRight size={16} />
              </button>

              <button 
                onClick={downloadFormat}
                className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-lg font-bold hover:bg-slate-50 transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
              >
                Format Spreadsheet
                <Save size={14} />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-white text-xs font-medium">Auto Spreadsheet Recap</p>
                <p className="text-slate-400 text-[10px]">
                  {recapStatus === 'success' ? 'Recap: Gizi_Balita_2024.xlsx' : recapStatus === 'sending' ? 'Syncing...' : 'Ready to sync'}
                </p>
              </div>
            </div>
            {recapStatus === 'success' && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-mono uppercase">Synced</span>
            )}
          </div>
        </section>

        {/* Right Side: Results & AI */}
        <section className="col-span-12 md:col-span-8 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {!results ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-12"
              >
                <div className="bg-slate-50 p-6 rounded-full mb-6">
                  <Info size={40} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Silahkan Masukkan Data</h3>
                <p className="text-slate-400 text-sm mt-3 max-w-xs">Data gizi akan muncul secara otomatis setelah analisis dilakukan.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 flex-1 flex flex-col min-h-0"
              >
                {/* Classification Cards */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">Hasil Klasifikasi Kemenkes</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-tighter">BB / U</p>
                      <p className="text-md font-black text-emerald-900 leading-tight">{results.weightForAge.category}</p>
                      <p className="text-[10px] font-mono text-emerald-700 mt-1">Z: {results.weightForAge.zScore.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-tighter">TB / U</p>
                      <p className="text-md font-black text-emerald-900 leading-tight">{results.heightForAge.category}</p>
                      <p className="text-[10px] font-mono text-emerald-700 mt-1">Z: {results.heightForAge.zScore.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-tighter">BB / TB</p>
                      <p className="text-md font-black text-emerald-900 leading-tight">{results.weightForHeight.category}</p>
                      <p className="text-[10px] font-mono text-emerald-700 mt-1">Z: {results.weightForHeight.zScore.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* AI Analysis Section */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <div className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-black rounded uppercase tracking-tighter">AI Insight</div>
                       <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Rekomendasi Pintar</h2>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                      <div className="space-y-4">
                        <div className="h-3 bg-indigo-100/50 rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-indigo-100/50 rounded w-full animate-pulse" />
                        <div className="h-3 bg-indigo-100/50 rounded w-5/6 animate-pulse" />
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-indigo max-w-none prose-p:text-slate-700 prose-headings:text-indigo-950 prose-li:text-slate-600">
                        <ReactMarkdown>{explanation}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 italic">
                    <Info size={12} />
                    <p>AI didukung oleh basis data Permenkes No. 2 Tahun 2020 tentang Standar Antropometri Anak.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-8 py-3 flex flex-col sm:flex-row justify-between items-center shrink-0 mt-auto">
        <div className="flex gap-6 mb-2 sm:mb-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">API Status: Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Sheets Connector: Stable</span>
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex flex-col items-center sm:items-end gap-1 text-center sm:text-right">
          <div>BaPau GinBal &copy; 2024</div>
          <div className="text-[9px]">Dibuat oleh M. Ariffullah, A.Md.Gz</div>
        </div>
      </footer>
    </div>
  );
}
