import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

// חשוב: הגדרת הסוקט מחוץ לקומפוננטה מונעת חיבורים כפולים ברינדורים
const socket = io('http://localhost:3001', { 
    transports: ['websocket'],
    autoConnect: true 
});

const AgentClaim = () => {
    const { roomId } = useParams();
    const [status, setStatus] = useState('connecting');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [userTyping, setUserTyping] = useState(false);
    const [agentName, setAgentName] = useState('נציג ראשי');
    const [isClaiming, setIsClaiming] = useState(false);

    useEffect(() => {
        if (!roomId) return;

        // הצטרפות לחדר מיד עם העלייה
        socket.emit('join_room', roomId);

        // האזנה להודעות - תמיד פעילה
        socket.on('receive_message', (data) => {
            console.log("Agent received message:", data);
            setMessages((prev) => [...prev, data]);
        });

        socket.on('display_typing', (data) => {
            if (data.sender === 'user') {
                setUserTyping(true);
                setTimeout(() => setUserTyping(false), 3000);
            }
        });

        socket.on('chat_closed', () => {
            console.log("Chat closed by user");
            setStatus('chat_ended');
        });

        return () => {
            socket.off('receive_message');
            socket.off('display_typing');
            socket.off('chat_closed');
        };
    }, [roomId]);

    const claimChat = () => {
        if (isClaiming || !socket.connected) return;
        setIsClaiming(true);
        socket.emit('agent_claim_chat', { roomId, agentName }, (res) => {
            setIsClaiming(false);
            if (res && res.success) {
                setStatus('success');
                console.log("Claim successful for room:", roomId);
            } else {
                setStatus('failed');
                console.log("Claim failed:", res);
            }
        });
    };

    const send = () => {
        if (!input.trim()) return;
        // שולחים לשרת - השרת יחזיר את זה לכולם ב-receive_message
        socket.emit('send_message', { 
            text: input, 
            roomId, 
            sender: agentName 
        });
        setInput('');
    };

    const closeChat = () => {
        // סגור את הצאט ותנקי את זה בשרת
        socket.emit('close_chat', roomId);
        setStatus('chat_ended');
    };

    if (status === 'failed') return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4" dir="rtl">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden text-center">
                <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 text-white">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">לא ניתן להצטרף לשיחה</h2>
                    <p className="text-red-100 text-sm">ייתכן שנציג אחר כבר מטפל בשיחה זו, או שיש בעיה זמנית</p>
                </div>
                <div className="p-6 space-y-3">
                    <button 
                        onClick={() => setStatus('connecting')} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-bold transition-all duration-200"
                    >
                        נסה שוב
                    </button>
                    <button 
                        onClick={() => window.history.back()} 
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-xl font-bold transition-all duration-200"
                    >
                        חזור
                    </button>
                </div>
            </div>
        </div>
    );

    if (status === 'chat_ended') return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden text-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 text-white">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">הצאט הסתיים</h2>
                    <p className="text-blue-100 text-sm">הלקוח סגר את הצאט ויצר שיחה חדשה</p>
                </div>
                <div className="p-6">
                    <button 
                        onClick={() => window.history.back()} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-bold transition-all duration-200"
                    >
                        חזור לדף הבית
                    </button>
                </div>
            </div>
        </div>
    );
    
    if (status === 'connecting') return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-3 text-white text-center">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold mb-1">הצטרפות לצ'אט נציג</h2>
                    <p className="text-blue-100 text-xs">בחר את זהותך והצטרף לשיחה</p>
                </div>
                
                <div className="p-3">
                    <div className="mb-3">
                        <label className="block text-gray-700 text-xs font-semibold mb-1">
                            <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            בחר את השם שלך:
                        </label>
                        <div className="relative">
                            <select 
                                value={agentName} 
                                onChange={(e) => setAgentName(e.target.value)} 
                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-700 text-xs"
                            >
                                <option value="נציג ראשי">נציג ראשי</option>
                                <option value="אסתר">אסתר</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none">
                                <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={claimChat} 
                        disabled={isClaiming || !socket.connected}
                        className={`w-full py-2 px-3 rounded-lg font-bold text-sm transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                            isClaiming || !socket.connected
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                        }`}
                    >
                        {isClaiming ? (
                            <>
                                <svg className="w-3 h-3 inline mr-1 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                                מצטרף...
                            </>
                        ) : !socket.connected ? (
                            <>
                                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                מתחבר...
                            </>
                        ) : (
                            <>
                                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                הצטרף לצ'אט
                            </>
                        )}
                    </button>
                    
                    <p className="text-center text-gray-500 text-xs mt-2">
                        רק נציג אחד יכול לטפל בשיחה בכל פעם
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-3 text-white">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1">
                            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="font-semibold text-base">צ'אט נציג</h2>
                                <p className="text-xs opacity-90 flex items-center">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5"></div>
                                    מחובר - חדר: {roomId}
                                </p>
                            </div>
                        </div>
                        
                        {/* Close Chat Button */}
                        <button
                            onClick={closeChat}
                            title="סגור את הצאט"
                            className="ml-2 p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="h-80 overflow-y-auto p-3 space-y-3 bg-slate-50">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.sender === agentName ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-2.5 rounded-xl text-sm ${
                                m.sender === agentName 
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-br-sm shadow-md' 
                                    : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200 shadow-sm'
                            }`}>
                                {m.sender !== agentName && (
                                    <div className="text-xs font-medium text-emerald-600 mb-1">
                                        {m.sender}
                                    </div>
                                )}
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {userTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white p-2.5 rounded-xl rounded-bl-sm border border-slate-200 shadow-sm">
                                <div className="flex space-x-1">
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input 
                        value={input} 
                        onChange={(e) => { 
                            setInput(e.target.value); 
                            socket.emit('typing', { roomId, sender: agentName }); 
                        }} 
                        onKeyPress={(e) => e.key === 'Enter' && send()}
                        placeholder="השב ללקוח..."
                        className="flex-1 border border-slate-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    />
                    <button 
                        onClick={send} 
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white p-2 rounded-full transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                    >
                        <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentClaim;