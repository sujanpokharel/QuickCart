import React from 'react'
import { assets } from '../../assets/assets'
import Image from 'next/image'
import { useAppContext } from '@/context/AppContext'

const Navbar = () => {
  const { router, logout, user } = useAppContext();

  return (
    <div className='flex items-center px-4 md:px-8 py-3 justify-between border-b'>
      <Image onClick={() => router.push('/')} className='w-28 lg:w-32 cursor-pointer' src={assets.logo} alt="" />
      <div className='flex items-center gap-4'>
        {user && (
          <span className='text-sm text-gray-600'>Welcome, {user.name}</span>
        )}
        <button
          onClick={logout}
          className='bg-gray-600 text-white px-5 py-2 sm:px-7 sm:py-2 rounded-full text-xs sm:text-sm hover:bg-gray-700 transition-colors'
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default Navbar