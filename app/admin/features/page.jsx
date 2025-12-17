'use client'
import React, { useState, useEffect } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAppContext } from "@/context/AppContext";

const FeaturesManager = () => {
    const { products: allProducts } = useAppContext();
    const [activeTab, setActiveTab] = useState('hero');
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [buttonText, setButtonText] = useState('Buy Now');

    // Fetch features
    const fetchFeatures = async () => {
        setFetching(true);
        try {
            const response = await fetch('/api/feature');
            const data = await response.json();
            if (data.success) {
                setFeatures(data.features || []);
            }
        } catch (error) {
            console.error('Error fetching features:', error);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchFeatures();
    }, []);

    const handleImageUpload = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Image Source State
    const [imageSourceValues, setImageSourceValues] = useState({
        main: { type: 'upload', value: null, preview: null },
        secondary: { type: 'upload', value: null, preview: null }
    });

    // Template images (filtered from assets)
    const templateImages = Object.keys(assets).filter(key => key.includes('image'));

    const handleImageSourceChange = (imageType, sourceType) => {
        setImageSourceValues(prev => ({
            ...prev,
            [imageType]: { ...prev[imageType], type: sourceType, value: null, preview: null }
        }));

        // If switching to 'product' and a product is already selected, auto-set it
        if (sourceType === 'product' && selectedProduct) {
            const prod = allProducts.find(p => p._id === selectedProduct);
            if (prod) {
                updateImageState(imageType, sourceType, prod.image[0], prod.image[0]);
            }
        }
    };

    const updateImageState = (imageType, sourceType, value, preview) => {
        let finalValue = value;
        // If value is a Next.js StaticImageData object, extract src string
        if (value && typeof value === 'object' && value.src) {
            finalValue = value.src;
        }

        setImageSourceValues(prev => ({
            ...prev,
            [imageType]: { ...prev[imageType], type: sourceType, value: finalValue, preview }
        }));
    };

    const handleFileChange = async (imageType, file) => {
        if (file) {
            const base64 = await handleImageUpload(file);
            updateImageState(imageType, 'upload', base64, base64);
        }
    };

    // Update product image if product selection changes and source is 'product'
    useEffect(() => {
        if (selectedProduct) {
            const prod = allProducts.find(p => p._id === selectedProduct);
            if (prod && prod.image && prod.image.length > 0) {
                // If main image is set to product source, update it
                if (imageSourceValues.main.type === 'product') {
                    updateImageState('main', 'product', prod.image[0], prod.image[0]);
                }
                // If secondary image is set to product source, update it
                if (imageSourceValues.secondary.type === 'product') {
                    updateImageState('secondary', 'product', prod.image[0], prod.image[0]);
                }
            }
        }
    }, [selectedProduct, allProducts]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!imageSourceValues.main.value) {
                toast.error('Main image is required');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: activeTab,
                    title,
                    description,
                    image: imageSourceValues.main.value,
                    secondaryImage: imageSourceValues.secondary.value || '',
                    product: selectedProduct || null,
                    buttonText
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Feature added successfully');
                // Reset form
                setTitle('');
                setDescription('');
                setImageSourceValues({
                    main: { type: 'upload', value: null, preview: null },
                    secondary: { type: 'upload', value: null, preview: null }
                });
                setSelectedProduct('');
                setButtonText('Buy Now');
                fetchFeatures();
            } else {
                toast.error(data.message || 'Failed to add feature');
            }
        } catch (error) {
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderImageSelector = (label, imageType) => {
        const state = imageSourceValues[imageType];

        return (
            <div className="space-y-2 border p-4 rounded-lg bg-gray-50/50">
                <label className="text-sm font-medium text-gray-700 block">{label}</label>

                {/* Source Tabs */}
                <div className="flex gap-2 mb-2">
                    {['upload', 'product', 'template'].map(type => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => handleImageSourceChange(imageType, type)}
                            className={`text-xs px-3 py-1.5 rounded border ${state.type === type
                                ? 'bg-orange-100 border-orange-300 text-orange-700 font-medium'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content based on source */}
                {state.type === 'upload' && (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {state.preview ? (
                                <Image src={state.preview} alt="Preview" width={200} height={100} className="max-h-28 object-contain" />
                            ) : (
                                <div className="text-center p-2">
                                    <p className="text-xs text-gray-500">Click to upload</p>
                                </div>
                            )}
                        </div>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange(imageType, e.target.files[0])} accept="image/*" />
                    </label>
                )}

                {state.type === 'product' && (
                    <div className="w-full h-32 border rounded-lg bg-white flex items-center justify-center">
                        {selectedProduct ? (
                            state.preview ? (
                                <Image src={state.preview} alt="Product" width={200} height={100} className="max-h-28 object-contain" />
                            ) : (
                                <p className="text-xs text-red-400">Selected product has no image</p>
                            )
                        ) : (
                            <p className="text-xs text-gray-400">Select a product below first</p>
                        )}
                    </div>
                )}

                {state.type === 'template' && (
                    <div className="w-full h-48 border rounded-lg bg-white overflow-y-auto p-2 grid grid-cols-3 gap-2">
                        {templateImages.map(key => (
                            <div
                                key={key}
                                onClick={() => updateImageState(imageType, 'template', assets[key], assets[key])}
                                className={`cursor-pointer border rounded overflow-hidden h-16 relative hover:opacity-80 ${state.value === assets[key] ? 'ring-2 ring-orange-500' : ''}`}
                                title={key}
                            >
                                <Image src={assets[key]} alt={key} fill className="object-cover" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this content?')) return;

        try {
            const response = await fetch(`/api/feature?id=${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Deleted successfully');
                fetchFeatures();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const filteredFeatures = features.filter(f => f.type === activeTab);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Manage Site Content</h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-gray-200 pb-2">
                {['hero', 'featured', 'banner'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${activeTab === tab
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)} Section
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Add Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                    <h2 className="text-lg font-semibold mb-6">Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {renderImageSelector('Main Image', 'main')}

                        {activeTab === 'banner' && renderImageSelector('Secondary Image (Optional)', 'secondary')}

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                placeholder="Enter title"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">
                                {activeTab === 'hero' ? 'Offer / Subheading' : 'Description'}
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                rows="3"
                                placeholder="Enter description"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Link Product</label>
                                <select
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                >
                                    <option value="">Select Product...</option>
                                    {allProducts.map(p => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Button Text</label>
                                <input
                                    type="text"
                                    value={buttonText}
                                    onChange={(e) => setButtonText(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400"
                        >
                            {loading ? 'Saving...' : 'Add Content'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
                    <h2 className="text-lg font-semibold mb-6">Existing Content ({filteredFeatures.length})</h2>
                    {fetching ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : filteredFeatures.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <p>No content in this section yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {filteredFeatures.map(item => (
                                <div key={item._id} className="flex gap-4 p-4 border rounded-lg hover:shadow-md transition bg-gray-50">
                                    <div className="w-24 h-24 flex-shrink-0 relative bg-white rounded-md overflow-hidden border">
                                        <Image src={item.image} alt={item.title} fill className="object-contain" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900 line-clamp-1">{item.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                                {item.type}
                                            </span>
                                            {item.product && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Linked</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(item._id)}
                                        className="text-red-500 hover:bg-red-50 p-2 rounded-full h-fit transition self-center"
                                        title="Delete"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FeaturesManager;
