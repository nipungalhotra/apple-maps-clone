import React from 'react';
import { Printer, X, ClipboardList, Info } from 'lucide-react';

// Printable personal practice-log worksheet.
// IMPORTANT: This is NOT an official DMV form and RoadReady is not affiliated with or
// certified by any DMV. It shows only hours the learner logged in the app and leaves
// session rows and signatures blank to be filled in honestly by hand.
const BLANK_ROWS = 12;

export default function PrintableDmvLogModal({
  isOpen,
  onClose,
  loggedHours = 0,
  nightHours = null
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const total = Math.max(0, Number(loggedHours) || 0);
  const night = typeof nightHours === 'number' ? Math.max(0, nightHours) : null;
  const generatedOn = new Date().toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white text-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto print:m-0 print:p-0 print:border-none print:shadow-none print:w-full">

        {/* Action Controls (Hidden on Print) */}
        <div className="flex items-center justify-between p-4 bg-zinc-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">Printable Practice Log Worksheet</h3>
              <p className="text-[11px] text-zinc-400">Personal record to help you fill in your state's official form</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-apple-blue hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-8 sm:p-10 space-y-6 font-sans bg-white print:p-4">

          {/* Disclaimer */}
          <div className="flex gap-2 p-3 rounded-xl border border-amber-300 bg-amber-50 text-[11px] text-amber-900 leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Not an official DMV document.</strong> RoadReady is not affiliated with, endorsed by, or certified by
              any Department of Motor Vehicles. Use this worksheet as a personal record only, and submit your state's
              official supervised-driving form if one is required.
            </p>
          </div>

          {/* Header */}
          <div className="border-b-2 border-zinc-900 pb-4 text-center">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 uppercase">
              Supervised Driving Practice Log
            </h1>
            <p className="text-xs text-zinc-600 mt-0.5">Personal worksheet • Generated {generatedOn}</p>
          </div>

          {/* Learner Info (filled in by hand) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {['Learner Name', 'Permit Number', 'Practice Vehicle'].map(label => (
              <div key={label} className="border-b border-zinc-500 pb-4">
                <span className="block text-[10px] font-bold uppercase text-zinc-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Hours summary from in-app log */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl text-center border border-emerald-300">
              <span className="text-[11px] font-bold uppercase text-emerald-700">Hours Logged in App</span>
              <div className="text-2xl font-black text-emerald-800">{total} <span className="text-xs font-normal text-emerald-600">hrs</span></div>
            </div>
            <div className="p-3 bg-zinc-100 rounded-xl text-center border border-zinc-200">
              <span className="text-[11px] font-bold uppercase text-zinc-500">Of Which Night</span>
              <div className="text-2xl font-black text-zinc-900">
                {night !== null ? <>{night} <span className="text-xs font-normal text-zinc-500">hrs</span></> : <span className="text-sm font-normal text-zinc-400">record below</span>}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 -mt-3">
            App totals are self-reported by the learner and are not independently verified.
          </p>

          {/* Blank session log table */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 mb-2">
              Practice Sessions (fill in each session)
            </h4>
            <div className="overflow-x-auto border border-zinc-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] font-black uppercase text-zinc-600">
                    <th className="p-2 border-r border-zinc-300">Date</th>
                    <th className="p-2 border-r border-zinc-300">Location</th>
                    <th className="p-2 border-r border-zinc-300">Duration</th>
                    <th className="p-2 border-r border-zinc-300">Day/Night</th>
                    <th className="p-2 border-r border-zinc-300">Skills Practiced</th>
                    <th className="p-2">Supervisor Initials</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {Array.from({ length: BLANK_ROWS }, (_, idx) => (
                    <tr key={idx} className="h-8">
                      <td className="border-r border-zinc-200" />
                      <td className="border-r border-zinc-200" />
                      <td className="border-r border-zinc-200" />
                      <td className="border-r border-zinc-200" />
                      <td className="border-r border-zinc-200" />
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supervisor sign-off (blank) */}
          <div className="pt-4 border-t-2 border-zinc-300 space-y-4">
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Supervising driver: by signing below, you confirm the sessions recorded on this worksheet are accurate.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              {['Supervisor Name', 'Supervisor Signature', 'Date'].map(label => (
                <div key={label} className="border-b border-zinc-800 pb-5">
                  <span className="block text-[9px] uppercase font-bold text-zinc-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9px] text-zinc-400 text-center pt-2">
            Generated by RoadReady • Personal practice record • Not an official government form
          </div>
        </div>

      </div>
    </div>
  );
}
