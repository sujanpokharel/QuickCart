'use client'
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Message sent successfully! We will get back to you soon.');
                setFormData({ name: '', email: '', message: '' });
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        }
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-white">
                <div className="text-center pt-10 border-t">
                    <h2 className="text-2xl text-gray-500">CONTACT <span className="text-gray-700 font-medium">US</span></h2>
                </div>

                <div className="my-10 flex flex-col justify-center md:flex-row gap-10 mb-28 px-6 md:px-16 lg:px-32">
                    <div className="flex flex-col justify-center items-start gap-6 max-w-md">
                        <p className="font-semibold text-xl text-gray-600">Our Store</p>
                        <p className="text-gray-500">
                            54709 Willms Station <br />
                            Suite 350, Washington, USA
                        </p>
                        <p className="text-gray-500">
                            Tel: (415) 555-0132 <br />
                            Email: support@quickcart.com
                        </p>
                        <p className="font-semibold text-xl text-gray-600">Careers at QuickCart</p>
                        <p className="text-gray-500">Learn more about our teams and job openings.</p>
                        <button className="border border-black px-8 py-4 text-sm hover:bg-black hover:text-white transition-all duration-500">
                            Explore Jobs
                        </button>
                    </div>

                    <div className="flex flex-col items-start gap-6 w-full max-w-md">
                        <p className="font-semibold text-xl text-gray-600">Get in Touch</p>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="border border-gray-300 rounded py-2.5 px-3.5 w-full focus:outline-none focus:ring-1 focus:ring-orange-500"
                                placeholder="Name"
                                required
                            />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="border border-gray-300 rounded py-2.5 px-3.5 w-full focus:outline-none focus:ring-1 focus:ring-orange-500"
                                placeholder="Email"
                                required
                            />
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                className="border border-gray-300 rounded py-2.5 px-3.5 w-full h-32 resize-none focus:outline-none focus:ring-1 focus:ring-orange-500"
                                placeholder="Message"
                                required
                            ></textarea>
                            <button
                                type="submit"
                                className="bg-orange-600 text-white font-medium py-3 px-8 rounded hover:bg-orange-700 transition w-fit self-start"
                            >
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Contact;
