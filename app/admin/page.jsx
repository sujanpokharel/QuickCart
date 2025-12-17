'use client';
import React from 'react';

const AdminDashboard = () => {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Admin Dashboard</h1>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold mb-2">Welcome, Super Admin</h2>
                <p className="text-gray-600">
                    Manage your users, sellers, and platform settings from here.
                    Select "Users" from the sidebar to manage accounts.
                </p>
            </div>
        </div>
    );
};

export default AdminDashboard;
