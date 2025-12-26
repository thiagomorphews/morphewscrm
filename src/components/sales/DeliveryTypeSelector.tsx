import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Store, Bike, Truck, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useDeliveryRegions,
  useActiveShippingCarriers,
  DeliveryType,
  DELIVERY_TYPES,
  getAvailableDeliveryDates,
  formatShift,
  DeliveryRegion,
  ShippingCarrier,
} from '@/hooks/useDeliveryConfig';
import { formatCurrency } from '@/hooks/useSales';

interface DeliveryTypeSelectorProps {
  leadRegionId: string | null;
  value: {
    type: DeliveryType;
    regionId: string | null;
    scheduledDate: Date | null;
    scheduledShift: 'morning' | 'afternoon' | 'full_day' | null;
    carrierId: string | null;
    shippingCost: number;
  };
  onChange: (value: DeliveryTypeSelectorProps['value']) => void;
}

export function DeliveryTypeSelector({
  leadRegionId,
  value,
  onChange,
}: DeliveryTypeSelectorProps) {
  const { data: regions = [] } = useDeliveryRegions();
  const carriers = useActiveShippingCarriers();

  const activeRegions = regions.filter(r => r.is_active);
  const selectedRegion = activeRegions.find(r => r.id === (value.regionId || leadRegionId));
  const selectedCarrier = carriers.find(c => c.id === value.carrierId);

  // Get available dates for selected region
  const availableDates = selectedRegion
    ? getAvailableDeliveryDates(selectedRegion.id, regions)
    : [];

  // Group available dates by date string for calendar
  const availableDateStrings = availableDates.map(d => format(d.date, 'yyyy-MM-dd'));

  const handleTypeChange = (type: DeliveryType) => {
    onChange({
      ...value,
      type,
      regionId: type === 'motoboy' ? (leadRegionId || value.regionId) : null,
      scheduledDate: null,
      scheduledShift: null,
      carrierId: type === 'carrier' && carriers.length > 0 ? carriers[0].id : null,
      shippingCost: type === 'carrier' && carriers.length > 0 ? carriers[0].cost_cents : 0,
    });
  };

  const handleRegionChange = (regionId: string) => {
    onChange({
      ...value,
      regionId,
      scheduledDate: null,
      scheduledShift: null,
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange({ ...value, scheduledDate: null, scheduledShift: null });
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const matchingDate = availableDates.find(
      d => format(d.date, 'yyyy-MM-dd') === dateStr
    );

    if (matchingDate) {
      onChange({
        ...value,
        scheduledDate: date,
        scheduledShift: matchingDate.shift,
      });
    }
  };

  const handleCarrierChange = (carrierId: string) => {
    const carrier = carriers.find(c => c.id === carrierId);
    onChange({
      ...value,
      carrierId,
      shippingCost: carrier?.cost_cents || 0,
    });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <Label className="text-base font-semibold mb-4 block">Tipo de Entrega</Label>
          <RadioGroup
            value={value.type}
            onValueChange={(v) => handleTypeChange(v as DeliveryType)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <Label
              htmlFor="delivery-pickup"
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                value.type === 'pickup' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="pickup" id="delivery-pickup" />
              <Store className="w-5 h-5" />
              <span>{DELIVERY_TYPES.pickup}</span>
            </Label>

            <Label
              htmlFor="delivery-motoboy"
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                value.type === 'motoboy' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="motoboy" id="delivery-motoboy" />
              <Bike className="w-5 h-5" />
              <span>{DELIVERY_TYPES.motoboy}</span>
            </Label>

            <Label
              htmlFor="delivery-carrier"
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                value.type === 'carrier' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="carrier" id="delivery-carrier" />
              <Truck className="w-5 h-5" />
              <span>{DELIVERY_TYPES.carrier}</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Motoboy Options */}
        {value.type === 'motoboy' && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label>Região de Entrega</Label>
              {activeRegions.length === 0 ? (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                      Nenhuma região cadastrada
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      Configure regiões de entrega nas Configurações.
                    </p>
                  </div>
                </div>
              ) : (
                <Select
                  value={value.regionId || leadRegionId || ''}
                  onValueChange={handleRegionChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a região" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRegions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {(value.regionId || leadRegionId) && selectedRegion && (
              <div>
                <Label className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Data de Entrega
                </Label>
                
                {availableDates.length === 0 ? (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                        Nenhum dia configurado
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-500">
                        Esta região não tem dias de entrega configurados.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Calendar
                      mode="single"
                      selected={value.scheduledDate || undefined}
                      onSelect={handleDateSelect}
                      locale={ptBR}
                      disabled={(date) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        return !availableDateStrings.includes(dateStr);
                      }}
                      className="rounded-md border"
                    />

                    {value.scheduledDate && value.scheduledShift && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Data:</span>{' '}
                          {format(value.scheduledDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Turno:</span>{' '}
                          <Badge variant="outline">{formatShift(value.scheduledShift)}</Badge>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Carrier Options */}
        {value.type === 'carrier' && (
          <div className="space-y-4 border-t pt-4">
            {carriers.length === 0 ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                    Nenhuma transportadora cadastrada
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    Configure transportadoras nas Configurações.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label>Transportadora</Label>
                  <Select value={value.carrierId || ''} onValueChange={handleCarrierChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione a transportadora" />
                    </SelectTrigger>
                    <SelectContent>
                      {carriers.map((carrier) => (
                        <SelectItem key={carrier.id} value={carrier.id}>
                          {carrier.name} - {formatCurrency(carrier.cost_cents)} ({carrier.estimated_days} dia{carrier.estimated_days !== 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCarrier && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Custo:</span>{' '}
                        <span className="font-medium">{formatCurrency(selectedCarrier.cost_cents)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prazo:</span>{' '}
                        <span className="font-medium">
                          {selectedCarrier.estimated_days} dia{selectedCarrier.estimated_days !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
