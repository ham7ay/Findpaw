import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, PawPrint, Heart, Calendar, Tag, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { petApi } from '@/services/api';
import type { Pet } from '@shared/types';

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Pet | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setPets(await petApi.list());
      } catch (err: any) {
        setLoadError(err.message ?? 'Could not load pets');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (draft: Omit<Pet, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = await petApi.update(editing.id, draft);
        setPets((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await petApi.create(draft);
        setPets((ps) => [...ps, created]);
      }
      setEditing(null);
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message ?? 'Could not save pet');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this pet?')) return;
    const prev = pets;
    setPets(pets.filter((p) => p.id !== id));
    try {
      await petApi.remove(id);
    } catch (err: any) {
      setPets(prev); // roll back on failure
      alert(err.message ?? 'Could not delete pet');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold neon-text">My Pets</h1>
          <p className="text-white/60 mt-1">Manage your tracked animals.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setFormError(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Pet
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/50 text-sm py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading pets…
        </div>
      ) : loadError ? (
        <Card variant="holo" className="p-6 text-center text-neon-pink text-sm">{loadError}</Card>
      ) : pets.length === 0 ? (
        <Card variant="holo" className="p-10 text-center">
          <PawPrint className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <div className="text-white/60">No pets yet — add your first one.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet, i) => (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card variant="holo" glow className="p-5 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-white/10 flex items-center justify-center text-3xl">
                      {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                    </div>
                    <div>
                      <div className="font-display text-lg">{pet.name}</div>
                      <div className="text-xs text-white/50">{pet.breed || pet.species}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(pet);
                        setFormError(null);
                        setShowForm(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-neon-cyan transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(pet.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-neon-pink transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-white/70 flex-1">
                  {pet.age !== undefined && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-white/40" />
                      <span>{pet.age} years old</span>
                    </div>
                  )}
                  {(pet.weight !== undefined || pet.color) && (
                    <div className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-white/40" />
                      <span>{pet.weight !== undefined ? `${pet.weight} kg` : ''}{pet.weight !== undefined && pet.color ? ' • ' : ''}{pet.color ?? ''}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-white/40" />
                    <span className="font-mono text-[10px]">{pet.id}</span>
                  </div>
                </div>

                <Link
                  to={`/tracking/${pet.id}`}
                  className="mt-4 block text-center py-2 rounded-lg bg-white/5 hover:bg-neon-cyan/10 border border-white/10 hover:border-neon-cyan/50 text-sm transition-all"
                >
                  <PawPrint className="w-4 h-4 inline mr-1.5" />
                  Track {pet.name}
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <PetFormModal
            pet={editing}
            saving={saving}
            error={formError}
            onSave={handleSave}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
              setFormError(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PetFormModal({
  pet,
  saving,
  error,
  onSave,
  onClose,
}: {
  pet: Pet | null;
  saving: boolean;
  error: string | null;
  onSave: (p: Omit<Pet, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(pet?.name ?? '');
  const [species, setSpecies] = useState<Pet['species']>(pet?.species ?? 'dog');
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [age, setAge] = useState(pet?.age?.toString() ?? '');
  const [weight, setWeight] = useState(pet?.weight?.toString() ?? '');
  const [color, setColor] = useState(pet?.color ?? '');

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      species,
      breed: breed || undefined,
      age: age ? parseInt(age) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      color: color || undefined,
      imageUrl: pet?.imageUrl,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <Card variant="holo" glow className="p-6">
          <div className="font-display text-xl neon-text mb-4">{pet ? 'Edit Pet' : 'Add Pet'}</div>
          {error && <div className="text-xs text-neon-pink mb-3">{error}</div>}
          <div className="space-y-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Luna" />
            <div>
              <label className="block text-xs text-white/60 mb-1.5">Species</label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value as Pet['species'])}
                className="input-field"
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bird">Bird</option>
                <option value="cattle">Cattle</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input label="Breed" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Golden Retriever" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Age (years)" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
              <Input label="Weight (kg)" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Cream" />
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : pet ? 'Save' : 'Add Pet'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}