"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Instagram } from "lucide-react";

const posts = [
  {
    id: "1",
    src: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800&auto=format&fit=crop",
    alt: "Espresso w filiżance — Il Buon Caffe Koszalin",
  },
  {
    id: "2",
    src: "https://images.unsplash.com/photo-1474722883778-792e7990302f?q=80&w=800&auto=format&fit=crop",
    alt: "Włoskie wino w kieliszku — sklep Il Buon Caffe",
  },
  {
    id: "3",
    src: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=800&auto=format&fit=crop",
    alt: "Oliwa z oliwek extra virgin — włoskie delikatesy Il Buon Caffe",
  },
  {
    id: "4",
    src: "https://images.unsplash.com/photo-1548940740-204726a19be3?q=80&w=800&auto=format&fit=crop",
    alt: "Włoskie słodycze i migdały — Il Buon Caffe",
  },
  {
    id: "5",
    src: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=800&auto=format&fit=crop",
    alt: "Kawa ziarnista specialty — Il Buon Caffe sklep online",
  },
  {
    id: "6",
    src: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800&auto=format&fit=crop",
    alt: "Włoskie produkty premium — oliwy, wina, kawa Il Buon Caffe",
  },
];

export const InstagramFeed = () => {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10"
        >
          <div className="flex items-center gap-3">
            <Instagram className="w-5 h-5 text-brand-700" aria-hidden="true" />
            <span className="font-serif text-2xl text-brand-900">@il_buoncaffe</span>
          </div>
          <a
            href="https://www.instagram.com/il_buoncaffe/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 hover:text-brand-900 transition-colors"
          >
            Obserwuj nas
          </a>
        </motion.div>

        {/* Grid */}
        <a
          href="https://www.instagram.com/il_buoncaffe/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Przejdź do profilu Il Buon Caffe na Instagramie"
          className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2"
        >
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group relative aspect-square overflow-hidden bg-brand-100"
            >
              <Image
                src={post.src}
                alt={post.alt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/30 transition-colors duration-400 flex items-center justify-center">
                <Instagram className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
              </div>
            </motion.div>
          ))}
        </a>
      </div>
    </section>
  );
};
