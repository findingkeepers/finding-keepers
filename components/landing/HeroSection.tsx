"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { AnimatedButton } from "@/components/ui/animated-button";
import { TrustStrip } from "./TrustStrip";

const fadeUp = (delay: number) => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
});

export function HeroSection() {
  return (
    <section className="relative isolate min-h-screen w-full overflow-hidden bg-[#faf9f6]">
      {/* Landing-only decorative background */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <Image
          src="/images/landing-bg.png"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      {/* Text & buttons overlaid on the open centre of the artwork */}
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp(0)}
          className="w-full max-w-xl text-center"
        >
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp(0)}
            className="fk-eyebrow mb-6 sm:mb-8"
          >
            You are invited to
          </motion.p>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.12)}
            className="fk-title text-[clamp(2.75rem,9vw,5rem)] leading-[1.08] text-fk-plum-light drop-shadow-sm"
          >
            Finding Keepers
          </motion.h1>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.24)}
            className="mx-auto my-6 w-24 fk-gold-line sm:my-8"
          />

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.32)}
            className="fk-eyebrow mb-3 text-fk-plum-deep"
          >
            A New Beginning
          </motion.p>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.4)}
            className="fk-tagline mx-auto max-w-md text-balance"
          >
            Helping You Find Your Right Fit
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp(0.52)}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:mt-12 sm:flex-row sm:gap-6"
          >
            <AnimatedButton href="/register" variant="primary">
              Register
            </AnimatedButton>
            <AnimatedButton href="/login" variant="outline">
              Login
            </AnimatedButton>
          </motion.div>
        </motion.div>

        <TrustStrip />
      </div>
    </section>
  );
}