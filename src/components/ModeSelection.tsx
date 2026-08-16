import React from 'react';
import { DomainMode } from '../types';
import { motion } from 'framer-motion';
import { 
  Stethoscope, 
  Wallet, 
  GraduationCap, 
  Code, 
  Plane, 
  Scale, 
  Megaphone, 
  FlaskConical, 
  Film, 
  MessageSquare,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const MODES: { mode: DomainMode, icon: any, color: string, description: string }[] = [
  { mode: 'Healthcare', icon: Stethoscope, color: 'bg-rose-500/10 text-rose-500', description: 'Medical info & symptoms' },
  { mode: 'Finance', icon: Wallet, color: 'bg-emerald-500/10 text-emerald-500', description: 'Budgeting & markets' },
  { mode: 'Education', icon: GraduationCap, color: 'bg-amber-500/10 text-amber-500', description: 'Tutor & study plans' },
  { mode: 'Coding', icon: Code, color: 'bg-indigo-500/10 text-indigo-500', description: 'Code snippets & debugging' },
  { mode: 'Travel', icon: Plane, color: 'bg-sky-500/10 text-sky-500', description: 'Destinations & itineraries' },
  { mode: 'Legal', icon: Scale, color: 'bg-slate-500/10 text-slate-500', description: 'Legal concepts & terms' },
  { mode: 'Marketing', icon: Megaphone, color: 'bg-orange-500/10 text-orange-500', description: 'Branding & strategy' },
  { mode: 'Science', icon: FlaskConical, color: 'bg-cyan-500/10 text-cyan-500', description: 'Physics, chemistry, biology' },
  { mode: 'Entertainment', icon: Film, color: 'bg-purple-500/10 text-purple-500', description: 'Movies, music, pop culture' },
  { mode: 'General', icon: MessageSquare, color: 'bg-blue-500/10 text-blue-500', description: 'Versatile AI assistant' },
];

interface ModeSelectionProps {
  onSelect: (mode: DomainMode) => void;
}

export default function ModeSelection({ onSelect }: ModeSelectionProps) {
  const { logout, profile } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome, {profile?.displayName}</h1>
            <p className="text-slate-400">Select a specialized AI mode to start your conversation.</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors text-slate-300"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {MODES.map((item, index) => (
            <motion.button
              key={item.mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(item.mode)}
              className="group flex flex-col items-center p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800/50 transition-all text-center"
            >
              <div className={`p-4 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${item.color}`}>
                <item.icon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-1">{item.mode}</h3>
              <p className="text-xs text-slate-500">{item.description}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
