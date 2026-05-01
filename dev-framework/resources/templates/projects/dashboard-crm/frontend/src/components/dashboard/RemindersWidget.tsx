'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Phone, Mail, Users, CalendarCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpcomingEvents, useUpdateEvent } from '@/services/event';
import type { EventType } from '@/services/event';

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: typeof Phone; color: string }> = {
  call: { label: 'Appel', icon: Phone, color: 'text-blue-500' },
  email: { label: 'Email', icon: Mail, color: 'text-purple-500' },
  meeting: { label: 'Réunion', icon: Users, color: 'text-green-500' },
  followup: { label: 'Relance', icon: CalendarCheck, color: 'text-orange-500' },
  other: { label: 'Autre', icon: Clock, color: 'text-muted-foreground' },
};

export function RemindersWidget() {
  const { data, isLoading } = useUpcomingEvents(10);
  const updateEvent = useUpdateEvent();

  const markDone = (id: number) => {
    updateEvent.mutate({ id, data: { isCompleted: true } });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Relances à venir</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const events = data?.events ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Relances à venir</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Aucune relance planifiée</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const config = EVENT_TYPE_CONFIG[event.eventType as EventType] ?? EVENT_TYPE_CONFIG.other;
              const Icon = config.icon;
              const date = new Date(event.eventDate);
              const isToday = new Date().toDateString() === date.toDateString();

              return (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
                  <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {isToday ? "Aujourd'hui" : formatDistanceToNow(date, { addSuffix: true, locale: fr })}
                      {' · '}{format(date, 'dd MMM HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{config.label}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => markDone(event.id)}
                    title="Marquer comme fait"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
