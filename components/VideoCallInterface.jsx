'use client'
import React, { useEffect, useRef, useState } from 'react';

const VideoCallInterface = ({ localStream, remoteStream, isVideo, onHangup, status, onVerify, verificationStep, verificationStatus }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);
    const [camOff, setCamOff] = useState(!isVideo);

    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setCamOff(!camOff);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Background Abstract Shapes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative w-full h-full max-w-6xl max-h-[90vh] md:w-[90vw] md:h-[80vh] bg-black/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">

                {/* Header Info */}
                <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
                    <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
                        <div className="flex flex-col">
                            <span className="text-white font-semibold text-sm">Secure Session</span>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">{status || 'Live'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Verification Badge */}
                    {verificationStatus && (
                        <div className={`px-4 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-top-2 duration-500 ${verificationStatus === 'verified' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                            verificationStatus === 'checking' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' :
                                'bg-red-500/20 border-red-500/50 text-red-400'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${verificationStatus === 'verified' ? 'bg-emerald-500' : verificationStatus === 'checking' ? 'bg-orange-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {verificationStatus === 'verified' ? 'Human Verified' : verificationStatus === 'checking' ? 'Checking Liveness...' : 'Identity Denied'}
                            </span>
                            {verificationStatus === 'verified' && (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                    )}
                </div>

                {/* Remote Stream (Main Area) */}
                <div className="flex-1 relative flex items-center justify-center bg-gray-900/50">
                    <div className="absolute inset-0 z-0">
                        {remoteStream ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-6">
                                <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                                    <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-600 rounded-full flex items-center justify-center text-4xl shadow-xl animate-pulse">
                                        {isVideo ? '📹' : '📞'}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-white text-2xl font-bold mb-1">{status || 'Connecting...'}</p>
                                    <p className="text-white/40 text-sm">Please wait while we establish a secure connection</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Verification Overlay for Instructions */}
                    {verificationStep && (
                        <div className="relative z-10 w-full max-w-md p-8 bg-black/60 backdrop-blur-2xl rounded-[40px] border border-white/10 shadow-2xl animate-in zoom-in duration-300">
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="p-4 bg-orange-500/20 rounded-2xl">
                                    <svg className="w-8 h-8 text-orange-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Identity Verification</h3>
                                    <p className="text-orange-400 font-bold text-2xl animate-pulse">
                                        {verificationStep === 'blink' ? 'Blink 3 Times Slowly' :
                                            verificationStep === 'turn' ? 'Turn your head Left' :
                                                verificationStep === 'smile' ? 'Smile for the camera' : 'Processing...'}
                                    </p>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-orange-500 h-full animate-progress-fast"></div>
                                </div>
                                <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Biometric Liveness Audit in Progress</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Local Stream (PIP) */}
                {localStream && (
                    <div className="absolute top-6 right-6 w-32 h-44 md:w-48 md:h-36 bg-black rounded-2xl border border-white/20 overflow-hidden shadow-2xl group transition-all hover:scale-105 z-20">
                        {camOff ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white/40 italic text-xs">
                                Camera Off
                            </div>
                        ) : (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                )}

                {/* Main Controls - Glassmorphism Dock */}
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-4 px-6 py-4 bg-black/40 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-2xl z-30">

                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-all duration-300 ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={toggleCamera}
                        className={`p-4 rounded-full transition-all duration-300 ${camOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={camOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                        {camOff ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>

                    {/* AI Verification Control (Admin Only) */}
                    {onVerify && !verificationStatus && (
                        <button
                            onClick={onVerify}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-4 rounded-full font-bold flex items-center gap-2 transform transition hover:scale-105 active:scale-95 shadow-xl shadow-orange-600/20 group"
                        >
                            <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-xs uppercase tracking-widest font-black">Verify Identity</span>
                        </button>
                    )}

                    <div className="w-px h-8 bg-white/10 mx-1"></div>

                    <button
                        onClick={onHangup}
                        className="bg-red-600 hover:bg-red-700 text-white p-5 rounded-full shadow-2xl transform transition hover:scale-110 active:scale-95 group"
                        title="End Call"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                        </svg>
                    </button>

                </div>

                {/* Footer Badges */}
                <div className="absolute bottom-6 right-8 hidden md:flex items-center gap-3">
                    <div className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-[9px] text-white/40 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse"></span>
                        Neural Analysis Layer Active
                    </div>
                </div>

            </div>
        </div>
    );
};

export default VideoCallInterface;
