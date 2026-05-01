## Drag and Drop et Interactions

### Bibliothèque : @dnd-kit

Le projet utilise `@dnd-kit`, une bibliothèque moderne de drag and drop compatible React 19.

### Installation

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Architecture du drag and drop

#### Structure d'un composant Kanban

**src/components/dashboard/KanbanView.tsx** :

```tsx
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';

// 1. Composant draggable (carte)
function DraggableCard({ content, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: content.id.toString(),
    data: content,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ContentCard content={content} onClick={onClick} />
    </div>
  );
}

// 2. Zone droppable (colonne)
function DroppableColumn({ groupKey, items, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: groupKey,
  });

  return (
    <div ref={setNodeRef} className={isOver ? 'ring-2 ring-primary' : ''}>
      {items.map((item) => (
        <DraggableCard key={item.id} content={item} onClick={onCardClick} />
      ))}
    </div>
  );
}

// 3. Contexte global
export function KanbanView({ data, onCardClick }) {
  const [activeId, setActiveId] = useState(null);
  const updateContent = useUpdateContent();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,  // 8px avant d'activer le drag
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const contentId = parseInt(active.id);
    const targetGroup = STATUS_GROUPS.find((g) => g.key === over.id);

    updateContent.mutate({
      contentId,
      data: { status: targetGroup.defaultStatus },
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragEnd={handleDragEnd}
    >
      {/* Colonnes droppables */}
      <DragOverlay>
        {activeId ? <ContentCard content={activeContent} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Concepts clés

#### 1. Sensors (détection du drag)

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // Évite les drags accidentels
    },
  })
);
```

**Sensors disponibles** :
- `PointerSensor` : Mouse + Touch
- `MouseSensor` : Mouse uniquement
- `TouchSensor` : Touch uniquement
- `KeyboardSensor` : Accessibilité clavier

#### 2. Collision Detection

```tsx
<DndContext collisionDetection={closestCenter}>
```

**Algorithmes** :
- `closestCenter` : Zone la plus proche du centre
- `closestCorners` : Coins les plus proches
- `rectIntersection` : Intersection rectangulaire
- `pointerWithin` : Pointeur dans la zone

#### 3. DragOverlay

Affiche une prévisualisation pendant le drag :

```tsx
<DragOverlay>
  {activeId ? (
    <div className="opacity-90 rotate-3 scale-105">
      <ContentCard content={activeContent} />
    </div>
  ) : null}
</DragOverlay>
```

### Pattern : Kanban avec API update

```tsx
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) return;

  const contentId = parseInt(active.id as string);
  const targetStatus = getStatusFromGroup(over.id);

  // Optimistic update avec React Query
  updateContent.mutate(
    { contentId, data: { status: targetStatus } },
    {
      onSuccess: () => {
        toast.success('Content moved');
      },
      onError: () => {
        toast.error('Failed to update');
      },
    }
  );
};
```

### Feedback visuel

#### Hover state sur la zone droppable

```tsx
const { isOver } = useDroppable({ id: groupKey });

<div className={isOver ? 'ring-2 ring-primary' : ''}>
```

#### État dragging sur l'élément

```tsx
const { isDragging } = useDraggable({ id: content.id });

const style = {
  opacity: isDragging ? 0.5 : 1,
};
```

#### Animation avec transform

```tsx
const style = transform
  ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      transition: 'transform 200ms ease',
    }
  : undefined;
```

### Accessibilité

#### Support clavier

```tsx
import { KeyboardSensor } from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor)  // Drag au clavier
);
```

#### Annonces screen reader

```tsx
<DndContext
  accessibility={{
    announcements: {
      onDragStart(id) {
        return `Picked up draggable item ${id}`;
      },
      onDragOver(id, overId) {
        return `Draggable item ${id} was moved over droppable area ${overId}`;
      },
      onDragEnd(id, overId) {
        return `Draggable item ${id} was dropped over droppable area ${overId}`;
      },
    },
  }}
>
```

### Performance

#### Virtualisation pour grandes listes

```tsx
// Combiner avec @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
});
```

#### Debounce des updates API

```tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedUpdate = useDebouncedCallback(
  (contentId, status) => {
    updateContent.mutate({ contentId, data: { status } });
  },
  500  // Attendre 500ms après le drop
);
```

### Erreurs courantes

#### ❌ Oublier le setNodeRef

```tsx
// ❌ Le drag ne fonctionne pas
function DraggableCard() {
  const { attributes, listeners } = useDraggable({ id: '1' });
  return <div {...listeners} {...attributes}>Card</div>;
}

// ✅ Avec setNodeRef
function DraggableCard() {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: '1' });
  return <div ref={setNodeRef} {...listeners} {...attributes}>Card</div>;
}
```

#### ❌ ID non unique

```tsx
// ❌ Plusieurs items avec le même ID
<DraggableCard id="1" />
<DraggableCard id="1" />

// ✅ IDs uniques
<DraggableCard id={content.id.toString()} />
```

#### ❌ Conflit avec onClick

```tsx
// ❌ onClick ne fonctionne pas pendant le drag
<div {...listeners} onClick={handleClick}>

// ✅ Séparer les zones
<div {...listeners}>
  <div onClick={handleClick}>Click zone</div>
</div>
```

### Alternatives à @dnd-kit

- **react-beautiful-dnd** : Plus ancien, pas React 19 compatible
- **react-dnd** : Plus complexe, API bas niveau
- **@hello-pangea/dnd** : Fork de react-beautiful-dnd

**@dnd-kit est recommandé pour** :
- ✅ React 19 support
- ✅ TypeScript natif
- ✅ Performance optimale
- ✅ Accessibilité intégrée
- ✅ Modulaire et flexible

### Testing

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('drag and drop updates status', async () => {
  const { container } = render(<KanbanView data={mockData} />);

  const card = screen.getByText('Content 1');
  const targetColumn = screen.getByText('Scheduled');

  await userEvent.drag(card, targetColumn);

  expect(mockUpdateContent).toHaveBeenCalledWith({
    contentId: 1,
    data: { status: 'scheduled' },
  });
});
```

### Ressources

- [dnd-kit Documentation](https://docs.dndkit.com/)
- [dnd-kit Examples](https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/)
- [Accessibility Guide](https://docs.dndkit.com/api-documentation/accessibility)

***
