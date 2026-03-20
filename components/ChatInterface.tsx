import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageCircle, Send, Loader2, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your personal Hijab stylist. Ask me about trends, fabric care, or styling tips!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to persist the chat session across renders, but initialize appropriately
  const chatSessionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initChat = () => {
      const apiKey = process.env.API_KEY;
      if (!apiKey) return;
      const ai = new GoogleGenAI({ apiKey });
      chatSessionRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
              systemInstruction: "You are a friendly, knowledgeable Hijab fashion expert. You provide advice on modest fashion, color theory, fabric choices, and latest hijab trends. Keep answers concise, helpful, and polite."
          }
      });
  };

  useEffect(() => {
      if (!chatSessionRef.current) {
          initChat();
      }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      const modelMsg: ChatMessage = { role: 'model', text: result.text || "I couldn't quite get that." };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting to the styling service right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-140px)] md:h-[600px] flex flex-col bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <header className="p-4 border-b border-stone-100 bg-stone-50/50 flex items-center gap-3">
        <div className="bg-rose-100 p-2 rounded-full text-rose-600">
            <MessageCircle size={20} />
        </div>
        <div>
            <h3 className="font-serif font-bold text-stone-800">Fashion Chat</h3>
            <p className="text-xs text-stone-500">Ask about trends & tips</p>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-stone-800 text-white' : 'bg-rose-100 text-rose-600'}`}>
                    {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                </div>
                <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-stone-800 text-white rounded-tr-none' 
                    : 'bg-white text-stone-700 border border-stone-100 rounded-tl-none'
                }`}>
                    {msg.text}
                </div>
            </div>
          </div>
        ))}
        {loading && (
             <div className="flex justify-start">
             <div className="flex max-w-[80%] gap-2 flex-row">
                 <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-rose-100 text-rose-600">
                     <Sparkles size={14} />
                 </div>
                 <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-stone-100 shadow-sm">
                     <Loader2 size={16} className="animate-spin text-stone-400" />
                 </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-stone-100 bg-white">
        <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
        >
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your fashion question..."
                className="flex-1 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-rose-200 outline-none bg-stone-50 focus:bg-white transition-all"
            />
            <button 
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-rose-500 hover:bg-rose-600 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send size={20} />
            </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
