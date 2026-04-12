'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { ChevronLeft, ChevronRight, X, Play, Pause, Image as ImageIcon } from 'lucide-react'

interface GalleryPageProps {
  user: User | null
}

const houseImages = [
  {
    id: 1,
    title: 'Modern Living Room',
    description: 'Spacious living area with premium furnishings and natural light',
    src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
    alt: 'Luxury living room'
  },
  {
    id: 2,
    title: 'Executive Kitchen',
    description: 'State-of-the-art kitchen with high-end appliances and quartz countertops',
    src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
    alt: 'Modern kitchen'
  },
  {
    id: 3,
    title: 'Master Bedroom',
    description: 'Elegant master suite with panoramic city views',
    src: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&h=600&fit=crop',
    alt: 'Luxury bedroom'
  },
  {
    id: 4,
    title: 'Spa Bathroom',
    description: 'Luxurious bathroom with marble finishes and rainfall shower',
    src: 'https://images.unsplash.com/photo-1552321554-5fefe8bfe9d9?w=800&h=600&fit=crop',
    alt: 'Spa bathroom'
  },
  {
    id: 5,
    title: 'Rooftop Terrace',
    description: 'Private rooftop with panoramic views and lounge area',
    src: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    alt: 'Rooftop terrace'
  },
  {
    id: 6,
    title: 'Fitness Center',
    description: 'Fully equipped gym facilities with premium equipment',
    src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
    alt: 'Fitness center'
  }
]

export default function GalleryPage({ user }: GalleryPageProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clear interval utility
  const clearSlideshow = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Start slideshow
  const startSlideshow = useCallback(() => {
    clearSlideshow()
    setIsPlaying(true)
    intervalRef.current = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % houseImages.length)
    }, 3000)
  }, [clearSlideshow])

  // Stop slideshow
  const stopSlideshow = useCallback(() => {
    clearSlideshow()
    setIsPlaying(false)
  }, [clearSlideshow])

  // Navigate functions with slideshow reset
  const nextImage = useCallback(() => {
    setCurrentImage((prev) => (prev + 1) % houseImages.length)
    if (isPlaying) {
      clearSlideshow()
      startSlideshow()
    }
  }, [isPlaying, clearSlideshow, startSlideshow])

  const prevImage = useCallback(() => {
    setCurrentImage((prev) => (prev - 1 + houseImages.length) % houseImages.length)
    if (isPlaying) {
      clearSlideshow()
      startSlideshow()
    }
  }, [isPlaying, clearSlideshow, startSlideshow])

  // Start virtual tour (opens modal + starts slideshow)
  const startTour = useCallback(() => {
    setShowModal(true)
    if (!isPlaying) {
      startSlideshow()
    }
  }, [isPlaying, startSlideshow])

  // Close modal and cleanup
  const closeModal = useCallback(() => {
    setShowModal(false)
    stopSlideshow()
  }, [stopSlideshow])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearSlideshow()
  }, [clearSlideshow])

  // Keyboard navigation
  useEffect(() => {
    if (!showModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, prevImage, nextImage, closeModal])

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header with glassmorphism */}
      <div className="sticky top-0 z-10 px-6 py-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
              Property Gallery
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
              Explore our luxury residences • {houseImages.length} exclusive spaces
            </p>
          </div>
          <button
            onClick={startTour}
            className="group relative inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-full font-medium shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-4 h-4 group-hover:animate-pulse" />
            <span>Start Virtual Tour</span>
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
          {houseImages.map((image, index) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/50 shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:border-amber-500/50"
              onClick={() => {
                setCurrentImage(index)
                setShowModal(true)
                if (isPlaying) stopSlideshow()
              }}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:rotate-1"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="font-serif text-xl font-semibold text-white tracking-tight">{image.title}</h3>
                  <p className="text-sm text-white/80 mt-1 line-clamp-2">{image.description}</p>
                </div>
              </div>
              <div className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Elegant Modal for Virtual Tour */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-500 animate-in fade-in"
          onClick={closeModal}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all duration-300 hover:scale-110 group"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Image Counter */}
            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-white text-sm font-medium">
              {currentImage + 1} / {houseImages.length}
            </div>

            {/* Image Container */}
            <div className="relative aspect-video bg-slate-900">
              <img
                src={houseImages[currentImage].src}
                alt={houseImages[currentImage].alt}
                className="w-full h-full object-contain transition-all duration-500"
              />

              {/* Navigation arrows - refined */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110 group border border-white/20"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110 group border border-white/20"
              >
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Play/Pause - Central elegant button */}
              <button
                onClick={isPlaying ? stopSlideshow : startSlideshow}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-amber-500/40 transition-all duration-300 hover:scale-110 shadow-md"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
            </div>

            {/* Info & Thumbnails */}
            <div className="p-6 md:p-8">
              <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 dark:text-white tracking-tight">
                  {houseImages[currentImage].title}
                </h2>
                <p className="text-slate-500 dark:text-slate-300 mt-2 text-sm md:text-base leading-relaxed">
                  {houseImages[currentImage].description}
                </p>
              </div>

              {/* Thumbnail strip with elegant scroll */}
              <div className="mt-6">
                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                  {houseImages.map((img, index) => (
                    <button
                      key={img.id}
                      onClick={() => {
                        setCurrentImage(index)
                        if (isPlaying) {
                          clearSlideshow()
                          startSlideshow()
                        }
                      }}
                      className={`relative shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden transition-all duration-300 ${
                        index === currentImage
                          ? 'ring-2 ring-amber-500 shadow-lg scale-105'
                          : 'ring-1 ring-slate-200 dark:ring-slate-700 opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="w-full h-full object-cover"
                      />
                      {index === currentImage && (
                        <div className="absolute inset-0 bg-amber-500/10"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}