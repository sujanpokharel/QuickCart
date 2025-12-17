'use client';
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Footer from "@/components/seller/Footer";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";

const Orders = () => {

    const { currency } = useAppContext();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSellerOrders = async () => {
        try {
            const response = await fetch('/api/order/seller');
            const data = await response.json();

            if (data.success) {
                setOrders(data.orders);
            } else {
                // If not a seller or no orders, show empty state
                setOrders([]);
            }
        } catch (error) {
            toast.error('Error fetching orders: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    const updateOrderStatus = async (orderId, status) => {
        try {
            const response = await fetch('/api/order/seller', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orderId, status }),
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Order status updated');
                // Update local state
                setOrders(orders.map(order =>
                    order._id === orderId ? { ...order, status } : order
                ));
            } else {
                toast.error(data.message || 'Failed to update order status');
            }
        } catch (error) {
            toast.error('Error updating order: ' + error.message);
        }
    }

    useEffect(() => {
        fetchSellerOrders();
    }, []);

    return (
        <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm">
            {loading ? <Loading /> : <div className="md:p-10 p-4 space-y-5">
                <h2 className="text-lg font-medium">Orders</h2>
                {orders.length === 0 ? (
                    <p className="text-gray-500">No orders found. Orders will appear here when customers purchase your products.</p>
                ) : (
                    <div className="max-w-4xl rounded-md">
                        {orders.map((order, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-5 justify-between p-5 border-t border-gray-300">
                                <div className="flex-1 flex gap-5 max-w-80">
                                    <Image
                                        className="max-w-16 max-h-16 object-cover"
                                        src={assets.box_icon}
                                        alt="box_icon"
                                    />
                                    <p className="flex flex-col gap-3">
                                        <span className="font-medium">
                                            {order.items.map((item) => item.product?.name + ` x ${item.quantity}`).join(", ")}
                                        </span>
                                        <span>Items : {order.items.length}</span>
                                    </p>
                                </div>
                                <div>
                                    <p>
                                        <span className="font-medium">{order.address?.fullName}</span>
                                        <br />
                                        <span >{order.address?.area}</span>
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
                                        <span>Payment : {order.isPaid ? 'Paid' : 'Pending'}</span>
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-gray-500">Update Status:</label>
                                    <select
                                        value={order.status || 'Order Placed'}
                                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                                        className="px-2 py-1.5 border rounded text-sm outline-none focus:border-orange-500"
                                    >
                                        <option value="Order Placed">Order Placed</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Out for Delivery">Out for Delivery</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>}
            <Footer />
        </div>
    );
};

export default Orders;