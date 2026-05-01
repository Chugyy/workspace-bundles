'use client';

import { useEffect, useRef, useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Génère les créneaux 00:00 → 23:30 par pas de 30min
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

interface DateTimePickerProps {
  value?: string;           // ISO string ou ''
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Choisir une date',
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Dériver date + time depuis la valeur ISO
  const parsed = value ? new Date(value) : null;
  const selectedDate = parsed && isValid(parsed) ? parsed : undefined;
  const selectedTime = selectedDate
    ? `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`
    : '';

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll vers l'heure sélectionnée (ou heure courante) à l'ouverture
  useEffect(() => {
    if (!open) return;
    const target = selectedTime || `${String(new Date().getHours()).padStart(2, '0')}:00`;
    const idx = TIME_SLOTS.findIndex((s) => s >= target);
    if (scrollRef.current && idx >= 0) {
      const item = scrollRef.current.querySelectorAll('button')[idx];
      item?.scrollIntoView({ block: 'center' });
    }
  }, [open]);

  const buildISO = (date: Date, time: string) => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const time = selectedTime || '09:00';
    onChange(buildISO(date, time));
  };

  const handleTimeSlot = (slot: string) => {
    const base = selectedDate ?? new Date();
    onChange(buildISO(base, slot));
  };

  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    if (!time) return;
    const base = selectedDate ?? new Date();
    onChange(buildISO(base, time));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex w-full">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'flex-1 justify-start font-normal gap-2',
              selectedDate ? 'rounded-r-none border-r-0' : '',
              !selectedDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {selectedDate
                ? format(selectedDate, "dd/MM 'à' HH:mm", { locale: fr })
                : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        {selectedDate && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="rounded-l-none px-2"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <PopoverContent className="w-auto p-0 overflow-hidden" align="start" side="top">
        <div className="flex">
          {/* Calendrier */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={fr}
            className="p-2 border-r shrink-0"
          />

          {/* Créneaux + input précis */}
          <div className="flex flex-col w-32 border-l">
            <p className="text-xs font-medium text-muted-foreground px-3 pt-2 pb-1.5 border-b shrink-0">
              {selectedDate ? format(selectedDate, 'EEEE d', { locale: fr }) : 'Heure'}
            </p>

            <div className="h-[232px] overflow-y-auto py-1 px-2 space-y-0.5" ref={scrollRef} onWheel={(e) => e.stopPropagation()}>
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleTimeSlot(slot)}
                  className={cn(
                    'w-full text-left px-2 py-1 text-sm rounded transition-colors',
                    selectedTime === slot
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>

            {/* Refinement précis */}
            <div className="border-t px-2 py-2 shrink-0">
              <input
                type="time"
                value={selectedTime}
                onChange={handleTimeInput}
                className="w-full text-sm rounded border border-input bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
