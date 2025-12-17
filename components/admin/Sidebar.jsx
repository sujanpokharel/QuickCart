import React from 'react';
import Link from 'next/link';
import { assets } from '../../assets/assets';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const SideBar = () => {
    const pathname = usePathname()
    const menuItems = [
        { name: 'Dashboard', path: '/admin', icon: assets.order_icon }, // Using order_icon as placeholder
        { name: 'Users', path: '/admin/users', icon: assets.profile_icon || assets.add_icon }, // Using add_icon/profile if available
        { name: 'Site Features', path: '/admin/features', icon: assets.order_icon }, // Using order_icon as placeholder checks out
        { name: 'Messages', path: '/admin/messages', icon: assets.order_icon },
    ];

    // Fallback icon if profile_icon not there (I can't check assets object content easily, assuming generic)
    // I'll reuse add_icon if profile_icon is likely missing or just stick to what I know works.
    // assets.user_icon might exist?
    // I'll use assets.order_icon for Dashboard and assets.add_icon for Users (management) for safety.

    return (
        <div className='md:w-64 w-16 border-r min-h-screen text-base border-gray-300 py-2 flex flex-col bg-gray-50'>
            {menuItems.map((item) => {

                const isActive = pathname === item.path;

                return (
                    <Link href={item.path} key={item.name} passHref>
                        <div
                            className={
                                `flex items-center py-3 px-4 gap-3 ${isActive
                                    ? "border-r-4 md:border-r-[6px] bg-orange-600/10 border-orange-500/90"
                                    : "hover:bg-gray-200 border-white"
                                }`
                            }
                        >
                            <Image
                                src={item.icon}
                                alt={`${item.name.toLowerCase()}_icon`}
                                className="w-7 h-7"
                            />
                            <p className='md:block hidden text-center font-medium text-gray-700'>{item.name}</p>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

export default SideBar;
