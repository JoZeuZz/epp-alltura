import React from 'react';

export type UploadStage = 'idle' | 'processing' | 'uploading' | 'finishing';

interface UploadProgressProps {
  stage: UploadStage;
  progress: number;
  className?: string;
}

const getStageLabel = (stage: UploadStage, progress: number) => {
  switch (stage) {
    case 'processing':
      return 'Comprimiendo/Procesando imagen...';
    case 'uploading':
      return `Subiendo imagen... ${progress}%`;
    case 'finishing':
      return 'Finalizando...';
    default:
      return '';
  }
};

const UploadProgress: React.FC<UploadProgressProps> = ({ stage, progress, className }) => {
  if (stage === 'idle') return null;

  return (
    <div className={className}>
      <p className="text-sm text-gray-600">{getStageLabel(stage, progress)}</p>
      {stage === 'uploading' && (
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-primary-blue transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
