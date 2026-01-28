import React, { useState } from 'react';
import { UserPreferences } from '../types';
import { Sparkles, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: (prefs: UserPreferences) => void;
}

const GENRES = ["Sci-Fi", "Mystery", "Romance", "History", "Fantasy", "Business", "Philosophy", "Thriller"];
const GOALS = [
  { id: "relax", label: "Relax & Escape", icon: "🍵" },
  { id: "learn", label: "Learn & Grow", icon: "🧠" },
  { id: "adventure", label: "Adventure", icon: "🗺️" }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [name, setName] = useState('');

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(prev => prev.filter(item => item !== g));
    } else {
      if (selectedGenres.length < 3) {
        setSelectedGenres(prev => [...prev, g]);
      }
    }
  };

  const handleNext = () => {
    if (step === 1 && name.trim()) setStep(2);
    else if (step === 2 && selectedGenres.length > 0) setStep(3);
    else if (step === 3 && selectedGoal) {
      onComplete({
        name: name,
        genres: selectedGenres,
        readingGoal: selectedGoal,
        onboardingComplete: true,
        joinDate: Date.now()
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#F5F5F7]">
      <div className="max-w-xl w-full p-8 animate-spring">
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-12">
          <div className={`h-1 w-12 rounded-full transition-colors ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`} />
          <div className={`h-1 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`} />
           <div className={`h-1 w-12 rounded-full transition-colors ${step >= 3 ? 'bg-black' : 'bg-gray-200'}`} />
        </div>

        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-white rounded-[2rem] shadow-lg mb-6 rotate-3">
             <Sparkles size={32} className="text-blue-500" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
             {step === 1 ? "Welcome Traveler" : step === 2 ? "What do you like to read?" : "Why are you reading?"}
          </h1>
          <p className="text-gray-500 text-lg">
             {step === 1 ? "What should we call you?" : step === 2 ? "Pick up to 3 genres." : "Help us curate your perfect suitcase."}
          </p>
        </div>

        <div className="min-h-[200px]">
          
          {step === 1 && (
             <div className="animate-in fade-in slide-in-from-bottom-4">
               <input 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full text-center text-3xl font-bold border-b-2 border-gray-200 focus:border-black bg-transparent outline-none py-2"
                 placeholder="Enter your name"
                 autoFocus
               />
             </div>
          )}

          {step === 2 && (
            <div className="flex flex-wrap justify-center gap-3 animate-in fade-in slide-in-from-bottom-4">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-6 py-3 rounded-full text-lg font-medium transition-all duration-300 ${
                    selectedGenres.includes(genre)
                      ? 'bg-black text-white shadow-lg scale-105'
                      : 'bg-white text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4">
              {GOALS.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.label)}
                  className={`flex items-center gap-4 p-5 rounded-[2rem] text-left transition-all duration-300 border-2 ${
                    selectedGoal === goal.label
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-transparent bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="text-3xl">{goal.icon}</span>
                  <span className={`text-xl font-bold ${selectedGoal === goal.label ? 'text-blue-900' : 'text-gray-700'}`}>
                    {goal.label}
                  </span>
                  {selectedGoal === goal.label && <Check className="ml-auto text-blue-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={handleNext}
            disabled={step === 1 ? !name.trim() : step === 2 ? selectedGenres.length === 0 : !selectedGoal}
            className="group flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            {step === 3 ? 'Finish Setup' : 'Next'}
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};