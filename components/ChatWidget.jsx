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

    // Call State
    const [peerInstance, setPeerInstance] = useState(null);
    const [myPeerId, setMyPeerId] = useState('');
    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, incoming, active
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [incomingCallData, setIncomingCallData] = useState(null); // { peerId, type }
    const [isVideoCall, setIsVideoCall] = useState(true);

    // Ensure stream tracks are stopped when localStream changes or component unmounts
    useEffect(() => {
        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [localStream]);

    // Init PeerJS
    useEffect(() => {
        if (!user) return;

        const initPeer = async () => {
            // Dynamic import for client-side only
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
                // Incoming call from PeerJS direct connection
                setCallStatus('incoming');
                setIncomingCallData({ callObj: call });
            });
        };

        initPeer();

        return () => {
            // Cleanup if needed
        };
    }, [user]);

    // Cleanup streams on unmount
    useEffect(() => {
        return () => {
            if (localStream) localStream.getTracks().forEach(track => track.stop());
        };
    }, []);


    // Poll for new messages (and Call Invites)
    useEffect(() => {
        if (isOpen && user) {
            fetchChatHistory();
            const intervalId = setInterval(() => {
                fetchMessagesSafe();
            }, 3000);
            return () => clearInterval(intervalId);
        }
    }, [isOpen, user, myPeerId, callStatus]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const atBottom = scrollHeight - scrollTop - clientHeight < 50;
            setIsAtBottom(atBottom);
        }
    };

    // Auto-scroll logic
    useEffect(() => {
        if (isOpen && scrollRef.current && messages.length > 0 && isAtBottom) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isAtBottom]);

    const fetchMessagesSafe = async () => {
        await fetchChatHistory();
    };

    const fetchChatHistory = async () => {
        try {
            const res = await fetch('/api/contact');
            if (!res.ok) return;

            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await res.json();
                if (data.success) {
                    setMessages(data.messages);
                    checkForIncomingCallInvite(data.messages);
                }
            } else {
                console.warn("Received non-JSON response");
            }
        } catch (error) {
            console.error("Error fetching chat:", error);
        }
    };

    const checkForIncomingCallInvite = (msgs) => {
        const lastMsg = msgs[msgs.length - 1];
        if (!lastMsg || !lastMsg.reply) return;

        // Handle Rejection or End
        if (lastMsg.reply.includes('[CALL_REJECTED]') || lastMsg.reply.includes('[CALL_ENDED]')) {
            const msgTime = new Date(lastMsg.createdAt).getTime();
            if (Date.now() - msgTime < 15000) {
                if (callStatus === 'calling' || callStatus === 'active') {
                    toast.error("Call ended");
                    endCall();
                }
                // If we were receiving an invite (incoming) and they cancelled? 
                // Usually admin rejects user call. User rejects admin call?
                // If Admin calls User (via request) -> User calls Admin.
                // So rejection usually flows Admin -> User.
                return;
            }
        }

        if (callStatus !== 'idle') return;

        // Format: [CALL_INVITE]:peerId:type
        if (lastMsg.reply.startsWith('[CALL_INVITE]')) {
            const msgTime = new Date(lastMsg.createdAt).getTime();
            const now = Date.now();
            if (now - msgTime < 15000) {
                const parts = lastMsg.reply.split(':');
                const peerId = parts[1];
                const type = parts[2];
                setIncomingCallData({ peerId, type });
                setIsVideoCall(type === 'video');
                setCallStatus('incoming');
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const sendMessage = async (text, img = null) => {
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    message: text,
                    imageUrl: img
                })
            });
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return await res.json();
            }
            return { success: false, message: "Network response was not JSON" };
        } catch (error) {
            console.error(error);
            return { success: false };
        }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() && !image) return;

        const data = await sendMessage(input || 'Sent an image', image);
        if (data.success) {
            setInput('');
            setImage(null);
            fetchChatHistory();
        } else {
            toast.error(data.message);
        }
    };

    // --- Call Functions ---

    const startCall = async (video) => {
        if (!peerInstance || !myPeerId) {
            toast.error("Connecting to call server...");
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error("Camera access requires HTTPS connection.", { duration: 5000 });
            return;
        }

        setIsVideoCall(video);
        setCallStatus('calling');

        // 1. Send Invite via Chat
        const inviteMsg = `[CALL_INVITE]:${myPeerId}:${video ? 'video' : 'audio'}`;
        await sendMessage(inviteMsg);

        // 2. Get Local Stream
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: video, audio: true });
            setLocalStream(stream);

            // Wait for admin to connect to us (since we sent invite, they will likely call us back or we wait for them to signal?)
            // Actually, usually Initiator calls Receiver. But here we don't know Admin Peer ID until they reply?
            // Simple Pattern: User sends Invite -> Admin sees Invite -> Admin calls User (since Admin has User's ID from message).
            // So User just waits.
        } catch (err) {
            console.error(err);
            toast.error("Could not access camera/mic");
            setCallStatus('idle');
        }
    };

    const acceptCall = async () => {
        if (!incomingCallData) return;

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast.error("Camera access requires HTTPS connection.", { duration: 5000 });
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });
            setLocalStream(stream);

            if (incomingCallData.callObj) {
                // Determine if we need to answer a PeerJS call directly
                const call = incomingCallData.callObj;
                call.answer(stream);
                call.on('stream', (remote) => {
                    setRemoteStream(remote);
                    setCallStatus('active');
                });
                // Handle close
                call.on('close', endCall);
            } else if (incomingCallData.peerId) {
                // We received an invite message, so WE call THEM
                const call = peerInstance.call(incomingCallData.peerId, stream);
                call.on('stream', (remote) => {
                    setRemoteStream(remote);
                    setCallStatus('active');
                });
                call.on('close', endCall);
                // Store call to close later
                setIncomingCallData({ ...incomingCallData, activeCall: call });
            }
        } catch (err) {
            console.error(err);
            toast.error("Error starting call");
            endCall();
        }
    };

    const endCall = async () => {
        if (callStatus === 'calling') {
            sendMessage('[CALL_CANCELLED]').catch(console.error);
        } else if (callStatus === 'active') {
            sendMessage('[CALL_ENDED]').catch(console.error);
        }

        if (localStream) localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallStatus('idle');
        setIncomingCallData(null);
        // Force refresh chat to clear invite context visually if needed
        fetchChatHistory();
    };

    // Render Helpers
    if (!user) return null;

    return (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-4">

            {/* Call Interface Modal */}
            {callStatus !== 'idle' && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    {callStatus === 'active' ? (
                        <VideoCallInterface
                            localStream={localStream}
                            remoteStream={remoteStream}
                            isVideo={isVideoCall}
                            onHangup={endCall}
                            status="Connected"
                        />
                    ) : (
                        // Incoming / Calling UI (Mobile App Style)
                        <div className="bg-gray-900 absolute inset-0 flex flex-col items-center justify-between py-20 text-white animate-in fade-in duration-300">
                            {/* Background Blur Effect */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-600/20 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
                            </div>

                            <div className="flex flex-col items-center gap-8 mt-12 z-10">
                                <div className="relative">
                                    <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-pink-600 rounded-full flex items-center justify-center text-5xl shadow-2xl relative z-10 border-4 border-gray-900">
                                        Support
                                    </div>
                                    <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20 duration-1000"></div>
                                    <div className="absolute inset-[-16px] bg-orange-500 rounded-full animate-pulse opacity-10"></div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-3xl font-bold tracking-tight">Support Team</h3>
                                    <p className="text-white/60 text-lg font-medium flex items-center justify-center gap-2">
                                        {isVideoCall ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        )}
                                        {callStatus === 'incoming' ? 'Incoming Call...' : 'Calling...'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-16 items-center pb-10 z-10 w-full justify-center">
                                {callStatus === 'incoming' && (
                                    <button
                                        onClick={acceptCall}
                                        className="flex flex-col items-center gap-3 group"
                                    >
                                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition duration-300 ease-out">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-white/90">Accept</span>
                                    </button>
                                )}

                                <button
                                    onClick={endCall}
                                    className="flex flex-col items-center gap-3 group"
                                >
                                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition duration-300 ease-out">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white transform rotate-135" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-white/90">{callStatus === 'incoming' ? 'Decline' : 'Cancel'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white w-80 h-96 rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
                    <div className="bg-orange-600 p-3 text-white flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="font-medium text-sm">Support Chat</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Call Buttons */}
                            <button onClick={() => startCall(false)} className="hover:bg-white/20 p-1.5 rounded-full transition" title="Audio Call">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </button>
                            <button onClick={() => startCall(true)} className="hover:bg-white/20 p-1.5 rounded-full transition" title="Video Call">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50" ref={scrollRef} onScroll={handleScroll}>
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-400 mt-10 text-xs">
                                <p>Hi {user.name.split(' ')[0]}! 👋</p>
                                <p>How can we help you today?</p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                // Hide protocol messages from view if preferred, or stylize them
                                if (msg.message.startsWith('[CALL_INVITE]') || (msg.reply && msg.reply.startsWith('[CALL_INVITE]'))) return null;

                                return (
                                    <div key={index} className="flex flex-col gap-1">
                                        <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm shadow-sm ${msg.reply ? 'order-1' : 'self-end bg-orange-500 text-white rounded-tr-none'}`}>
                                            {msg.imageUrl && (
                                                <div className="mb-2">
                                                    <img src={msg.imageUrl} alt="attachment" className="rounded-md max-w-full h-auto" />
                                                </div>
                                            )}
                                            {msg.message}
                                        </div>
                                        {msg.reply && (
                                            <div className="self-start max-w-[85%] bg-white border text-gray-800 px-3 py-2 rounded-lg rounded-tl-none text-sm shadow-sm">
                                                <span className="text-[10px] text-orange-600 font-bold block mb-0.5">Admin</span>
                                                {msg.reply}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Image Preview */}
                    {image && (
                        <div className="px-3 py-2 bg-gray-100 border-t flex items-center gap-2">
                            <div className="relative w-12 h-12">
                                <img src={image} alt="Preview" className="w-full h-full object-cover rounded-md border" />
                                <button
                                    onClick={() => setImage(null)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <span className="text-xs text-gray-500">Image attached</span>
                        </div>
                    )}

                    <form onSubmit={handleChatSubmit} className="p-2 bg-white border-t flex gap-2 items-center">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="text-gray-400 hover:text-gray-600 p-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-full px-3 py-1.5 focus:outline-none focus:border-orange-500 text-sm"
                            placeholder="Type a message..."
                        />
                        <button
                            type="submit"
                            className="bg-orange-600 text-white p-1.5 rounded-full hover:bg-orange-700 transition flex-shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Floating Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white p-3.5 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-medium">
                        Chat with us
                    </span>
                </button>
            )}
        </div>
    );
};

export default ChatWidget;
