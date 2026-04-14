import React from 'react';
import Lottie from 'lottie-react';
// Make sure to download a success Lottie JSON and place it in your assets folder
import successAnimation from '../assets/success.json';

const PayoutAnimation = ({ show, amount, mode }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center border border-emerald-500/30 transform scale-100 animate-bounce-short">
        
        {/* Lottie Animation Context */}
        <div className="w-40 h-40 mb-4">
          <Lottie 
            animationData={successAnimation} 
            loop={false}
            className="w-full h-full"
          />
        </div>

        {/* Dynamic Amount */}
        <h2 className="text-3xl font-extrabold text-emerald-400 mb-2">
          ₹{amount / 100} Credited
        </h2>

        {/* Dynamic Mode Branding */}
        <p className="text-slate-400 font-medium tracking-wide">
          {mode === "fallback" ? "Paid Via Razorpay" : "Paid via Razorpay"}
        </p>
      </div>
    </div>
  );
};

export default PayoutAnimation;
