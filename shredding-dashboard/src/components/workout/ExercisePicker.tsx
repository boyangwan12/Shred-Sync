'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const CATEGORY_COLORS: Record<string, string> = {
  chest: '#E24B4A',
  back: '#378ADD',
  shoulders: '#EF9F27',
  arms: '#1D9E75',
  legs: '#1D9E75',
  core: '#737373',
};

const CATEGORIES = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];

interface Exercise {
  id: number;
  name: string;
  category: string;
  equipment: string | null;
}

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exerciseId: number, exerciseName: string, equipment: string | null) => void;
}

export default function ExercisePicker({ open, onClose, onSelect }: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchExercises = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const url = query
        ? `/api/exercises?search=${encodeURIComponent(query)}`
        : '/api/exercises';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExercises(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setShowCreate(false);
      setNewName('');
      setNewCategory('');
      setNewEquipment('');
      fetchExercises('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, fetchExercises]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchExercises(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, fetchExercises]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  async function handleCreate() {
    if (!newName.trim() || !newCategory) return;
    setCreating(true);
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory,
          equipment: newEquipment || null,
        }),
      });
      if (res.ok) {
        const exercise = await res.json();
        onSelect(exercise.id, exercise.name, exercise.equipment ?? null);
        onClose();
      }
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  const inputClass =
    'w-full bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-[var(--foreground)] focus:border-[var(--teal)] focus:outline-none';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Modal — slides up from bottom on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full">
        <div className="bg-[var(--background)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Add Exercise</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search input */}
          <div className="px-4 pb-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
            {loading && exercises.length === 0 && (
              <div className="text-center py-8 text-[var(--muted)] text-sm">Loading...</div>
            )}

            {!loading && exercises.length === 0 && search && (
              <div className="text-center py-8 text-[var(--muted)] text-sm">
                No exercises found for &ldquo;{search}&rdquo;
              </div>
            )}

            {exercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  onSelect(ex.id, ex.name, ex.equipment);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-left"
                style={{ minHeight: '48px' }}
              >
                <span className="text-[var(--foreground)] text-sm font-medium">
                  {ex.name}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {ex.equipment && (
                    <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide">
                      {ex.equipment}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{
                      color: CATEGORY_COLORS[ex.category] ?? 'var(--muted)',
                      backgroundColor: `${CATEGORY_COLORS[ex.category] ?? 'var(--muted)'}20`,
                    }}
                  >
                    {ex.category}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Create new section */}
          <div className="border-t border-[var(--border)] px-4 py-3">
            {!showCreate ? (
              <button
                type="button"
                onClick={() => {
                  setShowCreate(true);
                  setNewName(search);
                }}
                className="w-full py-3 rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] transition-colors"
                style={{ minHeight: '44px' }}
              >
                + Create New Exercise
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Exercise name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={inputClass}
                  style={{ minHeight: '44px' }}
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors"
                      style={{
                        color:
                          newCategory === cat
                            ? '#fff'
                            : (CATEGORY_COLORS[cat] ?? 'var(--muted)'),
                        backgroundColor:
                          newCategory === cat
                            ? (CATEGORY_COLORS[cat] ?? 'var(--muted)')
                            : `${CATEGORY_COLORS[cat] ?? 'var(--muted)'}20`,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Equipment (optional)"
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  className={inputClass}
                  style={{ minHeight: '44px' }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || !newCategory || creating}
                    className="flex-1 py-2.5 rounded-lg bg-[var(--teal)] text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ minHeight: '44px' }}
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
