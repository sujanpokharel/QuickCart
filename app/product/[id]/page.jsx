import Product from '@/models/Product';
import connectDB from '@/config/db';
import ProductClient from '@/components/ProductClient';
import React from 'react';

// Next.js 15 requires awaiting params
export async function generateMetadata({ params }) {
    const { id } = await params;
    await connectDB();

    try {
        const product = await Product.findById(id);
        if (!product) {
            return {
                title: 'Product Not Found | QuickCart',
                description: 'The requested product could not be found on QuickCart.'
            };
        }

        return {
            title: `${product.name} | QuickCart`,
            description: product.description.substring(0, 160), // SEO friendly truncation
            openGraph: {
                title: product.name,
                description: product.description,
                images: product.image.map(url => ({
                    url: url,
                    width: 1200,
                    height: 630,
                    alt: product.name
                })),
                type: 'website',
                siteName: 'QuickCart'
            },
            twitter: {
                card: 'summary_large_image',
                title: product.name,
                description: product.description.substring(0, 160),
                images: product.image[0]
            }
        };
    } catch (error) {
        return {
            title: 'QuickCart Store',
            description: 'Shop the best products at QuickCart.'
        };
    }
}

export default async function ProductPage({ params }) {
    const { id } = await params;
    await connectDB();

    let product = null;
    try {
        product = await Product.findById(id);
    } catch (error) {
        // Handle invalid ID or DB error
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold text-gray-800">Product Not Found</h1>
                <p className="text-gray-600 mt-2">The product you are looking for does not exist.</p>
                <a href="/" className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Go Home</a>
            </div>
        );
    }

    // Serializable JSON for Client Component
    const productJson = JSON.parse(JSON.stringify(product));

    // Structured Data for Google Rich Snippets
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.image,
        description: product.description,
        sku: product._id,
        brand: {
            '@type': 'Brand',
            name: 'Generic' // Matching UI 'Brand: Generic'
        },
        offers: {
            '@type': 'Offer',
            url: `http://localhost:3000/product/${id}`, // ideally should be env variable
            priceCurrency: 'USD',
            price: product.offerPrice,
            itemCondition: 'https://schema.org/NewCondition',
            availability: 'https://schema.org/InStock',
            seller: {
                '@type': 'Organization',
                name: 'QuickCart'
            }
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.5',
            reviewCount: '10' // Dummy data matching UI
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProductClient id={id} initialData={productJson} />
        </>
    );
}