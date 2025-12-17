import React from 'react'
import { assets } from '../../assets/assets'
import Image from 'next/image'
import { useAppContext } from '@/context/AppContext'

const Navbar = () => {
    const { router, logout, user } = useAppContext();
    const [unreadCount, setUnreadCount] = React.useState(0);

    React.useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await fetch('/api/admin/messages');
                const data = await res.json();
                if (data.success) {
                    const count = data.messages.filter(m => m.status === 'Unread').length;
                    setUnreadCount(count);
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 10000); // Check every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className='flex items-center px-4 md:px-8 py-3 justify-between border-b bg-gray-900 border-gray-700'>
            <div className="flex items-center gap-2" onClick={() => router.push('/')}>
                <Image className='w-28 lg:w-32 cursor-pointer' src={assets.logo} alt="" />
                <span className="text-white font-bold text-lg hidden sm:block">| Admin Panel</span>
            </div>
            <div className='flex items-center gap-6'>
                {/* Notification Bell */}
                <div
                    className="relative cursor-pointer hover:bg-gray-800 p-2 rounded-full transition"
                    onClick={() => router.push('/admin/messages')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border border-gray-900">
                            {unreadCount}
                        </span>
                    )}
                </div>

                {user && (
                    <span className='text-sm text-gray-300 hidden md:block'>Admin: {user.name}</span>
                )}
                <button
                    onClick={logout}
                    className='bg-red-600 text-white px-5 py-2 sm:px-7 sm:py-2 rounded-full text-xs sm:text-sm hover:bg-red-700 transition-colors'
                >
                    Logout
                </button>
            </div>
        </div>
    )
}

export default Navbar
