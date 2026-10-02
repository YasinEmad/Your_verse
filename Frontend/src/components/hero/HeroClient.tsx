"use client";

import Lottie from "lottie-react";
import animationData from "@/components/Rocket.json";

export function HeroClient() {
  return (
    <div className="mx-auto flex w-full justify-center">
      <div className="w-[260px] sm:w-[360px] md:w-[520px]">
        <Lottie animationData={animationData} loop autoplay />
      </div>
    </div>
  );
}

export default HeroClient;
