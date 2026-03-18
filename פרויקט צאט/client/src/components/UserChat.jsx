import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client';

const socket = io('http://localhost:3003', { transports: ['websocket'] });

// פונקציה ליצירת roomId חדש
const generateRoomId = () => `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

function UserChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isWaiting, setIsWaiting] = useState(false);
    const [agentJoined, setAgentJoined] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [agentName, setAgentName] = useState('נציג');
    const [currentRoomId, setCurrentRoomId] = useState(() => generateRoomId());
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        socket.emit('join_room', currentRoomId);

        socket.on('receive_message', (data) => {
            setMessages(prev => [...prev, data]);
            setIsTyping(false);
        });

        socket.on('agent_joined', (data) => {
            setAgentJoined(true);
            setIsWaiting(false);
            setAgentName(data.agentName);
        });

        socket.on('display_typing', (data) => {
            if (data.sender !== 'user') {
                setIsTyping(true);
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
            }
        });

        return () => {
            socket.off('receive_message');
            socket.off('agent_joined');
            socket.off('display_typing');
        };
    }, [currentRoomId]);

    const sendMessage = () => {
        if (!input.trim()) return;
        socket.emit('send_message', { text: input, roomId: currentRoomId, sender: 'user' });
        setInput('');
    };

    const handleTyping = (e) => {
        setInput(e.target.value);
        socket.emit('typing', { roomId: currentRoomId, sender: 'user' });
    };

    const closeAndRestartChat = () => {
        // שליחת אירוע לשרת על סגירת הצאט
        socket.emit('close_chat', currentRoomId);
        
        // איפוס המצב המקומי
        setMessages([]);
        setInput('');
        setAgentJoined(false);
        setIsWaiting(false);
        setIsTyping(false);
        setAgentName('נציג');
        
        // ליצור roomId חדש
        const newRoomId = generateRoomId();
        setCurrentRoomId(newRoomId);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-3 text-white">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1">
                            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="font-semibold text-base">מרכז תמיכה</h2>
                                <span className="text-xs opacity-90 flex items-center">
                                    {agentJoined ? (
                                        <>
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5"></div>
                                            {agentName} זמין
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mr-1.5 animate-pulse"></div>
                                            מחפש נציג...
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>
                        
                        {/* Close Chat Button */}
                        {agentJoined && (
                            <button
                                onClick={closeAndRestartChat}
                                title="סגור צאט והתחל חדש"
                                className="ml-2 p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Messages */}
                {agentJoined && (
                    <div className="h-80 overflow-y-auto p-3 space-y-3 bg-slate-50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-2.5 rounded-xl text-sm ${
                                    m.sender === 'user' 
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-sm shadow-md' 
                                        : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200 shadow-sm'
                                }`}>
                                    {m.sender !== 'user' && (
                                        <div className="text-xs font-medium text-purple-600 mb-1">
                                            {m.sender}
                                        </div>
                                    )}
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
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
                )}

                {/* Input */}
                {agentJoined && (
                    <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                        <input 
                            value={input}
                            onChange={handleTyping}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="כתוב הודעה..."
                            className="flex-1 border border-slate-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        />
                        <button 
                            onClick={sendMessage} 
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-2 rounded-full transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                        >
                            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                            </svg>
                        </button>
                    </div>
                )}

                {/* Waiting State */}
                {!agentJoined && (
                    <div className="h-80 flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                        <div className="text-center px-6">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="text-base font-semibold text-slate-700 mb-2">
                                {isWaiting ? 'מחפש נציג אנושי...' : 'ברוכים הבאים!'}
                            </h3>
                            <p className="text-slate-500 text-xs leading-relaxed mb-4">
                                {isWaiting
                                    ? 'אנא המתן רגע, נציג מקצועי יחובר אליך בקרוב'
                                    : 'יש לך שאלה? לחץ על הכפתור למטה כדי להתחבר לנציג אנושי'
                                }
                            </p>
                            {!isWaiting && (
                                <button
                                    onClick={() => {
                                        setIsWaiting(true);
                                        socket.emit('request_agent', currentRoomId);
                                    }}
                                    disabled={isWaiting}
                                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                                        isWaiting
                                            ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                                    }`}
                                >
                                    {isWaiting ? 'מחפש נציג...' : 'בקש נציג'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
export default UserChat;