import { useMemo, useState, useCallback } from 'react';
import { File } from '../lib/api';

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  blur?: number;
  sharpen?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  background?: string;
}

interface ResponsiveImageUrls {
  src: string;
  srcSet: string;
  webpSrcSet?: string;
  avifSrcSet?: string;
  placeholder: string;
  blurDataURL: string;
  sizes: string;
}

// Standard responsive breakpoints
const RESPONSIVE_SIZES = [320, 480, 768, 1024, 1280, 1600, 1920];

// Default image qualities for different formats
const DEFAULT_QUALITIES = {
  webp: 85,
  avif: 80,
  jpeg: 85,
  png: 95
};

/**
 * Hook for generating optimized image URLs with CDN transformations
 */
export const useOptimizedImage = (
  file: File | null,
  options: ImageTransformOptions = {}
): ResponsiveImageUrls | null => {
  return useMemo(() => {
    if (!file || file.type !== 'image' || !file.storage.cdnUrl) {
      return null;
    }

    const {
      width,
      height,
      quality = DEFAULT_QUALITIES.jpeg,
      format = 'auto',
      fit = 'cover',
      blur,
      sharpen,
      brightness,
      contrast,
      saturation,
      background
    } = options;

    const baseUrl = file.storage.cdnUrl;

    // Build transformation parameters
    const buildTransformParams = (w?: number, h?: number, fmt?: string, q?: number): string => {
      const params = new URLSearchParams();
      
      if (w) params.append('w', w.toString());
      if (h) params.append('h', h.toString());
      if (fmt && fmt !== 'auto') params.append('f', fmt);
      if (q) params.append('q', q.toString());
      if (fit !== 'cover') params.append('fit', fit);
      if (blur) params.append('blur', blur.toString());
      if (sharpen) params.append('sharpen', '1');
      if (brightness && brightness !== 1) params.append('brightness', brightness.toString());
      if (contrast && contrast !== 1) params.append('contrast', contrast.toString());
      if (saturation && saturation !== 1) params.append('saturation', saturation.toString());
      if (background) params.append('bg', background);
      
      return params.toString();
    };

    // Generate main source URL
    const srcParams = buildTransformParams(width, height, format === 'auto' ? undefined : format, quality);
    const src = srcParams ? `${baseUrl}?${srcParams}` : baseUrl;

    // Generate responsive srcSet for different screen sizes
    const generateSrcSet = (fmt?: string, q?: number): string => {
      return RESPONSIVE_SIZES
        .filter(size => !width || size <= width * 2) // Don't generate sizes larger than 2x the desired width
        .map(size => {
          const responsiveHeight = height ? Math.round((height / (width || size)) * size) : undefined;
          const params = buildTransformParams(size, responsiveHeight, fmt, q);
          return `${baseUrl}?${params} ${size}w`;
        })
        .join(', ');
    };

    // Generate srcSet for different formats
    const srcSet = generateSrcSet(format === 'auto' ? undefined : format, quality);
    const webpSrcSet = format === 'auto' || format === 'webp' 
      ? generateSrcSet('webp', DEFAULT_QUALITIES.webp) 
      : undefined;
    const avifSrcSet = format === 'auto' || format === 'avif'
      ? generateSrcSet('avif', DEFAULT_QUALITIES.avif)
      : undefined;

    // Generate placeholder (small, low-quality version)
    const placeholderParams = buildTransformParams(32, 32, 'jpeg', 30);
    const placeholder = `${baseUrl}?${placeholderParams}`;

    // Generate blur data URL (very small, blurred version)
    const blurParams = buildTransformParams(10, 10, 'jpeg', 20);
    const blurDataURL = `${baseUrl}?${blurParams}&blur=8`;

    // Generate sizes attribute for responsive images
    const sizes = width 
      ? `(max-width: ${width}px) 100vw, ${width}px`
      : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

    return {
      src,
      srcSet,
      webpSrcSet,
      avifSrcSet,
      placeholder,
      blurDataURL,
      sizes
    };
  }, [file, options]);
};

/**
 * Hook for generating thumbnail URLs in multiple sizes
 */
export const useThumbnailUrls = (
  file: File | null,
  sizes: number[] = [150, 300, 600]
): Record<string, string> => {
  return useMemo(() => {
    if (!file || file.type !== 'image' || !file.storage.cdnUrl) {
      return {};
    }

    const baseUrl = file.storage.cdnUrl;
    const result: Record<string, string> = {};

    sizes.forEach(size => {
      const params = new URLSearchParams({
        w: size.toString(),
        h: size.toString(),
        q: '85',
        f: 'webp',
        fit: 'cover'
      });
      
      result[`${size}`] = `${baseUrl}?${params.toString()}`;
    });

    // Add original size reference
    result.original = baseUrl;

    return result;
  }, [file, sizes]);
};

/**
 * Hook for generating image URLs optimized for specific use cases
 */
export const useImageVariants = (file: File | null) => {
  return useMemo(() => {
    if (!file || file.type !== 'image' || !file.storage.cdnUrl) {
      return null;
    }

    const baseUrl = file.storage.cdnUrl;

    return {
      // Thumbnail variants
      thumbnail: {
        small: `${baseUrl}?w=150&h=150&q=85&f=webp&fit=cover`,
        medium: `${baseUrl}?w=300&h=300&q=85&f=webp&fit=cover`,
        large: `${baseUrl}?w=600&h=600&q=85&f=webp&fit=cover`
      },
      
      // Preview variants
      preview: {
        mobile: `${baseUrl}?w=480&q=85&f=webp`,
        tablet: `${baseUrl}?w=768&q=85&f=webp`,
        desktop: `${baseUrl}?w=1200&q=90&f=webp`
      },
      
      // Gallery variants
      gallery: {
        thumb: `${baseUrl}?w=200&h=200&q=80&f=webp&fit=cover`,
        medium: `${baseUrl}?w=800&q=90&f=webp`,
        full: `${baseUrl}?w=1600&q=95&f=webp`
      },
      
      // Social sharing variants
      social: {
        facebook: `${baseUrl}?w=1200&h=630&q=90&f=jpeg&fit=cover`,
        twitter: `${baseUrl}?w=1200&h=675&q=90&f=jpeg&fit=cover`,
        instagram: `${baseUrl}?w=1080&h=1080&q=90&f=jpeg&fit=cover`
      },
      
      // Print variants
      print: {
        low: `${baseUrl}?w=1200&q=95&f=jpeg`,
        medium: `${baseUrl}?w=2400&q=95&f=jpeg`,
        high: `${baseUrl}?w=4800&q=98&f=jpeg`
      },
      
      // Placeholder and loading states
      placeholders: {
        blur: `${baseUrl}?w=10&h=10&q=20&f=jpeg&blur=8`,
        lowRes: `${baseUrl}?w=50&q=30&f=jpeg`,
        color: `${baseUrl}?w=1&h=1&q=1&f=jpeg` // For dominant color extraction
      },
      
      // Original
      original: baseUrl
    };
  }, [file]);
};

/**
 * Hook for preloading critical images
 */
export const useImagePreloader = (urls: string[], priority: boolean = false) => {
  useMemo(() => {
    if (!priority) return;
    
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }, [urls, priority]);
};

/**
 * Hook for handling image loading states across multiple images
 */
export const useImageLoadingStates = (_imageUrls: string[]) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, 'loading' | 'loaded' | 'error'>>({});

  const handleImageLoad = useCallback((url: string) => {
    setLoadingStates(prev => ({ ...prev, [url]: 'loaded' }));
  }, []);

  const handleImageError = useCallback((url: string) => {
    setLoadingStates(prev => ({ ...prev, [url]: 'error' }));
  }, []);

  const initializeImageLoading = useCallback((url: string) => {
    setLoadingStates(prev => ({ ...prev, [url]: 'loading' }));
  }, []);

  return {
    loadingStates,
    handleImageLoad,
    handleImageError,
    initializeImageLoading,
    isLoading: (url: string) => loadingStates[url] === 'loading',
    isLoaded: (url: string) => loadingStates[url] === 'loaded',
    hasError: (url: string) => loadingStates[url] === 'error'
  };
};

export default useOptimizedImage;