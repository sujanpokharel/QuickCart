'use client';
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";

const MyOrders = () => {

    const { currency, user, router } = useAppContext();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const response = await fetch('/api/order');
            const data = await response.json();

            if (data.success) {
                setOrders(data.orders || []);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (user) {
            fetchOrders();
        } else {
            setLoading(false);
        }
    }, [user]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Order Placed':
                return 'text-blue-600 bg-blue-50';
            case 'Shipped':
                return 'text-purple-600 bg-purple-50';
            case 'Out for Delivery':
                return 'text-orange-600 bg-orange-50';
            case 'Delivered':
                return 'text-green-600 bg-green-50';
            case 'Cancelled':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <>
            <Navbar />
            <div className="flex flex-col justify-between px-6 md:px-16 lg:px-32 py-6 min-h-screen">
                <div className="space-y-5">
                    <h2 className="text-lg font-medium mt-6">My Orders</h2>
                    {loading ? <Loading /> : (
                        <div className="max-w-5xl border-t border-gray-300 text-sm">
                            {orders.length === 0 ? (
                                <div className="py-16 text-center">
                                    <Image
                                        src={assets.box_icon}
                                        alt="No orders"
                                        className="mx-auto w-16 h-16 opacity-50 mb-4"
                                    />
                                    <p className="text-gray-500 mb-4">You haven't placed any orders yet</p>
                                    <button
                                        onClick={() => router.push('/all-products')}
                                        className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 transition-colors"
                                    >
                                        Start Shopping
                                    </button>
                                </div>
                            ) : (
                                orders.map((order, index) => (
                                    <div key={order._id || index} className="flex flex-col md:flex-row gap-5 justify-between p-5 border-b border-gray-300">
                                        <div className="flex-1 flex gap-5 max-w-80">
                                            <Image
                                                className="max-w-16 max-h-16 object-cover"
                                                src={assets.box_icon}
                                                alt="box_icon"
                                            />
                                            <p className="flex flex-col gap-3">
                                                <span className="font-medium text-base">
                                                    {order.items.map((item) =>
                                                        item.product ? `${item.product.name} x ${item.quantity}` : `Product x ${item.quantity}`
                                                    ).join(", ")}
                                                </span>
                                                <span>Items : {order.items.length}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p>
                                                <span className="font-medium">{order.address?.fullName}</span>
                                                <br />
                                                <span>{order.address?.area}</span>
                                                <br />
                                                <span>{`${order.address?.city}, ${order.address?.state}`}</span>
                                                <br />
                                                <span>{order.address?.phoneNumber}</span>
                                            </p>
                                        </div>
                                        <p className="font-medium my-auto">{currency}{order.amount}</p>
                                        <div>
                                            <p className="flex flex-col gap-1">
                                                <span>Method : {order.paymentMethod || 'COD'}</span>
                                                <span>Date : {new Date(order.date).toLocaleDateString()}</span>
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default MyOrders;