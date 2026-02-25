interface AssetThumbProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: 'eager' | 'lazy';
}

export function AssetThumb({
  src,
  alt,
  className = '',
  imgClassName = '',
  loading = 'lazy',
}: AssetThumbProps) {
  return (
    <div className={`aspect-square overflow-hidden ${className}`.trim()}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`w-full h-full object-cover ${imgClassName}`.trim()}
      />
    </div>
  );
}
