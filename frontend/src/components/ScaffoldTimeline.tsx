import React, { useEffect, useState } from 'react';
import { get } from '../services/apiService';

interface TimelineEvent {
  id: number;
  scaffold_id: number;
  user_id: number;
  modified_by_name?: string;
  modified_by_email?: string;
  created_at: string;
  change_type: string;
  previous_data: any;
  new_data: any;
  description: string;
}

interface ScaffoldTimelineProps {
  scaffoldId: number;
}

const ScaffoldTimeline: React.FC<ScaffoldTimelineProps> = ({ scaffoldId }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await get<TimelineEvent[]>(`/scaffolds/${scaffoldId}/history`);
        setEvents(data);
      } catch (err: any) {
        console.error('Error fetching scaffold history:', err);
        setError('Error al cargar el historial');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [scaffoldId]);

  const getEventIcon = (changeType: string) => {
    if (changeType.includes('card_status')) {
      return '🏷️';
    }
    if (changeType.includes('assembly_status')) {
      return '🔧';
    }
    if (changeType.includes('progress')) {
      return '📊';
    }
    if (changeType.includes('dimensions')) {
      return '📏';
    }
    return '📝';
  };

  const getEventColor = (changeType: string) => {
    if (changeType.includes('card_status')) {
      return 'border-blue-400 bg-blue-50';
    }
    if (changeType.includes('assembly_status')) {
      return 'border-green-400 bg-green-50';
    }
    if (changeType.includes('progress')) {
      return 'border-purple-400 bg-purple-50';
    }
    if (changeType.includes('dimensions')) {
      return 'border-orange-400 bg-orange-50';
    }
    return 'border-gray-400 bg-gray-50';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getDetailedDescription = (event: TimelineEvent): string => {
    const { change_type, previous_data, new_data, description } = event;

    // Para cambios de progreso, ser más específico
    if (change_type.includes('progress') && previous_data?.progress_percentage !== undefined && new_data?.progress_percentage !== undefined) {
      return `Porcentaje de avance actualizado de ${previous_data.progress_percentage}% a ${new_data.progress_percentage}%`;
    }

    // Para cambios de tarjeta
    if (change_type.includes('card_status') && previous_data?.card_status && new_data?.card_status) {
      const fromCard = previous_data.card_status === 'green' ? 'Verde' : 'Roja';
      const toCard = new_data.card_status === 'green' ? 'Verde' : 'Roja';
      return `Tarjeta cambiada de ${fromCard} a ${toCard}`;
    }

    // Para cambios de estado de armado
    if (change_type.includes('assembly_status') && previous_data?.assembly_status && new_data?.assembly_status) {
      const fromStatus = previous_data.assembly_status === 'assembled' ? 'Armado' : 'Desarmado';
      const toStatus = new_data.assembly_status === 'assembled' ? 'Armado' : 'Desarmado';
      return `Estado cambiado de ${fromStatus} a ${toStatus}`;
    }

    // Si no hay descripción personalizada, usar la del evento
    return description || 'Actualización del andamio';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg">📋 Sin historial de cambios</p>
        <p className="text-sm mt-2">Este andamio aún no tiene modificaciones registradas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg">
      <h3 className="font-bold text-dark-blue mb-4 text-lg flex items-center gap-2">
        <span className="text-2xl">📅</span>
        Historial de Cambios
      </h3>
      
      <div className="relative">
        {/* Línea vertical */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300"></div>
        
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="relative pl-14">
              {/* Punto en la línea */}
              <div className={`absolute left-3 w-6 h-6 rounded-full border-2 ${getEventColor(event.change_type)} flex items-center justify-center text-sm`}>
                {getEventIcon(event.change_type)}
              </div>
              
              {/* Contenido del evento */}
              <div className={`p-4 rounded-lg border-l-4 ${getEventColor(event.change_type)} shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold text-gray-800">
                    {getDetailedDescription(event)}
                  </p>
                  <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                    {formatDate(event.created_at)}
                  </span>
                </div>
                
                {event.modified_by_name && (
                  <p className="text-sm text-gray-600">
                    Por: <span className="font-medium">{event.modified_by_name}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Evento inicial */}
      <div className="relative pl-14 mt-4">
        <div className="absolute left-3 w-6 h-6 rounded-full border-2 border-gray-400 bg-gray-100 flex items-center justify-center text-sm">
          🎯
        </div>
        <div className="p-4 rounded-lg border-l-4 border-gray-400 bg-gray-50">
          <p className="font-semibold text-gray-700">Andamio creado</p>
          <p className="text-sm text-gray-600 mt-1">Inicio del registro</p>
        </div>
      </div>
    </div>
  );
};

export default ScaffoldTimeline;
