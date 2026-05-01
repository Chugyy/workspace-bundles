'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Note } from '@/services/note/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (noteId: number) => void;
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return (
    <div className="bg-card border rounded-lg p-3 flex flex-col gap-2 w-full overflow-hidden max-h-[220px]">
      <div className="flex items-start justify-between gap-2 flex-shrink-0">
        <p className="text-sm font-semibold leading-tight line-clamp-2 break-words min-w-0">
          {note.title}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 -mt-0.5">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(note)}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(note.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {note.content && (
        <div className="overflow-y-auto flex-1 min-h-0">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">
            {note.content}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground flex-shrink-0">
        {format(new Date(note.createdAt), 'PPP à HH:mm', { locale: fr })}
      </p>
    </div>
  );
}
