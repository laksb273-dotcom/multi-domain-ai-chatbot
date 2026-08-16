import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import ModeSelection from './components/ModeSelection';
import Chat from './components/Chat';
import { DomainMode } from './types';
import { motion, AnimatePresence } from 'framer-motion';

import { ErrorBoundary } from './components/ErrorBoundary';

function MainApp() {
  const { user, loading } = useAuth();
  const [selectedMode, setSelectedMode] = useState<DomainMode | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          {!selectedMode ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ModeSelection onSelect={setSelectedMode} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Chat mode={selectedMode} onBack={() => setSelectedMode(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
