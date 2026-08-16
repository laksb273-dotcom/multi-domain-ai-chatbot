import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { ChatSession, Message, DomainMode } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function useChat(mode: DomainMode | null) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser || !mode) return;

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', auth.currentUser.uid),
      where('mode', '==', mode),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      setSessions(chatSessions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats');
    });

    return () => unsubscribe();
  }, [mode]);

  useEffect(() => {
    if (!currentSession) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', currentSession.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(chatMessages);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${currentSession.id}/messages`);
    });

    return () => unsubscribe();
  }, [currentSession]);

  const createSession = async (title: string, mode: DomainMode) => {
    if (!auth.currentUser) return;

    const newSession = {
      userId: auth.currentUser.uid,
      mode,
      title,
      messageCount: 0,
      updatedAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'chats'), newSession);
      setCurrentSession({ id: docRef.id, ...newSession } as ChatSession);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };

  const sendMessage = async (content: string, role: 'user' | 'model', type: 'text' | 'image' | 'file' = 'text') => {
    if (!currentSession || !auth.currentUser) return;

    // Check limit (15-20 messages)
    if (currentSession.messageCount >= 20 && role === 'user') {
      throw new Error('Message limit reached for this session (20 messages). Please start a new chat.');
    }

    const message = {
      role,
      content,
      type,
      timestamp: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'chats', currentSession.id, 'messages'), message);
      await updateDoc(doc(db, 'chats', currentSession.id), {
        messageCount: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${currentSession.id}/messages`);
    }
  };

  return {
    sessions,
    currentSession,
    setCurrentSession,
    messages,
    createSession,
    sendMessage,
    loading
  };
}
