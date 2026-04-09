import React, { useEffect, useState } from 'react';
import { appendQueryParam, DEFAULT_IMAGE_PLACEHOLDER } from '../utils/image';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  retryCount?: number;
  placeholder?: string;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  retryCount = 1,
  placeholder = DEFAULT_IMAGE_PLACEHOLDER,
  ...props
}) => {
  const [attempt, setAttempt] = useState(0);
  const [currentSrc, setCurrentSrc] = useState<string>(src || placeholder);

  useEffect(() => {
    setAttempt(0);
    setCurrentSrc(src || placeholder);
  }, [src, placeholder]);

  const handleError = () => {
    if (!src) {
      setCurrentSrc(placeholder);
      return;
    }

    if (attempt < retryCount) {
      const nextAttempt = attempt + 1;
      setAttempt(nextAttempt);
      setCurrentSrc(appendQueryParam(src, 'retry', `${Date.now()}-${nextAttempt}`));
      return;
    }

    setCurrentSrc(placeholder);
  };

  return <img src={currentSrc} alt={alt} onError={handleError} {...props} />;
};

export default ImageWithFallback;
