export type DomainMode = 
  | 'Healthcare' 
  | 'Finance' 
  | 'Education' 
  | 'Coding' 
  | 'Travel' 
  | 'Legal' 
  | 'Marketing' 
  | 'Science' 
  | 'Entertainment' 
  | 'General';

export const DEFAULT_QUESTIONS: Record<DomainMode, string[]> = {
  Healthcare: [
    "What are common symptoms of a cold?",
    "How can I improve my sleep quality?",
    "What should I include in a first-aid kit?",
    "Explain the importance of hydration."
  ],
  Finance: [
    "How do I start a basic budget?",
    "What is the difference between stocks and bonds?",
    "Explain compound interest simply.",
    "Tips for saving for a house down payment."
  ],
  Education: [
    "How can I improve my study habits?",
    "Explain the Pythagorean theorem.",
    "What are some effective note-taking methods?",
    "Help me create a 4-week learning plan for history."
  ],
  Coding: [
    "How do I center a div in CSS?",
    "Explain the difference between let and const in JS.",
    "Show me a basic React functional component.",
    "How do I handle errors in an Express API?"
  ],
  Travel: [
    "What are the top 5 places to visit in Japan?",
    "How do I pack efficiently for a 2-week trip?",
    "What are some budget-friendly travel tips?",
    "Explain how to get a travel visa for Europe."
  ],
  Legal: [
    "What is a non-disclosure agreement (NDA)?",
    "Explain the basics of intellectual property.",
    "What are common elements of a rental contract?",
    "How does small claims court work?"
  ],
  Marketing: [
    "How do I start a social media marketing strategy?",
    "What is SEO and why is it important?",
    "Tips for writing a compelling email newsletter.",
    "Explain the concept of a marketing funnel."
  ],
  Science: [
    "How does photosynthesis work?",
    "Explain Einstein's theory of relativity simply.",
    "What is the difference between DNA and RNA?",
    "How do black holes form?"
  ],
  Entertainment: [
    "Recommend some must-watch sci-fi movies.",
    "Who are the most influential musicians of the 20th century?",
    "What are the top-rated video games of this year?",
    "Explain the history of jazz music."
  ],
  General: [
    "Tell me a joke.",
    "What's the weather like today?",
    "Summarize the latest news in technology.",
    "Give me a recipe for a healthy breakfast."
  ]
};

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  type: 'text' | 'image' | 'file';
  timestamp: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  mode: DomainMode;
  title: string;
  messageCount: number;
  updatedAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
}
