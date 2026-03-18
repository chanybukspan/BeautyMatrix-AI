import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', { transports: ['websocket'] });

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
        <div style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: '#fff',
            borderRadius: '10px',
            boxShadow: '0 4px 24px rgba(162, 103, 105, 0.25)',
            overflow: 'hidden',
            border: '1px solid #ecd9c6',
            direction: 'rtl'
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(to right, #A26769, #BFA5A0, #ECD9C6)',
                padding: '12px',
                color: '#fff'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '8px'
                        }}>
                            <svg style={{ width: '16px', height: '16px' }} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ fontWeight: '600', fontSize: '16px' }}>מרכז תמיכה</h2>
                            <span style={{ fontSize: '12px', opacity: 0.9, display: 'flex', alignItems: 'center' }}>
                                {agentJoined ? (
                                    <>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            backgroundColor: '#10b981',
                                            borderRadius: '50%',
                                            marginLeft: '6px'
                                        }}></div>
                                        {agentName} זמין
                                    </>
                                ) : (
                                    <>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            backgroundColor: '#f59e0b',
                                            borderRadius: '50%',
                                            marginLeft: '6px',
                                            animation: 'pulse 2s infinite'
                                        }}></div>
                                        מחפש נציג...
                                    </>
                                )}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={closeAndRestartChat}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px'
                        }}
                        title="סגור ופתח צ'אט חדש"
                    >
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div style={{
                height: '300px',
                overflowY: 'auto',
                padding: '16px',
                backgroundColor: '#f9f9f9'
            }}>
                {messages.length === 0 && !isWaiting && !agentJoined && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p style={{ color: '#666', marginBottom: '16px' }}>ברוכים הבאים למרכז התמיכה!</p>
                        <button
                            onClick={() => {
                                socket.emit('request_agent', currentRoomId);
                                setIsWaiting(true);
                            }}
                            style={{
                                backgroundColor: '#A26769',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            בקש עזרה מנציג
                        </button>
                    </div>
                )}

                {isWaiting && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '4px solid #ecd9c6',
                            borderTop: '4px solid #A26769',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 16px'
                        }}></div>
                        <p style={{ color: '#666' }}>מחפש נציג זמין...</p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} style={{
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                        <div style={{
                            maxWidth: '70%',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            backgroundColor: msg.sender === 'user' ? '#A26769' : '#e5e5e5',
                            color: msg.sender === 'user' ? '#fff' : '#333',
                            wordWrap: 'break-word'
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
                        <div style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            backgroundColor: '#e5e5e5',
                            color: '#333'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    backgroundColor: '#999',
                                    borderRadius: '50%',
                                    animation: 'bounce 1.4s infinite ease-in-out both'
                                }}></div>
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    backgroundColor: '#999',
                                    borderRadius: '50%',
                                    animation: 'bounce 1.4s infinite ease-in-out 0.2s both'
                                }}></div>
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    backgroundColor: '#999',
                                    borderRadius: '50%',
                                    animation: 'bounce 1.4s infinite ease-in-out 0.4s both'
                                }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            {agentJoined && (
                <div style={{
                    padding: '16px',
                    borderTop: '1px solid #ecd9c6',
                    backgroundColor: '#fff'
                }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={input}
                            onChange={handleTyping}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="הקלד הודעה..."
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: '1px solid #ecd9c6',
                                borderRadius: '6px',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            style={{
                                backgroundColor: '#A26769',
                                color: '#fff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            שלח
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserChat