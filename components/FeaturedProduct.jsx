'use client';
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import Link from "next/link";

const FeaturedProduct = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await fetch('/api/feature?type=featured');
        const data = await res.json();
        if (data.success) {
          setProducts(data.features);
        }
      } catch (error) {
        console.error("Error fetching featured products:", error);
      }
    };
    fetchFeatures();
  }, []);

  if (products.length === 0) return null;

  return (
    <div className="mt-14">
      <div className="flex flex-col items-center">
        <p className="text-3xl font-medium">Featured Products</p>
        <div className="w-28 h-0.5 bg-orange-600 mt-2"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-14 mt-12 md:px-14 px-4">
        {products.map(({ _id, image, title, description, product, buttonText }) => (
          <div key={_id} className="relative group">
            <div className="relative w-full h-72 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={image}
                alt={title}
                fill
                className="group-hover:brightness-75 transition duration-300 object-cover"
              />
            </div>
            <div className="group-hover:-translate-y-4 transition duration-300 absolute bottom-8 left-8 text-white space-y-2">
              <p className="font-medium text-xl lg:text-2xl drop-shadow-md">{title}</p>
              <p className="text-sm lg:text-base leading-5 max-w-60 drop-shadow-md">
                {description}
              </p>
              <Link href={product ? `/product/${product}` : '/all-products'}>
                <button className="flex items-center gap-1.5 bg-orange-600 px-4 py-2 rounded mt-2 hover:bg-orange-700 transition">
                  {buttonText || 'Buy now'} <Image className="h-3 w-3" src={assets.redirect_icon} alt="Redirect Icon" />
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedProduct;
