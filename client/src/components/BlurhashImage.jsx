import { useEffect, useRef, useState } from 'react';
import { decode } from 'blurhash';

export default function BlurhashImage({ src, hash, width, height, alt, className }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hash || !canvasRef.current) return;
    try {
      // Decode at a small fixed resolution — it's just a blurred preview,
      // no need to match the real image's dimensions.
      const pixels = decode(hash, 32, 32);
      const ctx = canvasRef.current.getContext('2d');
      const imageData = ctx.createImageData(32, 32);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Malformed hash — the real image will still load normally, we just
      // won't have a placeholder for the brief moment before it does.
    }
  }, [hash]);

  const aspectRatio = width && height ? width / height : undefined;

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-black/5 dark:bg-white/10 ${className || ''}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {hash && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
      <img
        src={src}
        alt={alt || 'image'}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`relative h-full w-full max-w-full rounded-lg object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
