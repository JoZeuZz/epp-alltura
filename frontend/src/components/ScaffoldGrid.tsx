import { Scaffold } from '../types/api';

interface Props {
  scaffolds: Scaffold[];
  onScaffoldSelect: (scaffold: Scaffold) => void;
}

export default function ScaffoldGrid({ scaffolds, onScaffoldSelect }: Props) {
  // Helper function to normalize image URL
  const getImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `http://localhost:5000${url}`;
  };

  // Handle image error by showing a placeholder
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ESin imagen%3C/text%3E%3C/svg%3E';
  };

  if (scaffolds.length === 0) {
    return <p className="text-center text-gray-500">No se encontraron andamios.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {scaffolds.map((scaffold) => (
        <button
          type="button"
          key={scaffold.id}
          onClick={() => onScaffoldSelect(scaffold)}
          aria-label={`Ver detalles del andamio ${scaffold.scaffold_number || scaffold.id} de ${scaffold.cubic_meters} metros cúbicos en estado ${
            scaffold.assembly_status === 'assembled' ? 'armado' : 
            scaffold.assembly_status === 'in_progress' ? 'en proceso' : 
            'desarmado'
          }`}
          className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-transform duration-300 w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2"
        >
          <img
            src={getImageUrl(scaffold.assembly_image_url)}
            alt={`Andamio ${scaffold.id}`}
            className="h-48 w-full object-cover"
            onError={handleImageError}
          />
          <div className="p-4">
            <p className="text-lg font-bold text-dark-blue">{scaffold.cubic_meters} m³</p>
            <p className="text-sm text-gray-600">
              {scaffold.height}x{scaffold.width}x{scaffold.length} m
            </p>
            <p className="text-sm text-gray-500">
              {new Date(scaffold.assembly_created_at).toLocaleDateString()}
            </p>
            <span
              className={`mt-2 inline-block capitalize px-2 py-1 text-xs font-semibold rounded-full ${
                scaffold.assembly_status === 'assembled'
                  ? 'bg-green-100 text-green-800'
                  : scaffold.assembly_status === 'in_progress'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {scaffold.assembly_status === 'assembled' ? 'Armado 100%' : 
               scaffold.assembly_status === 'in_progress' ? `En Proceso ${scaffold.progress_percentage}%` : 
               'Desarmado 0%'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
