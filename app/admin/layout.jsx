'use client'
import Navbar from '@/components/admin/Navbar'
import Sidebar from '@/components/admin/Sidebar'
import React from 'react'

const Layout = ({ children }) => {
    return (
        <div className='min-h-screen bg-gray-100'>
            <Navbar />
            <div className='flex w-full'>
                <Sidebar />
                <div className="flex-1 p-6 overflow-y-auto h-[calc(100vh-64px)]">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Layout
