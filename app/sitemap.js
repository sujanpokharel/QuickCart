import Product from '@/models/Product';
import connectDB from '@/config/db';

export default async function sitemap() {
    await connectDB();
    const products = await Product.find({}, '_id date');
    const baseUrl = 'http://localhost:3000'; // Should be updated in production

    const productUrls = products.map((product) => ({
        url: `${baseUrl}/product/${product._id}`,
        lastModified: product.date || new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/all-products`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        ...productUrls,
    ];
}
