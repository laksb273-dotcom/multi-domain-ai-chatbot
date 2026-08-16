import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { DomainMode, Message, DEFAULT_QUESTIONS } from '../types';
import { generateResponse } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  ArrowLeft, 
  History, 
  Plus,
  Bot,
  User as UserIcon,
  X,
  FileText,
  Languages
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ChatProps {
  mode: DomainMode;
  onBack: () => void;
}

const LANGUAGES = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'es-ES', name: 'Español', nativeName: 'Español' },
  { code: 'fr-FR', name: 'Français', nativeName: 'Français' },
  { code: 'de-DE', name: 'Deutsch', nativeName: 'Deutsch' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
];

export default function Chat({ mode, onBack }: ChatProps) {
  const { profile } = useAuth();
  const { 
    sessions, 
    currentSession, 
    setCurrentSession, 
    messages, 
    createSession, 
    sendMessage 
  } = useChat(mode);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechSupported, setSpeechSupported] = useState({ recognition: false, synthesis: false });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Check for browser support and load voices
  useEffect(() => {
    const recognition = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const synthesis = 'speechSynthesis' in window;
    setSpeechSupported({ recognition, synthesis });

    if (synthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const extractMainAnswer = (text: string) => {
    // 1. Check for [MAIN_ANSWER] tags
    const tagMatch = text.match(/\[MAIN_ANSWER\](.*?)\[\/MAIN_ANSWER\]/s);
    if (tagMatch && tagMatch[1]) {
      return tagMatch[1].replace(/[#*`]/g, '').trim();
    }

    // 2. Remove markdown symbols
    let cleanText = text.replace(/[#*`]/g, '');
    
    // 3. Fallback to common markers
    const markers = ['Summary:', 'Answer:', 'Conclusion:', 'Main Answer:'];
    for (const marker of markers) {
      const index = cleanText.toLowerCase().indexOf(marker.toLowerCase());
      if (index !== -1) {
        const contentAfterMarker = cleanText.substring(index + marker.length).trim();
        if (contentAfterMarker.length > 0) {
          const paragraphs = contentAfterMarker.split('\n').filter(p => p.trim().length > 0);
          if (paragraphs.length > 0) {
            return paragraphs[0];
          }
        }
      }
    }
    
    // 4. Otherwise, just take the first non-empty paragraph
    const paragraphs = cleanText.split('\n').filter(p => p.trim().length > 0);
    if (paragraphs.length > 0) {
      if (paragraphs[0].length < 30 && paragraphs.length > 1) {
        return paragraphs[0] + " " + paragraphs[1];
      }
      return paragraphs[0];
    }
    
    return cleanText;
  };

  const handleSend = async (e?: React.FormEvent, overrideInput?: string, forceSpeak?: boolean) => {
    e?.preventDefault();
    const messageToSend = overrideInput || input;
    if ((!messageToSend.trim() && !attachedFile) || loading) return;

    let session = currentSession;
    if (!session) {
      const sessionId = await createSession(`${messageToSend.slice(0, 30)}...`, mode);
      if (!sessionId) return;
    }

    const userMessage = messageToSend;
    const currentFile = attachedFile;
    
    setInput('');
    setAttachedFile(null);
    setLoading(true);

    try {
      await sendMessage(userMessage || `Attached file: ${currentFile?.name}`, 'user', currentFile ? 'file' : 'text');

      // Construct history including the message just sent
      const history = [
        ...messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
        {
          role: 'user' as const,
          parts: [{ text: userMessage || `Attached file: ${currentFile?.name}` }]
        }
      ];

      const selectedLangObj = LANGUAGES.find(l => l.code === selectedLang);
      const aiResponse = await generateResponse(
        mode, 
        userMessage, 
        history, 
        currentFile ? { data: currentFile.data, mimeType: currentFile.mimeType } : undefined,
        selectedLangObj?.name || 'English'
      );

      await sendMessage(aiResponse, 'model', 'text');
      
      if (autoSpeak || forceSpeak) {
        speak(extractMainAnswer(aiResponse));
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Initialize Speech Recognition
  const initRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = selectedLang;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && transcript.trim()) {
        setInput(transcript);
        // Auto-send the transcript directly using the ref to avoid stale state issues
        // Pass true for forceSpeak to ensure voice output for voice input
        handleSendRef.current(undefined, transcript, true);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        alert('Microphone access was denied. To use voice input, please click the lock icon in your browser address bar (top left), set Microphone to "Allow", and then refresh the page.');
      } else if (event.error === 'network') {
        alert('Network error occurred during speech recognition. Please check your connection.');
      } else if (event.error === 'no-speech') {
        // Silently handle no speech detected
      } else {
        alert(`Speech recognition error: ${event.error}. Please try again.`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  };

  const toggleListening = async () => {
    if (!speechSupported.recognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
      setIsListening(false);
      return;
    }

    try {
      // 1. Check permission state first if supported (Permissions API)
      if (navigator.permissions && (navigator.permissions as any).query) {
        try {
          const status = await (navigator.permissions as any).query({ name: 'microphone' });
          if (status.state === 'denied') {
            alert('Microphone access is blocked. To fix this:\n1. Click the lock icon in your browser address bar (top left).\n2. Set Microphone to "Allow".\n3. Refresh the page.');
            return;
          }
        } catch (e) {
          // Fallback to getUserMedia if query fails or is not supported for 'microphone'
        }
      }

      // 2. Explicitly request microphone permission using getUserMedia
      // This is the most reliable way to trigger the browser's permission prompt
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the stream immediately after getting permission to release the microphone
          stream.getTracks().forEach(track => track.stop());
        } catch (permErr: any) {
          console.error('Microphone permission denied via getUserMedia:', permErr);
          setIsListening(false);
          
          if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
            alert('Microphone access was denied. To enable it:\n1. Click the lock icon in the address bar.\n2. Change Microphone to "Allow".\n3. Try again.');
          } else if (permErr.name === 'NotFoundError' || permErr.name === 'DevicesNotFoundError') {
            alert('No microphone was found. Please connect a microphone and try again.');
          } else if (permErr.name === 'NotReadableError' || permErr.name === 'TrackStartError') {
            alert('Your microphone is already in use by another application. Please close it and try again.');
          } else {
            alert(`Microphone error: ${permErr.message || 'Permission denied'}. Please ensure your microphone is connected and enabled in your system settings.`);
          }
          return;
        }
      }

      // 3. Initialize and start Speech Recognition
      const recognition = initRecognition();
      if (!recognition) {
        alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
        return;
      }
      
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start recognition:', err);
      setIsListening(false);
      
      if (err.name === 'NotAllowedError' || err.message?.includes('denied')) {
        alert('Microphone access was denied. Please enable it in your browser settings and try again.');
      } else {
        alert('Could not start voice input. Please ensure your microphone is connected and try again.');
      }
    }
  };

  const speak = (text: string) => {
    if (!speechSupported.synthesis || !text.trim()) return;

    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find a voice that matches the selected language
    const voices = window.speechSynthesis.getVoices();
    const langCode = selectedLang.split('-')[0].toLowerCase();
    
    // Try to find an exact match or at least a language match
    // Prioritize "Google" or "Microsoft" voices as they are usually better
    const voice = voices.find(v => v.lang.toLowerCase() === selectedLang.toLowerCase() && (v.name.includes('Google') || v.name.includes('Microsoft'))) ||
                  voices.find(v => v.lang.toLowerCase() === selectedLang.toLowerCase()) || 
                  voices.find(v => v.lang.toLowerCase().startsWith(langCode) && (v.name.includes('Google') || v.name.includes('Microsoft'))) ||
                  voices.find(v => v.lang.toLowerCase().startsWith(langCode));
    
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = selectedLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsSpeaking(false);
    };

    // Small delay to ensure previous speech is fully cancelled
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const data = base64.split(',')[1];
      
      if (file.type === 'application/pdf' || file.type.includes('wordprocessingml')) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const res = await fetch('/api/parse-document', {
            method: 'POST',
            body: formData
          });
          const result = await res.json();
          if (result.text) {
            setAttachedFile({ data, mimeType: file.type, name: file.name });
            setInput(prev => prev + `\n\n[Document Content: ${result.text.slice(0, 1000)}...]`);
          }
        } catch (err) {
          console.error(err);
          alert('Failed to parse document');
        }
      } else {
        setAttachedFile({ data, mimeType: file.type, name: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar - History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 w-80 bg-slate-900 border-r border-slate-800 z-50 p-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                History
              </h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <button 
              onClick={() => { setCurrentSession(null); setShowHistory(false); }}
              className="flex items-center gap-2 w-full p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 transition-colors mb-4"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>

            <div className="flex-1 overflow-y-auto space-y-2">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setCurrentSession(s); setShowHistory(false); }}
                  className={`w-full text-left p-3 rounded-xl transition-colors ${currentSession?.id === s.id ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50'}`}
                >
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(s.updatedAt?.toDate()).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-950/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-900 rounded-lg text-slate-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-bold text-lg">{mode} Mode</h2>
              <p className="text-xs text-slate-500">AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 mr-2">
              <Languages className="w-4 h-4 text-slate-500" />
              <select 
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-transparent text-xs text-slate-300 border-none focus:ring-0 outline-none cursor-pointer"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} className="bg-slate-900">{l.nativeName}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`p-2 rounded-lg transition-colors ${autoSpeak ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-slate-900 text-slate-400'}`}
              title={autoSpeak ? "Auto-speak ON" : "Auto-speak OFF"}
            >
              {autoSpeak ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setShowHistory(true)}
              className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 flex items-center gap-2"
            >
              <History className="w-5 h-5" />
              <span className="hidden md:inline text-sm">History</span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-8"
              >
                <div className="p-6 bg-blue-500/10 rounded-3xl inline-block mb-4">
                  <Bot className="w-16 h-16 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">How can I help you today?</h3>
                <p className="text-slate-400 text-sm mb-8">Select a suggested question or start typing below.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {DEFAULT_QUESTIONS[mode]?.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(undefined, q)}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-blue-500/50 hover:bg-slate-800/50 transition-all group"
                    >
                      <p className="text-sm text-slate-300 group-hover:text-white">{q}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-blue-500' : 'bg-slate-800'}`}>
                {m.role === 'user' ? <UserIcon className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
              </div>
              <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl relative group ${m.role === 'user' ? 'bg-blue-600' : 'bg-slate-900 border border-slate-800'}`}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>
                    {m.content.replace(/\[MAIN_ANSWER\](.*?)\[\/MAIN_ANSWER\]/gs, '$1')}
                  </ReactMarkdown>
                </div>
                {m.role === 'model' && (
                  <button 
                    onClick={() => speak(extractMainAnswer(m.content))}
                    className="absolute -right-10 top-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-800 rounded-lg text-slate-500"
                    title="Speak main answer"
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-blue-500 animate-pulse' : ''}`} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center animate-pulse">
                <Bot className="w-6 h-6" />
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl animate-pulse">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-700 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-700 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-700 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <form 
            onSubmit={handleSend}
            className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl focus-within:border-blue-500/50 transition-colors"
          >
            {attachedFile && (
              <div className="flex items-center gap-2 p-2 mb-2 bg-slate-800 rounded-xl mx-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-xs truncate flex-1">{attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-slate-700 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex gap-1 p-1">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-xl transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-slate-800 text-slate-400'}`}
                  title="Voice input"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload}
                  className="hidden" 
                  accept="image/*,application/pdf,.docx"
                />
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? "Listening..." : `Ask ${mode} AI...`}
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-sm max-h-32 min-h-[44px]"
                rows={1}
              />
              <button
                type="submit"
                disabled={(!input.trim() && !attachedFile) || loading}
                className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
          <p className="text-[10px] text-center mt-3 text-slate-600">
            {currentSession ? `Session: ${currentSession.messageCount}/20 messages` : 'New session will start on first message'}
          </p>
        </div>
      </div>
    </div>
  );
}
