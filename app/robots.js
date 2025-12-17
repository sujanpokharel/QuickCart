export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/seller/', '/api/'],
        },
        sitemap: 'http://localhost:3000/sitemap.xml',
    }
}
