import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageIcon, AlertCircle } from 'lucide-react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  placeholder?: string;
  blurDataURL?: string;
  quality?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallback?: React.ReactNode;
  responsive?: boolean;
  lazy?: boolean;
}

interface ImageState {
  loaded: boolean;
  error: boolean;
  inView: boolean;
  currentSrc: string;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  sizes,
  placeholder,
  blurDataURL,
  quality = 85,
  priority = false,
  onLoad,
  onError,
  fallback,
  responsive = true,
  lazy = true
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageState, setImageState] = useState<ImageState>({
    loaded: false,
    error: false,
    inView: priority, // If priority, immediately consider in view
    currentSrc: blurDataURL || placeholder || ''
  });

  // Generate optimized image URLs with WebP support
  const generateSrcSet = useCallback((baseSrc: string) => {
    if (!baseSrc) return { webpSrcSet: '', fallbackSrcSet: '' };
    
    const sizes = [480, 768, 1024, 1280, 1600];
    const webpSrcSet = sizes
      .map(size => `${baseSrc}?w=${size}&q=${quality}&f=webp ${size}w`)
      .join(', ');
    
    const fallbackSrcSet = sizes
      .map(size => `${baseSrc}?w=${size}&q=${quality} ${size}w`)
      .join(', ');
    
    return { webpSrcSet, fallbackSrcSet };
  }, [quality]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || imageState.inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageState(prev => ({ ...prev, inView: true }));
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority, imageState.inView]);

  // Handle image loading
  const handleImageLoad = useCallback(() => {
    setImageState(prev => ({ ...prev, loaded: true, error: false }));
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageState(prev => ({ ...prev, error: true, loaded: false }));
    onError?.();
  }, [onError]);

  // Update src when image comes into view
  useEffect(() => {
    if (imageState.inView && !imageState.loaded && !imageState.error) {
      setImageState(prev => ({ ...prev, currentSrc: src }));
    }
  }, [imageState.inView, imageState.loaded, imageState.error, src]);

  // Generate responsive image attributes
  const srcSets = generateSrcSet(src);
  
  // Calculate aspect ratio if width and height provided
  const aspectRatio = width && height ? (height / width) * 100 : undefined;

  // Base image styles
  const imageStyles = {
    transition: 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
    opacity: imageState.loaded ? 1 : 0.8,
    filter: imageState.loaded ? 'blur(0px)' : 'blur(4px)',
    objectFit: 'cover' as const,
    width: responsive && !width ? '100%' : width,
    height: responsive && !height ? 'auto' : height
  };

  // Container styles for responsive images
  const containerStyles = aspectRatio ? {
    position: 'relative' as const,
    width: '100%',
    paddingBottom: `${aspectRatio}%`
  } : {};

  // Render error state
  if (imageState.error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        {fallback || (
          <div className="flex flex-col items-center text-gray-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <span className="text-sm">Failed to load image</span>
          </div>
        )}
      </div>
    );
  }

  // Render placeholder while not in view or loading
  if (!imageState.inView || (!imageState.loaded && !imageState.currentSrc)) {
    return (
      <div 
        ref={imgRef}
        className={`flex items-center justify-center bg-gray-100 animate-pulse ${className}`}
        style={{ width, height, ...containerStyles }}
      >
        <ImageIcon className="w-8 h-8 text-gray-300" />
      </div>
    );
  }

  // Render progressive image with WebP support
  return (
    <div className={responsive && aspectRatio ? 'relative' : ''} style={containerStyles}>
      <picture>
        {/* WebP source for modern browsers */}
        {srcSets.webpSrcSet && (
          <source 
            srcSet={srcSets.webpSrcSet}
            sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
            type="image/webp"
          />
        )}
        
        {/* Fallback source */}
        {srcSets.fallbackSrcSet && (
          <source 
            srcSet={srcSets.fallbackSrcSet}
            sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          />
        )}
        
        {/* Main image element */}
        <img
          ref={imgRef}
          src={imageState.currentSrc}
          alt={alt}
          className={`${className} ${responsive && aspectRatio ? 'absolute inset-0' : ''}`}
          style={{
            ...imageStyles,
            ...(responsive && aspectRatio ? { width: '100%', height: '100%' } : {})
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          decoding="async"
        />
        
        {/* Blur placeholder overlay */}
        {blurDataURL && !imageState.loaded && (
          <img
            src={blurDataURL}
            alt=""
            className={`${className} ${responsive && aspectRatio ? 'absolute inset-0' : ''}`}
            style={{
              ...imageStyles,
              opacity: imageState.loaded ? 0 : 1,
              filter: 'blur(8px)',
              zIndex: -1,
              ...(responsive && aspectRatio ? { width: '100%', height: '100%' } : {})
            }}
            aria-hidden="true"
          />
        )}
      </picture>
      
      {/* Loading indicator */}
      {!imageState.loaded && imageState.currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

// Higher-order component for automatic progressive loading
export const withProgressiveLoading = <P extends object>(
  Component: React.ComponentType<P & { src: string }>
) => {
  return React.forwardRef<any, P & { 
    src: string; 
    progressiveOptions?: Partial<ProgressiveImageProps> 
  }>((props, ref) => {
    const { src, progressiveOptions, ...rest } = props;
    
    if (src.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      return (
        <ProgressiveImage
          ref={ref}
          src={src}
          alt=""
          {...progressiveOptions}
          {...rest}
        />
      );
    }
    
    return <Component ref={ref} src={src} {...(rest as P)} />;
  });
};

// Hook for generating blur data URLs
export const useBlurDataURL = (src: string): string | null => {
  const [blurDataURL, setBlurDataURL] = useState<string | null>(null);
  
  useEffect(() => {
    if (!src) return;
    
    // Generate a simple blur data URL (can be enhanced with actual image processing)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = 10;
    canvas.height = 10;
    
    // Create a simple gradient as placeholder
    const gradient = ctx.createLinearGradient(0, 0, 10, 10);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 10, 10);
    
    setBlurDataURL(canvas.toDataURL());
  }, [src]);
  
  return blurDataURL;
};

// Hook for preloading critical images
export const useImagePreloader = (sources: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    sources.forEach(src => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
      };
      img.src = src;
    });
  }, [sources]);
  
  return loadedImages;
};

export default ProgressiveImage;