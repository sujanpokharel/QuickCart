'use client'
import React, { useEffect, useRef } from 'react';

const VideoCallInterface = ({ localStream, remoteStream, isVideo, onHangup, status }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

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

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-4xl h-[80vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">

                {/* Remote Stream (Full Size) */}
                {remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center text-white animate-pulse">
                        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-4xl">
                            {isVideo ? '📹' : '📞'}
                        </div>
                        <p className="text-xl font-medium">{status || 'Connecting...'}</p>
                    </div>
                )}

                {/* Local Stream (PIP) */}
                {localStream && (
                    <div className="absolute bottom-4 right-4 w-32 h-48 sm:w-48 sm:h-36 bg-black rounded-xl border-2 border-white/20 overflow-hidden shadow-lg transform transition hover:scale-105">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted // Always mute local to avoid echo
                            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror
                        />
                    </div>
                )}

                {/* Controls */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
                    <button
                        onClick={onHangup}
                        className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                        </svg>
                    </button>
                </div>
            </div>
            <p className="text-white/60 mt-4 text-sm font-light">End-to-End Encrypted | {isVideo ? 'Video' : 'Audio'} Call</p>
        </div>
    );
};

export default VideoCallInterface;
