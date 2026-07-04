import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { PlusCircle, MinusCircle } from 'lucide-react';

export const Route = createFileRoute('/demo/dynamic-list')({
  component: DynamicListDemo,
});

interface ListItem {
  id: number;
  value: string;
}

function DynamicListDemo() {
  const id = useRef(0);
  const [items, setItems] = useState<ListItem[]>([
    { id: id.current++, value: '1' },
    { id: id.current++, value: '2' },
    { id: id.current++, value: '3' },
  ]);

  const handleAddItem = (index: number) => {
    const newItems = [...items];
    const newItem: ListItem = {
      id: id.current++,
      value: '',
    };
    newItems.splice(index + 1, 0, newItem);
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return; // Keep at least one item
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const newItems = [...items];
    newItems[index].value = newValue;
    setItems(newItems);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8">
      <div className="page-wrap max-w-xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--sea-ink)] mb-2">Dynamic List Demo</h1>
          <p className="text-[var(--sea-ink-soft)]">
            A dynamic list where you can add, remove, and edit items easily.
          </p>
        </header>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3">
              <input
                type="text"
                value={item.value}
                onChange={(e) => handleValueChange(index, e.target.value)}
                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--background)] px-4 py-2 text-[var(--sea-ink)] shadow-sm focus:border-[var(--sea-ink)] focus:outline-none transition-all"
                placeholder="Enter text..."
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="p-1 text-[var(--sea-ink-soft)] hover:text-red-500 transition-colors"
                  title="Remove item"
                  disabled={items.length <= 1}
                >
                  <MinusCircle size={24} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => handleAddItem(index)}
                  className="p-1 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition-colors"
                  title="Add item below"
                >
                  <PlusCircle size={24} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-[var(--sea-ink-soft)]">
            No items in the list. Click a plus button to add one!
          </div>
        )}
      </div>
    </div>
  );
}
