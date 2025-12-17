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
    const [incomingCallData, setIncomingCallData] = useState(null); // { peerId, type }
    const [isVideoCall, setIsVideoCall] = useState(true);

    // Call Cleanup: Stop media tracks when stream changes or unmounts
    useEffect(() => {
        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [localStream]);

    // Init PeerJS for Admin
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
                setIncomingCallData({ callObj: call, type: 'video' });
            });

            peer.on('error', (err) => {
                console.error('Peer error:', err);
                toast.error('Connection error: ' + err.type);
            });
        };
        initPeer();
    }, []);

    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/admin/messages');
            if (!response.ok) return; // Silent fail on error

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) return;
            const data = await response.json();
            if (data.success) {
                const sorted = data.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                const grouped = sorted.reduce((acc, msg) => {
                    if (!acc[msg.email]) acc[msg.email] = [];
                    acc[msg.email].push(msg);
                    return acc;
                }, {});

                // Sort groups by latest message date (descending)
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

                // If selected email, check for call invites from THIS user
                if (selectedEmail && sortedGroups[selectedEmail]) {
                    checkForCallInvite(sortedGroups[selectedEmail]);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const checkForCallInvite = (msgs) => {
        const lastMsg = msgs[msgs.length - 1];
        if (!lastMsg) return;

        // Check for cancellation/end from user
        if (lastMsg.message.includes('[CALL_CANCELLED]') || lastMsg.message.includes('[CALL_ENDED]')) {
            if (callStatus === 'incoming' || callStatus === 'active') {
                const msgTime = new Date(lastMsg.createdAt).getTime();
                // 15 seconds validity for cancellation signal
                if (Date.now() - msgTime < 15000) {
                    toast('Call cancelled by user', { icon: '📵' });
                    endCall();
                    return;
                }
            }
        }

        if (callStatus !== 'idle') return;

        if (lastMsg.message.startsWith('[CALL_INVITE]')) {
            const msgTime = new Date(lastMsg.createdAt).getTime();
            if (Date.now() - msgTime < 60000) { // 60s window
                const parts = lastMsg.message.split(':');
                const peerId = parts[1];
                const type = parts[2];
                setIncomingCallData({ peerId, type });
                setIsVideoCall(type === 'video');
                setCallStatus('incoming');
            }
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [selectedEmail, callStatus]); // Depend on selectedEmail to check correct user

    useEffect(() => {
        if (!selectedEmail && Object.keys(groupedMessages).length > 0) {
            setSelectedEmail(Object.keys(groupedMessages)[0]);
            setIsAtBottom(true);
        }
    }, [groupedMessages, selectedEmail]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const atBottom = scrollHeight - scrollTop - clientHeight < 50;
            setIsAtBottom(atBottom);
        }
    };

    useEffect(() => {
        if (scrollRef.current && isAtBottom) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [groupedMessages, selectedEmail, isAtBottom]);

    const handleSendReply = async (e, customText = null) => {
        if (e) e.preventDefault();
        const textToSend = customText || replyInput;

        if (!textToSend.trim() || !selectedEmail) return;

        const userMessages = groupedMessages[selectedEmail];
        if (!userMessages || userMessages.length === 0) return;
        const lastMsg = userMessages[userMessages.length - 1];

        let newReplyText = textToSend;
        if (lastMsg.reply) {
            newReplyText = lastMsg.reply + "\n\n" + textToSend;
        }

        try {
            const response = await fetch('/api/admin/messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: lastMsg._id, reply: newReplyText })
            });
            const data = await response.json();
            if (data.success) {
                if (!customText) setReplyInput('');
                fetchMessages();
                setIsAtBottom(true);
                if (!customText && !textToSend.includes('CALL')) toast.success('Reply sent');
            }
        } catch (error) {
            toast.error('Error sending reply');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this message?')) return;
        try {
            const response = await fetch(`/api/admin/messages?id=${id}`, { method: 'DELETE' });
            if ((await response.json()).success) {
                toast.success('Message deleted');
                fetchMessages();
            }
        } catch (e) { }
    };

    // --- Call Logic ---

    const requestCall = async (video) => {
        // Send request for User to call us
        const msg = `[CALL_REQUEST]:${video ? 'video' : 'audio'}`;
        await handleSendReply(null, "I'm inviting you to a " + (video ? "video" : "audio") + " call. Please click the call button in your chat.");
        toast.success("Call invitation sent");
    };

    const acceptCall = async () => {
        if (!incomingCallData) {
            toast.error("No call data found");
            return;
        }

        const toastId = toast.loading("Connecting to call...");

        try {
            // Check Peer Instance
            if (!peerInstance || peerInstance.destroyed) {
                toast.error("Call server not connected", { id: toastId });
                return;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast.error("Camera access requires HTTPS or localhost.", { id: toastId });
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });
            setLocalStream(stream);

            if (incomingCallData.callObj) {
                // Peer direct call
                const call = incomingCallData.callObj;
                call.answer(stream);
                call.on('stream', (remote) => {
                    setRemoteStream(remote);
                    setCallStatus('active');
                    toast.dismiss(toastId);
                });
                call.on('close', endCall);
                call.on('error', (e) => toast.error("Call error: " + e.message, { id: toastId }));
            } else if (incomingCallData.peerId) {
                // We call them back based on Invite
                const call = peerInstance.call(incomingCallData.peerId, stream);

                if (!call) {
                    toast.error("Failed to initiate connection", { id: toastId });
                    return;
                }

                call.on('stream', (remote) => {
                    setRemoteStream(remote);
                    setCallStatus('active');
                    toast.dismiss(toastId);
                });
                call.on('close', endCall);
                call.on('error', (e) => toast.error("Call error: " + e.message, { id: toastId }));
                setIncomingCallData({ ...incomingCallData, activeCall: call });
            }
        } catch (err) {
            console.error(err);
            toast.error("Error accessing media or connecting: " + err.message, { id: toastId });
            endCall();
        }
    };

    const endCall = () => {
        if (localStream) localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setCallStatus('idle');
        setIncomingCallData(null);
    };

    const hangupCall = async () => {
        if (callStatus === 'active' && selectedEmail) {
            handleSendReply(null, '[CALL_ENDED]').catch(console.error);
        }
        endCall();
    };

    const rejectCall = async () => {
        // Close UI immediately
        endCall();

        if (selectedEmail) {
            // Signal rejection to the user in background
            handleSendReply(null, '[CALL_REJECTED]').catch(err => console.error(err));
        }
    };




    const renderUserList = () => {
        return Object.entries(groupedMessages).map(([email, msgs]) => {
            const lastMsg = msgs[msgs.length - 1];
            const name = lastMsg.name;
            const hasUnread = msgs.some(m => m.status === 'Unread');
            const isSelected = selectedEmail === email;
            return (
                <div
                    key={email}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition flex justify-between items-center ${isSelected ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''}`}
                >
                    <div className="overflow-hidden">
                        <h3 className={`font-medium text-base truncate ${hasUnread ? 'font-bold text-black' : 'text-gray-700'}`}>{name}</h3>
                        <p className="text-sm text-gray-500 truncate">{lastMsg.message}</p>
                    </div>
                    {hasUnread && <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 ml-2"></div>}
                </div>
            );
        });
    };

    if (loading) return <div className="p-10 flex justify-center text-gray-500 text-lg">Loading chats...</div>;

    return (
        <div className="flex bg-gray-100 h-[calc(100vh-120px)] overflow-hidden rounded-lg shadow-sm m-4 border border-gray-200">

            {/* Call Modal */}
            {callStatus !== 'idle' && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    {callStatus === 'active' ? (
                        <VideoCallInterface
                            localStream={localStream}
                            remoteStream={remoteStream}
                            isVideo={isVideoCall}
                            onHangup={hangupCall}
                            status="Connected"
                        />
                    ) : (

                        // Incoming / Calling UI (Mobile App Style)
                        <div className="bg-gray-900 absolute inset-0 flex flex-col items-center justify-between py-20 text-white animate-in fade-in duration-300 z-[101]">
                            {/* Background Blur Effect */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-600/20 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
                            </div>

                            <div className="flex flex-col items-center gap-8 mt-12 z-10">
                                <div className="relative">
                                    <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-5xl shadow-2xl relative z-10 border-4 border-gray-900 font-bold">
                                        {groupedMessages[selectedEmail]?.[0]?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20 duration-1000"></div>
                                    <div className="absolute inset-[-16px] bg-indigo-500 rounded-full animate-pulse opacity-10"></div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-3xl font-bold tracking-tight">{groupedMessages[selectedEmail]?.[0]?.name || 'Unknown User'}</h3>
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
                                        {callStatus === 'incoming' ? 'Incoming Call...' : 'Connecting...'}
                                    </p>
                                    <p className="text-sm text-white/40">{selectedEmail}</p>
                                </div>
                            </div>

                            <div className="flex gap-16 items-center pb-10 z-10 w-full justify-center">
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

                                <button
                                    onClick={rejectCall}
                                    className="flex flex-col items-center gap-3 group"
                                >
                                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition duration-300 ease-out">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white transform rotate-135" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-white/90">Decline</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            <div className="w-80 bg-white border-r flex flex-col hidden md:flex">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-700 text-lg">Inbox</h2>
                    <div className="flex items-center gap-1.5 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-green-700">Live</span>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {Object.keys(groupedMessages).length === 0 ? (
                        <p className="p-4 text-center text-gray-400 text-base">No messages yet.</p>
                    ) : renderUserList()}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-gray-50 h-full">
                {selectedEmail ? (
                    <>
                        <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-10 h-16">
                            <div>
                                <h2 className="font-bold text-gray-800 text-lg">{groupedMessages[selectedEmail][0].name}</h2>
                                <p className="text-sm text-gray-500">{selectedEmail}</p>
                            </div>
                            {/* Call Controls */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => requestCall(false)}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                                    title="Invite to Audio Call"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => requestCall(true)}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                                    title="Invite to Video Call"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" ref={scrollRef} onScroll={handleScroll}>
                            {groupedMessages[selectedEmail].map((msg) => {
                                // Explicitly handle Call Invites with UI
                                if (msg.message.startsWith('[CALL_INVITE]')) {
                                    return (
                                        <div key={msg._id} className="flex flex-col gap-2 my-2 items-start max-w-[85%]">
                                            <div className="flex items-center gap-3 bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm">
                                                <div className="bg-green-100 text-green-600 p-2.5 rounded-full animate-pulse">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800">Incoming Call Request</p>
                                                    <p className="text-xs text-gray-500 mb-2">User invited you to a call</p>
                                                    <button
                                                        onClick={() => {
                                                            const parts = msg.message.split(':');
                                                            setIncomingCallData({ peerId: parts[1], type: parts[2] });
                                                            setIsVideoCall(parts[2] === 'video');
                                                            setCallStatus('incoming');
                                                        }}
                                                        className="bg-green-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-green-700 transition shadow-sm font-medium"
                                                    >
                                                        Accept Call
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-400 ml-1">
                                                {new Date(msg.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                }

                                if (msg.reply && msg.reply.startsWith('[CALL_INVITE]')) return null; // Hide our own invites (optional, or show as "Call Started")

                                return (
                                    <div key={msg._id} className="flex flex-col gap-2">
                                        <div className="flex items-start gap-3 max-w-[85%] self-start group">
                                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-1">
                                                {msg.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="bg-white border rounded-2xl rounded-tl-none px-4 py-3 text-gray-700 shadow-sm text-base">
                                                    {msg.imageUrl && (
                                                        <div className="mb-2">
                                                            <img
                                                                src={msg.imageUrl}
                                                                alt="User attachment"
                                                                className="rounded-md max-w-[200px] h-auto border cursor-pointer hover:opacity-90 transition"
                                                                onClick={() => setViewImage(msg.imageUrl)}
                                                            />
                                                        </div>
                                                    )}
                                                    {msg.message}
                                                </div>
                                                <div className="flex gap-2 items-center mt-1 ml-1">
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(msg.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <button onClick={() => handleDelete(msg._id)} className="text-xs text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                        {msg.reply && (
                                            <div className="flex items-start gap-3 max-w-[85%] self-end flex-row-reverse">
                                                <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-1">
                                                    A
                                                </div>
                                                <div>
                                                    <div className="bg-orange-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-sm text-base whitespace-pre-wrap">
                                                        {msg.reply}
                                                    </div>
                                                    <span className="text-xs text-gray-400 mt-1 mr-1 text-right block">
                                                        Delivered
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="bg-white p-4 border-t">
                            <form onSubmit={handleSendReply} className="flex gap-3 items-end">
                                <textarea
                                    value={replyInput}
                                    onChange={(e) => setReplyInput(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 resize-none text-base h-12 max-h-32 scrollbar-hide"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendReply(e);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    className="bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700 transition shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-lg">
                        Select a conversation to start chatting
                    </div>
                )}
            </div>

            {/* Image Modal */}
            {
                viewImage && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewImage(null)}>
                        <div className="relative max-w-4xl max-h-[90vh] w-auto h-auto">
                            <img
                                src={viewImage}
                                alt="Full size"
                                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            />
                            <button
                                onClick={() => setViewImage(null)}
                                className="absolute -top-10 right-0 text-white hover:text-gray-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminMessages;
