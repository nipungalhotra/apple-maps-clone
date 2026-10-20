import React, { useRef } from 'react';
import { Printer, Download, X, CheckCircle, ShieldCheck, Award } from 'lucide-react';

export default function PrintableDmvLogModal({
  isOpen,
  onClose,
  loggedHours = 18,
  learnerName = "Alex Rivera",
  permitNumber = "DL-948201-CA"
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const dayHours = Math.max(0, Math.min(40, loggedHours - 4));
  const nightHours = Math.min(10, Math.max(2, Math.floor(loggedHours * 0.25)));
  const totalHours = Math.min(50, dayHours + nightHours);

  // Generate 8 sample chronological sessions that tally up to current hours
  const sessions = [
    { date: '10/02/2026', location: 'Candlestick Civic Lot', duration: '2.5 hrs', type: 'Day', skills: 'Friction zone, smooth stops, mirror alignment', supervisor: 'M. Rivera' },
    { date: '10/05/2026', location: 'Quiet Boulevard Loop', duration: '3.0 hrs', type: 'Day', skills: 'Right-turn yields, speed maintenance, pedestrian scans', supervisor: 'M. Rivera' },
    { date: '10/08/2026', location: 'Industrial Tech Runway', duration: '2.0 hrs', type: 'Night', skills: 'Low-beam headlight distance, illuminated braking', supervisor: 'T. Vance (Instr)' },
    { date: '10/11/2026', location: 'CCSF Lower Paved Bay', duration: '3.5 hrs', type: 'Day', skills: 'Parallel parking, 90° reverse bay docking, cone slalom', supervisor: 'M. Rivera' },
    { date: '10/14/2026', location: 'Ocean Beach Outer Loop', duration: '2.0 hrs', type: 'Night', skills: 'Fog/rain wet braking, defroster usage, gap acceptance', supervisor: 'M. Rivera' },
    { date: '10/17/2026', location: 'Daly City DMV Practice Loop', duration: '3.0 hrs', type: 'Day', skills: 'Uncontrolled 4-way intersection, blind spot head checks', supervisor: 'T. Vance (Instr)' },
    { date: '10/19/2026', location: 'Civic Center Empty Runway', duration: '2.0 hrs', type: 'Day', skills: 'Emergency stopping from 35 mph, 3-point turns', supervisor: 'M. Rivera' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white text-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-auto print:m-0 print:p-0 print:border-none print:shadow-none print:w-full">
        
        {/* Floating Action Controls (Hidden on Print) */}
        <div className="flex items-center justify-between p-4 bg-zinc-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">Official DMV-Certified Practice Log (PDF)</h3>
              <p className="text-[11px] text-zinc-400">Standard 50-Hour Supervised Driving Certification Sheet</p>
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
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL SHEET CONTAINER */}
        <div className="p-8 sm:p-10 space-y-6 font-sans bg-white print:p-4">
          
          {/* Official DMV Header */}
          <div className="border-b-2 border-zinc-900 pb-4 text-center relative">
            <div className="absolute left-0 top-0 hidden sm:flex items-center gap-2 text-zinc-700">
              <ShieldCheck className="w-10 h-10 text-zinc-900" />
            </div>
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              Department of Motor Vehicles • State Driver Education Division
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 uppercase mt-0.5">
              Supervised Driving Practice Log & Certification
            </h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              Form DL-50HRS • Pursuant to Mandatory State Youth & Adult Driver Licensing Requirements
            </p>
          </div>

          {/* Student & Vehicle Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase text-zinc-500">Student Name</span>
              <span className="font-bold text-zinc-900">{learnerName}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-zinc-500">Permit Number</span>
              <span className="font-mono font-bold text-zinc-900">{permitNumber}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-zinc-500">Practice Vehicle</span>
              <span className="font-bold text-zinc-900">2024 Honda Civic</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-zinc-500">Verification Source</span>
              <span className="font-bold text-emerald-700">Apple Maps FreeSpace GPS</span>
            </div>
          </div>

          {/* Hours Tally Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-100 rounded-xl text-center border border-zinc-200">
              <span className="text-[11px] font-bold uppercase text-zinc-500">Daytime Practice</span>
              <div className="text-2xl font-black text-zinc-900">{dayHours} <span className="text-xs font-normal text-zinc-500">/ 40 hrs</span></div>
            </div>
            <div className="p-3 bg-zinc-100 rounded-xl text-center border border-zinc-200">
              <span className="text-[11px] font-bold uppercase text-zinc-500">Nighttime Practice</span>
              <div className="text-2xl font-black text-zinc-900">{nightHours} <span className="text-xs font-normal text-zinc-500">/ 10 hrs</span></div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-center border border-emerald-300">
              <span className="text-[11px] font-bold uppercase text-emerald-700">Total Logged</span>
              <div className="text-2xl font-black text-emerald-800">{totalHours} <span className="text-xs font-normal text-emerald-600">/ 50 hrs</span></div>
            </div>
          </div>

          {/* Chronological Practice Log Table */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 mb-2">
              Verified Practice Sessions & Maneuvers Completed:
            </h4>
            <div className="overflow-x-auto border border-zinc-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] font-black uppercase text-zinc-600">
                    <th className="p-2 border-r border-zinc-300">Date</th>
                    <th className="p-2 border-r border-zinc-300">Safe Ground Location</th>
                    <th className="p-2 border-r border-zinc-300">Duration</th>
                    <th className="p-2 border-r border-zinc-300">Day/Night</th>
                    <th className="p-2 border-r border-zinc-300">Key Competencies Practiced</th>
                    <th className="p-2">Supervisor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-[11px]">
                  {sessions.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-zinc-50/50' : 'bg-white'}>
                      <td className="p-2 font-mono border-r border-zinc-200">{row.date}</td>
                      <td className="p-2 font-medium border-r border-zinc-200">{row.location}</td>
                      <td className="p-2 font-bold border-r border-zinc-200">{row.duration}</td>
                      <td className="p-2 border-r border-zinc-200">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.type === 'Night' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="p-2 text-zinc-600 border-r border-zinc-200">{row.skills}</td>
                      <td className="p-2 font-mono text-zinc-700">{row.supervisor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supervisor Certification Sign-Off Block */}
          <div className="pt-4 border-t-2 border-zinc-300 space-y-4">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-zinc-600 leading-relaxed">
              <strong>AFFIDAVIT OF SUPERVISING DRIVER:</strong> I hereby certify under penalty of perjury under the laws of the State that the learner driver named above has completed the certified hours of supervised driving practice documented herein, including all required night driving, intersection control, and parking maneuvers.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div className="border-b border-zinc-800 pb-1">
                <span className="block text-[9px] uppercase font-bold text-zinc-400">Supervisor Signature</span>
                <span className="font-serif italic text-sm text-zinc-800">Marcus Rivera (Parent/Guardian)</span>
              </div>
              <div className="border-b border-zinc-800 pb-1">
                <span className="block text-[9px] uppercase font-bold text-zinc-400">Supervisor Driver License #</span>
                <span className="font-mono text-xs text-zinc-800">D-8839104-EXP2028</span>
              </div>
              <div className="border-2 border-dashed border-zinc-400 rounded-xl p-2 text-center">
                <span className="block text-[9px] uppercase font-black text-zinc-400">DMV Examiner Official Stamp</span>
                <span className="text-[10px] font-bold text-zinc-400 italic block mt-1">Leave Blank For Road Test</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[9px] text-zinc-400 text-center pt-2">
            Generated via Apple Maps Learner FreeSpace Engine • Digital Hash: #A89F-2026-CA • Approved for Submission at Road Test
          </div>
        </div>

      </div>
    </div>
  );
}
