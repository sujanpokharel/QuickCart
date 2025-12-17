'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const SeedDatabase = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [result, setResult] = useState(null);

    const checkStatus = async () => {
        try {
            const response = await fetch('/api/seed');
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            toast.error('Failed to check database status');
        }
    };

    const seedDatabase = async () => {
        if (!confirm('This will clear existing products and add demo data. Continue?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/seed', {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Database seeded successfully!');
                setResult(data.data);
                checkStatus();
            } else {
                toast.error(data.message || 'Failed to seed database');
            }
        } catch (error) {
            toast.error('Error seeding database: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        checkStatus();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">
                        🌱 Database Seeder
                    </h1>

                    <p className="text-gray-600 mb-6">
                        This tool will populate your local MongoDB database with demo products, users, and sample data.
                    </p>

                    {/* Current Status */}
                    {status && (
                        <div className="bg-gray-100 rounded-lg p-4 mb-6">
                            <h2 className="font-semibold text-gray-900 mb-2">Current Database Status</h2>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Products:</span>
                                    <span className="font-medium">{status.counts?.products || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Users:</span>
                                    <span className="font-medium">{status.counts?.users || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Orders:</span>
                                    <span className="font-medium">{status.counts?.orders || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Addresses:</span>
                                    <span className="font-medium">{status.counts?.addresses || 0}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* What will be created */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h2 className="font-semibold text-blue-900 mb-2">What will be created:</h2>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>✓ 10 demo products (electronics, laptops, cameras, etc.)</li>
                            <li>✓ Demo seller account (seller@demo.com / demo123456)</li>
                            <li>✓ Demo customer account (customer@demo.com / demo123456)</li>
                            <li>✓ Sample shipping address</li>
                            <li>✓ Sample order</li>
                        </ul>
                    </div>

                    {/* Seed Button */}
                    <button
                        onClick={seedDatabase}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Seeding Database...' : 'Seed Database'}
                    </button>

                    {/* Result */}
                    {result && (
                        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                            <h2 className="font-semibold text-green-900 mb-3">✅ Seeding Complete!</h2>
                            <div className="text-sm text-green-800 space-y-3">
                                <div className="bg-white rounded p-3">
                                    <p className="font-medium mb-1">Seller Account:</p>
                                    <p>Email: {result.seller.email}</p>
                                    <p>Password: {result.seller.password}</p>
                                </div>
                                <div className="bg-white rounded p-3">
                                    <p className="font-medium mb-1">Customer Account:</p>
                                    <p>Email: {result.customer.email}</p>
                                    <p>Password: {result.customer.password}</p>
                                </div>
                                <p className="font-medium">Products added: {result.productsCount}</p>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Go to Homepage
                        </button>
                        <button
                            onClick={() => router.push('/login')}
                            className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeedDatabase;
