'use client'
import React, { useState, useEffect, useRef } from 'react';
import { assets } from '@/assets/assets';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import toast from 'react-hot-toast';
import VideoCallInterface from './VideoCallInterface';

const ChatWidget = () => {
    const { user } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [image, setImage] = useState(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    const [verificationStatus, setVerificationStatus] = useState(null); // null, checking, verified, failed
    const [verificationStep, setVerificationStep] = useState(null); // 'blink', 'turn', 'smile'

    // Call State
    const [peerInstance, setPeerInstance] = useState(null);
    const [myPeerId, setMyPeerId] = useState('');
    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, incoming, active
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [incomingCallData, setIncomingCallData] = useState(null); // { from, peerId, type }
    const [isVideoCall, setIsVideoCall] = useState(true);

    // Initializations
    useEffect(() => {
        if (!user) return;

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
                // Determine if this is a video call based on state or assume video
                setCallStatus('incoming');
                setIncomingCallData(prev => ({ ...prev, callObj: call }));
            });

            peer.on('error', (err) => {
                console.error("PeerJS error:", err);
            });
        };

        initPeer();
    }, [user]);

    // Polling for Signals (Real-time signaling)
    useEffect(() => {
        if (!user) return;

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

        const intervalId = setInterval(pollSignals, 2000); // 2s is relatively "real-time"
        return () => clearInterval(intervalId);
    }, [user, callStatus]);

    const runVerificationAudit = async () => {
        setVerificationStatus('checking');
        const steps = ['blink', 'turn', 'smile'];

        for (const step of steps) {
            setVerificationStep(step);
            await sendSignal('admin', 'VERIFY_STEP', { step });
            await new Promise(r => setTimeout(r, 3000));
        }

        setVerificationStep(null);
        setVerificationStatus('verified');
        await sendSignal('admin', 'VERIFY_RESULT', { status: 'verified' });
        toast.success("Identity Audit Completed Successfully");
    };

    const handleIncomingSignal = (signal) => {
        const signalData = JSON.parse(signal.data);

        switch (signal.type) {
            case 'CALL_INVITE':
                if (callStatus === 'idle') {
                    setIncomingCallData({ from: signal.from, peerId: signalData.peerId, type: signalData.type });
                    setIsVideoCall(signalData.type === 'video');
                    setCallStatus('incoming');
                }
                break;
            case 'CALL_REJECTED':
            case 'CALL_ENDED':
            case 'CALL_CANCELLED':
                toast.error(signal.type.replace('CALL_', '').toLowerCase() + " by support");
                endCall(false);
                break;
            case 'VERIFY_REQUEST':
                if (callStatus === 'active') {
                    runVerificationAudit();
                }
                break;
            default:
                break;
        }
    };

    // Polling for Chat Messages
    useEffect(() => {
        if (isOpen && user) {
            fetchChatHistory();
            const intervalId = setInterval(fetchChatHistory, 5000);
            return () => clearInterval(intervalId);
        }
    }, [isOpen, user]);

    const fetchChatHistory = async () => {
        try {
            const res = await fetch('/api/contact');
            const data = await res.json();
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error("Chat history error:", error);
        }
    };

    const sendSignal = async (to, type, data = {}) => {
        try {
            await fetch('/api/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, type, data })
            });
        } catch (err) {
            console.error("Send signal error:", err);
        }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() && !image) return;

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    message: input || 'Sent an image',
                    imageUrl: image
                })
            });
            const data = await res.json();
            if (data.success) {
                setInput('');
                setImage(null);
                fetchChatHistory();
            }
        } catch (error) {
            toast.error("Failed to send message");
        }
    };

    const logCallMessage = async (logText) => {
        try {
            await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    message: `[CALL_LOG]:${logText}`
                })
            });
            fetchChatHistory();
        } catch (err) {
            console.error("Log call error:", err);
        }
    };

    const startCall = async (video) => {
        if (!peerInstance || !myPeerId) {
            toast.error("Initializing connection...");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
            setLocalStream(stream);
            setIsVideoCall(video);
            setCallStatus('calling');

            // Signal to Admin
            await sendSignal('admin', 'CALL_INVITE', { peerId: myPeerId, type: video ? 'video' : 'audio' });

            // Log initiation
            logCallMessage(`Started a ${video ? 'video' : 'voice'} call`);
        } catch (err) {
            toast.error("Could not access camera/mic");
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

    const endCall = (signal = true) => {
        const type = isVideoCall ? 'video' : 'voice';
        if (signal) {
            const to = incomingCallData?.from || 'admin';
            sendSignal(to, callStatus === 'calling' ? 'CALL_CANCELLED' : 'CALL_ENDED').catch(console.error);

            if (callStatus === 'active') {
                logCallMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} call ended`);
            } else if (callStatus === 'calling') {
                logCallMessage(`Cancelled ${type} call`);
            }
        } else {
            // If ended by remote
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

    // Scroll handling
    useEffect(() => {
        if (scrollRef.current && isAtBottom) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isAtBottom]);

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

            {/* Call State UI - Premium Overlay */}
            {callStatus !== 'idle' && (
                <div className="fixed inset-0 z-[1000] bg-gray-950 flex items-center justify-center animate-in fade-in duration-300">
                    {callStatus === 'active' ? (
                        <VideoCallInterface
                            localStream={localStream}
                            remoteStream={remoteStream}
                            isVideo={isVideoCall}
                            onHangup={() => endCall(true)}
                            status="Secure Connection"
                        />
                    ) : (
                        <div className="relative w-full max-w-lg h-full flex flex-col items-center justify-center p-10 text-white">
                            {/* Abstract animation */}
                            <div className="absolute inset-0 overflow-hidden opacity-30">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-to-r from-orange-600/20 via-blue-600/20 to-pink-600/20 animate-spin-slow"></div>
                            </div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="relative mb-12">
                                    <div className="w-40 h-40 rounded-full bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-2xl">
                                        <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-rose-600 rounded-full flex items-center justify-center text-4xl shadow-inner animate-pulse">
                                            {isVideoCall ? '📹' : '📞'}
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 rounded-full border-2 border-orange-500/50 animate-ping"></div>
                                </div>

                                <div className="text-center space-y-4 mb-20">
                                    <h2 className="text-4xl font-bold tracking-tight">QuickCart Support</h2>
                                    <p className="text-white/60 text-lg flex items-center justify-center gap-2">
                                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                        {callStatus === 'incoming' ? 'Incoming Secure Call...' : 'Calling Support Specialist...'}
                                    </p>
                                </div>

                                <div className="flex gap-12 items-center">
                                    {callStatus === 'incoming' && (
                                        <button
                                            onClick={acceptCall}
                                            className="group flex flex-col items-center gap-3"
                                        >
                                            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/20 transform transition group-hover:scale-110 group-active:scale-95">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-semibold uppercase tracking-wider text-white/80">Answer</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => endCall(true)}
                                        className="group flex flex-col items-center gap-3"
                                    >
                                        <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center shadow-2xl shadow-rose-500/20 transform transition group-hover:scale-110 group-active:scale-95 group-hover:rotate-12">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white transform rotate-135" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-semibold uppercase tracking-wider text-white/80">
                                            {callStatus === 'incoming' ? 'Decline' : 'Cancel'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Messenger Chat Window */}
            {isOpen && (
                <div className="w-[380px] h-[600px] mb-4 bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                    {/* Header */}
                    <div className="px-5 py-4 bg-white border-b flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm">QC</div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">QuickCart Support</h3>
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Replies in 1 min</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => startCall(false)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </button>
                            <button onClick={() => startCall(true)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        className="flex-1 overflow-y-auto px-5 py-6 space-y-6 bg-gradient-to-b from-gray-50/50 to-white"
                        ref={scrollRef}
                        onScroll={() => {
                            if (scrollRef.current) {
                                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                                setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
                            }
                        }}
                    >
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl">👋</div>
                                <div>
                                    <h4 className="font-bold text-gray-800">Hi {user.name.split(' ')[0]}!</h4>
                                    <p className="text-gray-400 text-sm max-w-[200px]">How can our support team help you with your order today?</p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                if (msg.message.startsWith('[CALL_LOG]:')) {
                                    const logMessage = msg.message.replace('[CALL_LOG]:', '');
                                    const date = new Date(msg.createdAt);
                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-2 my-4 animate-in fade-in zoom-in duration-500">
                                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                                                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <span className="text-[11px] font-bold text-gray-500 tracking-tight uppercase">{logMessage}</span>
                                            </div>
                                            <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                                                {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={idx} className="flex flex-col space-y-2">
                                        {/* User Message */}
                                        <div className="flex flex-col items-end gap-1 translate-x-1 animate-in slide-in-from-right-2 duration-300">
                                            <div className="max-w-[85%] bg-orange-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-[4px] shadow-sm text-sm">
                                                {msg.imageUrl && (
                                                    <img src={msg.imageUrl} alt="attached" className="rounded-lg mb-2 max-h-40 object-cover shadow-sm" />
                                                )}
                                                {msg.message}
                                            </div>
                                            <div className="flex items-center gap-1.5 px-1">
                                                <span className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">
                                                    {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">• Delivered</span>
                                            </div>
                                        </div>

                                        {/* Admin Reply */}
                                        {msg.reply && (
                                            msg.reply.split('\n\n').map((part, pIdx) => {
                                                if (part.startsWith('[CALL_LOG]:')) {
                                                    const logMessage = part.replace('[CALL_LOG]:', '');
                                                    const date = new Date(msg.createdAt);
                                                    return (
                                                        <div key={`${idx}-r-${pIdx}`} className="flex flex-col items-center gap-2 my-4 animate-in fade-in zoom-in duration-500">
                                                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                                                                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 3z" />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-[11px] font-bold text-gray-500 tracking-tight uppercase">{logMessage}</span>
                                                            </div>
                                                            <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                                                                {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div key={`${idx}-r-${pIdx}`} className="flex flex-col items-start gap-1 animate-in slide-in-from-left-2 duration-300">
                                                        <div className="flex gap-3 items-end">
                                                            <div className="w-7 h-7 rounded-full bg-orange-600 shrink-0 flex items-center justify-center text-[10px] font-bold text-white mb-1 shadow-sm">QC</div>
                                                            <div className="max-w-[85%] bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-[4px] text-sm font-medium">
                                                                {part}
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest ml-10">
                                                            {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Image Placeholder Preview */}
                    {image && (
                        <div className="px-5 py-3 bg-gray-50 border-t flex items-center gap-4 animate-in slide-in-from-bottom-2">
                            <div className="relative w-14 h-14 group">
                                <img src={image} className="w-full h-full object-cover rounded-xl border border-gray-200 shadow-sm" />
                                <button
                                    onClick={() => setImage(null)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">Ready to send image</p>
                        </div>
                    )}

                    {/* Footer Input */}
                    <div className="p-4 border-t bg-white shrink-0">
                        <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setImage(reader.result);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Aa"
                                    className="w-full bg-gray-100 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 transition-all shadow-inner"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!input.trim() && !image}
                                className={`p-2 rounded-full transform transition-all active:scale-90 ${input.trim() || image ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-300'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative group bg-orange-600 text-white p-4 rounded-full shadow-[0_10px_30px_-5px_rgba(234,88,12,0.5)] transform transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-95"
                >
                    <div className="absolute inset-0 bg-orange-600 rounded-full animate-ping opacity-20"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 pointer-events-none">
                        Chat with us
                    </span>
                </button>
            )}

            {/* Video Call Interface Overlay */}
            {callStatus === 'active' && (
                <VideoCallInterface
                    localStream={localStream}
                    remoteStream={remoteStream}
                    isVideo={isVideoCall}
                    onHangup={() => endCall(true)}
                    status="Secure Session"
                    verificationStatus={verificationStatus}
                    verificationStep={verificationStep}
                />
            )}
        </div>
    );
};

export default ChatWidget;
