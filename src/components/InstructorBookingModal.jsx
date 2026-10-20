import React, { useState } from 'react';
import {
  X, Check, Star, ShieldCheck, Calendar, Clock, MapPin, Phone,
  Car, Award, ChevronRight, CheckCircle2, User, FileText, Send, Sparkles
} from 'lucide-react';

export default function InstructorBookingModal({
  isOpen,
  onClose,
  instructor,
  initialGroundName = 'Local Practice Ground'
}) {
  const [step, setStep] = useState('package'); // 'package' | 'details' | 'success'
  const [selectedPackage, setSelectedPackage] = useState(instructor?.pricingPackages[0] || null);
  const [meetingType, setMeetingType] = useState('ground'); // 'ground' | 'home'
  const [studentName, setStudentName] = useState('Alex Rivera');
  const [studentPhone, setStudentPhone] = useState('(415) 555-0198');
  const [studentPermit, setStudentPermit] = useState('DL-948201-CA');
  const [studentNotes, setStudentNotes] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(instructor?.nextSlot || 'Today at 3:30 PM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);

  if (!isOpen || !instructor) return null;

  const currentPackage = selectedPackage || instructor.pricingPackages[0];

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const bookingPayload = {
      instructorId: instructor.id,
      instructorName: instructor.name,
      schoolName: instructor.schoolName,
      packageId: currentPackage.id,
      packageName: currentPackage.name,
      price: currentPackage.price,
      referralFeeEarned: 25.00, // $25 referral fee from driving school partner
      studentName,
      studentPhone,
      studentPermit,
      meetingLocation: meetingType === 'ground' ? initialGroundName : 'Home Pick-up',
      timeSlot: selectedTimeSlot,
      notes: studentNotes
    };

    try {
      const res = await fetch('/api/instructors/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
      });
      const data = await res.json();
      setBookingConfirmation(data.booking || bookingPayload);
    } catch {
      setBookingConfirmation(bookingPayload);
    }

    setIsSubmitting(false);
    setStep('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden my-auto animate-scaleUp">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white relative">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              Verified Driving School Partner
            </span>
            <span className="text-amber-300 text-xs font-bold flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-300" /> {instructor.rating} ({instructor.reviewsCount} reviews)
            </span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black">{instructor.name}</h3>
              <p className="text-xs text-white/80">{instructor.schoolName} • License #{instructor.licenseNumber}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">${instructor.hourlyRate}</span>
              <span className="text-[11px] text-white/70 block">/ hour</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-[11px] text-white/90">
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5" /> {instructor.car}
            </span>
            <span>•</span>
            <span>{instructor.studentsPassed}+ Passed</span>
          </div>
        </div>

        {/* BODY CONTENT */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* STEP 1: SELECT PACKAGE */}
          {step === 'package' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-1">
                  1. Select Lesson Type & Goals
                </h4>
                <p className="text-xs text-zinc-400">Choose the right coaching session for your current skill level</p>
              </div>

              <div className="space-y-2">
                {instructor.pricingPackages.map((pkg) => {
                  const isSelected = currentPackage.id === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 shadow-sm'
                          : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-black/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{pkg.name}</span>
                            <span className="text-[10px] font-bold text-zinc-400 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
                              {pkg.duration}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {pkg.desc}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-base font-black text-blue-600 dark:text-blue-400">${pkg.price}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instructor Specialties Pills */}
              <div className="pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Verified Skills Coached:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {instructor.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-semibold"
                    >
                      ✓ {spec}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep('details')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <span>Continue to Booking Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: DETAILS & MEETING POINT */}
          {step === 'details' && (
            <form onSubmit={handleConfirmBooking} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    2. Meeting Point & Schedule
                  </h4>
                  <p className="text-xs text-zinc-400">Selected: {currentPackage.name} (${currentPackage.price})</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('package')}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Meeting Location Radio */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  onClick={() => setMeetingType('ground')}
                  className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                    meetingType === 'ground'
                      ? 'border-blue-500 bg-blue-500/10 font-bold text-blue-900 dark:text-blue-200'
                      : 'border-black/5 dark:border-white/5 bg-black/5 text-zinc-600'
                  }`}
                >
                  <MapPin className="w-4 h-4 mb-1 text-blue-500" />
                  <span className="block text-[11px]">Meet at Practice Ground</span>
                  <span className="text-[10px] text-zinc-400 font-normal truncate block">{initialGroundName}</span>
                </div>

                <div
                  onClick={() => setMeetingType('home')}
                  className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                    meetingType === 'home'
                      ? 'border-blue-500 bg-blue-500/10 font-bold text-blue-900 dark:text-blue-200'
                      : 'border-black/5 dark:border-white/5 bg-black/5 text-zinc-600'
                  }`}
                >
                  <Car className="w-4 h-4 mb-1 text-indigo-500" />
                  <span className="block text-[11px]">Home Pick-Up</span>
                  <span className="text-[10px] text-zinc-400 font-normal block">Instructor drives to you</span>
                </div>
              </div>

              {/* Schedule slot */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Time Slot
                </label>
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Today at 3:30 PM">Today at 3:30 PM (Earliest Slot)</option>
                  <option value="Tomorrow at 10:00 AM">Tomorrow at 10:00 AM</option>
                  <option value="Tomorrow at 2:00 PM">Tomorrow at 2:00 PM</option>
                  <option value="Saturday at 11:00 AM">Saturday at 11:00 AM (Weekend)</option>
                  <option value="Sunday at 3:00 PM">Sunday at 3:00 PM (Weekend)</option>
                </select>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Student Name
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Notes for Instructor (Fears, focus areas, vehicle type)
                </label>
                <input
                  type="text"
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="e.g. Scared of parallel parking, need help before DMV test on Friday"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Dispatching Booking Lead...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 fill-white" />
                    <span>Confirm Lesson (${currentPackage.price}) • Pay Instructor In-Person</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-zinc-400 text-center leading-tight">
                No credit card required upfront. You pay Instructor {instructor.name.split(' ')[0]} directly at lesson time.
              </p>
            </form>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 'success' && bookingConfirmation && (
            <div className="text-center space-y-4 py-2 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  Lesson Confirmed
                </span>
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                  Instructor Dispatched!
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                  {instructor.name} will meet you at <strong>{bookingConfirmation.meetingLocation}</strong> on <strong>{bookingConfirmation.timeSlot}</strong> in a dual-brake car.
                </p>
              </div>

              {/* Booking Voucher Summary */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-black/5 dark:border-white/5 text-left text-xs space-y-2">
                <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1.5">
                  <span className="text-zinc-400">Lesson Package:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{bookingConfirmation.packageName}</span>
                </div>
                <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1.5">
                  <span className="text-zinc-400">Instructor Direct Line:</span>
                  <a href={`tel:${instructor.phone}`} className="font-bold text-blue-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {instructor.phone}
                  </a>
                </div>
                <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1.5">
                  <span className="text-zinc-400">Vehicle:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{instructor.car}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Partner Referral B2B Credit:</span>
                  <span>+$25.00 Lead Earned</span>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`tel:${instructor.phone}`}
                  className="flex-1 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {instructor.name.split(' ')[0]}</span>
                </a>

                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
