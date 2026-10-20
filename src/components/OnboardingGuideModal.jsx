import React, { useState } from 'react';
import {
  X, Check, ShieldCheck, ChevronRight, ChevronLeft, Sparkles, Navigation,
  Car, Bike, Award, FileText, ArrowRight, Play, Trophy, Users, MapPin
} from 'lucide-react';

export default function OnboardingGuideModal({
  isOpen,
  onClose,
  onStartExploring
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      id: 'step-1',
      tag: 'Step 1 • Ground Discovery',
      title: 'Find Safe, Empty Parking Lots Near You',
      subtitle: 'Zero traffic anxiety. Practice starts, turns, and braking safely.',
      color: 'from-emerald-600 to-teal-700',
      badgeColor: 'bg-emerald-500/20 text-emerald-300',
      illustration: (
        <div className="relative w-full h-44 bg-zinc-900 rounded-2xl overflow-hidden border border-emerald-500/30 flex items-center justify-center p-3">
          {/* Grid lines simulating parking lot */}
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#34C759_1px,transparent_1px),linear-gradient(to_bottom,#34C759_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          {/* Safe Zone Polygon Simulation */}
          <div className="relative z-10 w-4/5 h-28 rounded-2xl bg-emerald-500/20 border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center text-center p-2 shadow-lg backdrop-blur-xs">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full mb-1">
              🟢 Safe Zone • Candlestick Civic Lot
            </span>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>65m Open Width</span>
              <span>•</span>
              <span className="text-emerald-300">0.1 cars/min</span>
            </div>
            <p className="text-[10px] text-zinc-300 mt-0.5">
              Ideal Practice: 2:00 PM – 6:00 PM (Low Traffic)
            </p>
          </div>

          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 rounded-full text-[9px] text-emerald-400 font-mono">
            Within 2.1 km of GPS
          </div>
        </div>
      ),
      description: 'RoadReady continuously scans satellite geometry and real-time road conditions to highlight spacious, empty parking lots and quiet boulevards within 5 km of your location.'
    },
    {
      id: 'step-2',
      tag: 'Step 2 • Virtual Cones',
      title: 'Practice Parallel Parking With Virtual Cones',
      subtitle: 'No real cones needed. Master parking maneuvers on your phone.',
      color: 'from-orange-600 to-amber-700',
      badgeColor: 'bg-orange-500/20 text-orange-300',
      illustration: (
        <div className="relative w-full h-44 bg-zinc-900 rounded-2xl overflow-hidden border border-orange-500/30 flex items-center justify-center p-4">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#F97316_1px,transparent_1px)] bg-[size:16px_16px]"></div>
          
          {/* Parking Bay with Virtual Cones */}
          <div className="relative z-10 w-full flex items-center justify-around px-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl animate-bounce">▲</span>
              <span className="text-[9px] font-mono text-orange-400">Cone 1</span>
            </div>
            <div className="w-24 h-14 border-2 border-dashed border-orange-400 rounded-xl flex items-center justify-center bg-orange-500/10">
              <span className="text-xs font-bold text-orange-200">🚗 Your Car</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl animate-bounce">▲</span>
              <span className="text-[9px] font-mono text-orange-400">Cone 2</span>
            </div>
          </div>

          <div className="absolute bottom-2 inset-x-0 text-center">
            <span className="text-[10px] font-bold text-zinc-300 bg-black/60 px-2.5 py-1 rounded-full">
              Parallel Parking • 90° Reverse Bay • Motorcycle U-Turn Box
            </span>
          </div>
        </div>
      ),
      description: 'Drop precision virtual cones onto any empty pavement. Practice aligning with the curb, reverse parking into tight bays, or slalom weave without damaging any vehicle.'
    },
    {
      id: 'step-3',
      tag: 'Step 3 • DMV Simulation',
      title: 'Drive Your Official DMV Road Test Route',
      subtitle: 'Examiner audio scoring, turn maneuvers, & critical checklist.',
      color: 'from-blue-600 to-indigo-700',
      badgeColor: 'bg-blue-500/20 text-blue-300',
      illustration: (
        <div className="relative w-full h-44 bg-zinc-900 rounded-2xl overflow-hidden border border-blue-500/30 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>🎖️</span> Daly City DMV Route (18 mins)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-apple-green text-zinc-900 font-black text-[10px]">
              SCORE: 90 / 100 PASSED
            </span>
          </div>

          {/* Siri Examiner Dialog Simulation */}
          <div className="p-2.5 bg-black/60 rounded-xl border border-white/10 text-xs flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              🎙️
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-zinc-400 block">Siri Examiner Audio</span>
              <p className="text-[11px] text-white italic">"Check mirrors, signal right, and stop before the white limit line."</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-white/5">
            <span>✓ 4-Way Intersection Yield</span>
            <span>✓ Blind Spot Head Check</span>
            <span>✓ Smooth Stop</span>
          </div>
        </div>
      ),
      description: 'Rehearse the exact turn-by-turn route used by your local DMV licensing office. Siri speaks examiner instructions live over your car speakers, grading you as you drive.'
    },
    {
      id: 'step-4',
      tag: 'Step 4 • Certified Log',
      title: 'Export Official DMV 50-Hour Driving Log',
      subtitle: 'Instant State Form DL-50HRS PDF with supervisor sign-off lines.',
      color: 'from-amber-600 to-orange-700',
      badgeColor: 'bg-amber-500/20 text-amber-300',
      illustration: (
        <div className="relative w-full h-44 bg-zinc-900 rounded-2xl overflow-hidden border border-amber-500/30 p-3.5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400">STATE FORM DL-50HRS</span>
              <h4 className="text-sm font-black text-white">Supervised Driving Certification</h4>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-md">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[9px] text-zinc-400 block">Day Practice</span>
              <span className="font-bold text-white text-sm">40 hrs</span>
            </div>
            <div className="p-2 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[9px] text-zinc-400 block">Night Practice</span>
              <span className="font-bold text-white text-sm">10 hrs</span>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/40">
              <span className="text-[9px] text-emerald-300 block">Total Met</span>
              <span className="font-black text-emerald-400 text-sm">50 / 50</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>Parent Affidavit Included</span>
            <span className="text-amber-400 font-bold">Examiner Stamp Box Ready</span>
          </div>
        </div>
      ),
      description: 'Track your mandatory 50 practice hours with 1 tap. Generate a printable, certified PDF logbook formatted to official DMV state guidelines to hand directly to your examiner.'
    }
  ];

  const active = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      if (onStartExploring) onStartExploring();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl bg-zinc-950 text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden my-auto animate-scaleUp">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Gradient Header */}
        <div className={`p-6 bg-gradient-to-r ${active.color} transition-all duration-500 relative`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${active.badgeColor}`}>
              {active.tag}
            </span>
            <span className="text-[10px] text-white/80 font-mono">
              Slide {currentSlide + 1} of {slides.length}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            {active.title}
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md">
            {active.subtitle}
          </p>
        </div>

        {/* Visual Illustration & Description */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Active Graphic Illustration */}
          <div className="transition-all duration-300">
            {active.illustration}
          </div>

          {/* Description Text */}
          <p className="text-xs text-zinc-300 leading-relaxed">
            {active.description}
          </p>

          {/* Progress Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {slides.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full cursor-pointer transition-all ${
                  currentSlide === idx ? 'w-8 bg-emerald-500' : 'w-2 bg-white/20'
                }`}
              ></div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              {currentSlide === slides.length - 1 ? (
                <>
                  <span>Start Driving with RoadReady</span>
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Next Feature</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
