'use client'
import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { assets } from '@/assets/assets';
import VideoCallInterface from '@/components/VideoCallInterface';

const AdminMessages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupedMessages, setGroupedMessages] = useState({});
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [replyInput, setReplyInput] = useState('');
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [viewImage, setViewImage] = useState(null);
    const scrollRef = useRef(null);

    // Call State
    const [peerInstance, setPeerInstance] = useState(null);
    const [myPeerId, setMyPeerId] = useState('');
    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, incoming, active
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [incomingCallData, setIncomingCallData] = useState(null); // { from, peerId, type }
    const [isVideoCall, setIsVideoCall] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState(null); // null, checking, verified, failed
    const [verificationStep, setVerificationStep] = useState(null); // 'blink', 'turn', 'smile'

    // Initializations
    useEffect(() => {
        const initPeer = async () => {
            const { default: Peer } = await import('peerjs');
            const peer = new Peer(null, {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peer.on('open', (id) => {
                setMyPeerId(id);
                setPeerInstance(peer);
            });

            peer.on('call', (call) => {
                setCallStatus('incoming');
                setIncomingCallData(prev => ({ ...prev, callObj: call }));
            });

            peer.on('error', (err) => {
                console.error('Peer error:', err);
            });
        };
        initPeer();
    }, []);

    // Signal Polling
    useEffect(() => {
        const pollSignals = async () => {
            try {
                const res = await fetch('/api/signal');
                const data = await res.json();
                if (data.success && data.signals.length > 0) {
                    data.signals.forEach(signal => handleIncomingSignal(signal));
                }
            } catch (err) {
                console.error("Signal polling error:", err);
            }
        };

        const intervalId = setInterval(pollSignals, 2000);
        return () => clearInterval(intervalId);
    }, [callStatus, selectedEmail]);

    const handleIncomingSignal = (signal) => {
        const signalData = JSON.parse(signal.data);

        switch (signal.type) {
            case 'CALL_INVITE':
                if (callStatus === 'idle') {
                    setSelectedEmail(signal.from);
                    setIncomingCallData({ from: signal.from, peerId: signalData.peerId, type: signalData.type });
                    setIsVideoCall(signalData.type === 'video');
                    setCallStatus('incoming');
                }
                break;
            case 'CALL_CANCELLED':
            case 'CALL_REJECTED':
            case 'CALL_ENDED':
                toast.error(`Call ${signal.type.split('_')[1].toLowerCase()} by user`);
                endCall(false);
                break;
            case 'VERIFY_STEP':
                setVerificationStep(signalData.step);
                break;
            case 'VERIFY_RESULT':
                setVerificationStatus(signalData.status);
                setVerificationStep(null);
                if (signalData.status === 'verified') {
                    toast.success("Identity Verified: Subject is Human");
                } else {
                    toast.error("Identity Audit Failed");
                }
                break;
            default:
                break;
        }
    };

    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/admin/messages');
            const data = await response.json();
            if (data.success) {
                const sorted = data.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                const grouped = sorted.reduce((acc, msg) => {
                    if (!acc[msg.email]) acc[msg.email] = [];
                    acc[msg.email].push(msg);
                    return acc;
                }, {});

                // Sort groups by latest message
                const sortedGroups = Object.keys(grouped)
                    .sort((a, b) => {
                        const lastA = grouped[a][grouped[a].length - 1];
                        const lastB = grouped[b][grouped[b].length - 1];
                        return new Date(lastB.createdAt) - new Date(lastA.createdAt);
                    })
                    .reduce((acc, key) => {
                        acc[key] = grouped[key];
                        return acc;
                    }, {});

                setGroupedMessages(sortedGroups);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!selectedEmail && Object.keys(groupedMessages).length > 0) {
            setSelectedEmail(Object.keys(groupedMessages)[0]);
        }
    }, [groupedMessages]);

    const sendSignal = async (to, type, data = {}) => {
        try {
            await fetch('/api/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, type, data })
            });
        } catch (err) {
            console.error("Signal send error:", err);
        }
    };

    const handleSendReply = async (e) => {
        if (e) e.preventDefault();
        if (!replyInput.trim() || !selectedEmail) return;

        const msgs = groupedMessages[selectedEmail];
        const lastMsg = msgs[msgs.length - 1];
        const newReply = lastMsg.reply ? lastMsg.reply + "\n\n" + replyInput : replyInput;

        try {
            const response = await fetch('/api/admin/messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: lastMsg._id, reply: newReply })
            });
            const data = await response.json();
            if (data.success) {
                setReplyInput('');
                fetchMessages();
                setIsAtBottom(true);
            }
        } catch (error) {
            toast.error('Error sending reply');
        }
    };

    const logCallMessage = async (logText) => {
        if (!selectedEmail) return;
        const msgs = groupedMessages[selectedEmail];
        if (!msgs || msgs.length === 0) return;
        const lastMsg = msgs[msgs.length - 1];

        const logContent = `[CALL_LOG]:${logText}`;
        const newReply = lastMsg.reply ? lastMsg.reply + "\n\n" + logContent : logContent;

        try {
            await fetch('/api/admin/messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: lastMsg._id, reply: newReply })
            });
            fetchMessages();
        } catch (err) {
            console.error("Log call error:", err);
        }
    };

    const startCall = async (video) => {
        if (!selectedEmail || !peerInstance || !myPeerId) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
            setLocalStream(stream);
            setIsVideoCall(video);
            setCallStatus('calling');

            await sendSignal(selectedEmail, 'CALL_INVITE', { peerId: myPeerId, type: video ? 'video' : 'audio' });
            logCallMessage(`Started a ${video ? 'video' : 'audio'} call`);
        } catch (err) {
            toast.error("Media access denied");
        }
    };

    const acceptCall = async () => {
        if (!incomingCallData) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });
            setLocalStream(stream);

            if (incomingCallData.callObj) {
                const call = incomingCallData.callObj;
                call.answer(stream);
                call.on('stream', (remote) => {
                    setRemoteStream(remote);
                    setCallStatus('active');
                });
                call.on('close', () => endCall(false));
            } else if (incomingCallData.peerId) {
                const call = peerInstance.call(incomingCallData.peerId, stream);
                call.on('stream', (remote) => {
                    setRemoteStream(remote);
                    setCallStatus('active');
                });
                call.on('close', () => endCall(false));
            }
        } catch (err) {
            toast.error("Call error");
            endCall(true);
        }
    };

    const handleVerify = async () => {
        if (!selectedEmail || callStatus !== 'active') return;

        setVerificationStatus('checking');
        setVerificationStep('initializing');

        await sendSignal(selectedEmail, 'VERIFY_REQUEST', { auditId: Date.now() });
        toast("Initiating Biometric Liveness Audit...", { icon: '🛡️' });
    };

    const endCall = (signal = true) => {
        const type = isVideoCall ? 'video' : 'audio';
        if (signal && selectedEmail) {
            sendSignal(selectedEmail, callStatus === 'calling' ? 'CALL_CANCELLED' : 'CALL_ENDED');

            if (callStatus === 'active') {
                logCallMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} call ended`);
            } else if (callStatus === 'calling') {
                logCallMessage(`Cancelled ${type} call`);
            }
        } else if (!signal) {
            // Ended by remote
            if (callStatus === 'active') {
                logCallMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} call ended`);
            } else if (callStatus === 'incoming') {
                logCallMessage(`Missed ${type} call`);
            }
        }

        if (localStream) localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallStatus('idle');
        setIncomingCallData(null);
        setVerificationStatus(null);
        setVerificationStep(null);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[80vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading Conversations...</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white overflow-hidden rounded-3xl m-6 shadow-2xl border border-gray-100">

            {/* Call UI Overlay */}
            {callStatus !== 'idle' && (
                <div className="fixed inset-0 z-[1000] bg-gray-950 flex items-center justify-center animate-in fade-in duration-300">
                    {callStatus === 'active' ? (
                        <VideoCallInterface
                            localStream={localStream}
                            remoteStream={remoteStream}
                            isVideo={isVideoCall}
                            onHangup={() => endCall(true)}
                            status="Secure Admin Session"
                            onVerify={handleVerify}
                            verificationStatus={verificationStatus}
                            verificationStep={verificationStep}
                        />
                    ) : (
                        <div className="relative w-full max-w-lg flex flex-col items-center justify-center text-white">
                            <div className="relative mb-12">
                                <div className="w-40 h-40 rounded-full bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-2xl">
                                    <div className="w-32 h-32 bg-orange-600 rounded-full flex items-center justify-center text-4xl shadow-inner animate-pulse">
                                        {groupedMessages[selectedEmail]?.[0]?.name?.charAt(0) || 'U'}
                                    </div>
                                </div>
                                <div className="absolute inset-0 rounded-full border-2 border-orange-500/50 animate-ping"></div>
                            </div>
                            <div className="text-center mb-20">
                                <h2 className="text-4xl font-bold mb-2">{groupedMessages[selectedEmail]?.[0]?.name}</h2>
                                <p className="text-white/60 text-lg">{callStatus === 'incoming' ? 'Incoming Customer Call...' : 'Initializing Connection...'}</p>
                            </div>
                            <div className="flex gap-12">
                                {callStatus === 'incoming' && (
                                    <button onClick={acceptCall} className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </button>
                                )}
                                <button onClick={() => endCall(true)} className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center shadow-2xl shadow-rose-500/20 hover:scale-110 active:scale-95 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white transform rotate-135" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sidebar */}
            <div className="w-96 bg-gray-50/50 border-r border-gray-100 flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h2>
                    <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                        {Object.keys(groupedMessages).length} Chats
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {Object.entries(groupedMessages).map(([email, msgs]) => (
                        <div
                            key={email}
                            onClick={() => setSelectedEmail(email)}
                            className={`p-6 cursor-pointer transition-all duration-300 relative group border-b border-gray-50 ${selectedEmail === email ? 'bg-white shadow-lg z-10 scale-[1.02]' : 'hover:bg-white/60'}`}
                        >
                            <div className="flex gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-orange-500/20">
                                    {msgs[0].name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-900 truncate">{msgs[0].name}</h3>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                                            {new Date(msgs[msgs.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate font-medium">
                                        {msgs[msgs.length - 1].message}
                                    </p>
                                </div>
                            </div>
                            {selectedEmail === email && <div className="absolute left-0 top-6 bottom-6 w-1 bg-orange-600 rounded-r-full"></div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedEmail ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm z-20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                    {groupedMessages[selectedEmail][0].name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900 text-lg">{groupedMessages[selectedEmail][0].name}</h2>
                                    <p className="text-xs text-green-500 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        Active Customer
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => startCall(false)} className="p-3 bg-gray-50 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all shadow-sm border border-gray-100" title="Voice Call">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </button>
                                <button onClick={() => startCall(true)} className="p-3 bg-gray-50 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all shadow-sm border border-gray-100" title="Video Call">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Message Feed */}
                        <div
                            className="flex-1 overflow-y-auto px-8 py-10 space-y-8 bg-gray-50/30 custom-scrollbar"
                            ref={scrollRef}
                            onScroll={(e) => {
                                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                                setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
                            }}
                        >
                            {groupedMessages[selectedEmail].map((msg) => {
                                const isCustomerCallLog = msg.message.startsWith('[CALL_LOG]:');
                                const logMessage = isCustomerCallLog ? msg.message.replace('[CALL_LOG]:', '') : '';
                                const msgDate = new Date(msg.createdAt);

                                return (
                                    <div key={msg._id} className="space-y-4">
                                        {/* Customer Entry */}
                                        {isCustomerCallLog ? (
                                            <div className="flex flex-col items-center gap-2 my-4 animate-in fade-in zoom-in duration-500">
                                                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">{logMessage}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                    {msgDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} • {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-start gap-2 max-w-[80%]">
                                                <div className="flex items-end gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0 mb-1">
                                                        {msg.name.charAt(0)}
                                                    </div>
                                                    <div className="bg-white border border-gray-100 p-4 rounded-3xl rounded-bl-sm shadow-sm text-gray-800 font-medium">
                                                        {msg.imageUrl && (
                                                            <img src={msg.imageUrl} className="rounded-2xl mb-3 max-h-60 object-cover border border-gray-50" />
                                                        )}
                                                        {msg.message}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-bold ml-11 uppercase flex items-center gap-2">
                                                    {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}

                                        {/* Admin Entry (Handle logs in reply too) */}
                                        {msg.reply && (
                                            msg.reply.split('\n\n').map((part, pIdx) => {
                                                if (part.startsWith('[CALL_LOG]:')) {
                                                    const adminLog = part.replace('[CALL_LOG]:', '');
                                                    return (
                                                        <div key={`${msg._id}-r-${pIdx}`} className="flex flex-col items-center gap-2 my-2 animate-in fade-in zoom-in duration-500">
                                                            <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-800 shadow-lg">
                                                                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 3z" />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-xs font-bold text-white/90 uppercase tracking-tight">{adminLog}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div key={`${msg._id}-r-${pIdx}`} className="flex flex-col items-end gap-2 ml-auto max-w-[80%]">
                                                        <div className="bg-gray-900 px-5 py-3 rounded-3xl rounded-br-sm shadow-xl text-white font-medium whitespace-pre-wrap">
                                                            {part}
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-bold mr-1 uppercase flex items-center gap-1.5">
                                                            <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                                            </svg>
                                                            Delivered
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-gray-100">
                            <form onSubmit={handleSendReply} className="relative flex items-end gap-3">
                                <textarea
                                    value={replyInput}
                                    onChange={(e) => setReplyInput(e.target.value)}
                                    placeholder="Briefly address the customer's query..."
                                    className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-800 focus:ring-2 focus:ring-orange-500 transition-all resize-none max-h-40 min-h-[56px] font-medium"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendReply();
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!replyInput.trim()}
                                    className="h-14 w-14 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center border border-gray-100 shadow-sm mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Conversation</h3>
                        <p className="text-sm font-medium">Choose a customer to start providing support</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminMessages;
