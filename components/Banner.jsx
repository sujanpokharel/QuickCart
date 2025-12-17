'use client';
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import Link from "next/link";

const Banner = () => {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await fetch('/api/feature?type=banner');
        const data = await res.json();
        if (data.success && data.features.length > 0) {
          setBanner(data.features[0]);
        }
      } catch (error) {
        console.error("Error fetching banner:", error);
      }
    };
    fetchFeatures();
  }, []);

  if (!banner) return null;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between md:pl-20 py-14 md:py-0 bg-[#E6E9F2] my-16 rounded-xl overflow-hidden relative">
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-2 px-4 md:px-0 order-2 md:order-1 flex-1">
        <h2 className="text-2xl md:text-3xl font-semibold max-w-[290px]">
          {banner.title}
        </h2>
        <p className="max-w-[343px] font-medium text-gray-800/60">
          {banner.description}
        </p>
        <Link href={banner.product ? `/product/${banner.product}` : '/all-products'}>
          <button className="group flex items-center justify-center gap-1 px-12 py-2.5 bg-orange-600 rounded text-white mt-4 hover:bg-orange-700 transition">
            {banner.buttonText || 'Buy now'}
            <Image className="group-hover:translate-x-1 transition" src={assets.arrow_icon_white} alt="arrow_icon_white" />
          </button>
        </Link>
      </div>

      <div className="order-1 md:order-0 md:absolute left-10 bottom-0">
        <Image
          className="max-w-40 md:max-w-56 object-contain"
          src={banner.image}
          alt="Main Banner Image"
          width={300}
          height={300}
        />
      </div>

      {banner.secondaryImage && (
        <div className="hidden md:block order-3 relative">
          <Image
            className="max-w-60 md:max-w-80 object-contain"
            src={banner.secondaryImage}
            alt="Secondary Banner Image"
            width={400}
            height={400}
          />
        </div>
      )}
    </div>
  );
};

export default Banner;