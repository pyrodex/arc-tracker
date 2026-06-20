import { useState } from 'react';
import { UserPlus, Pencil, Trash2, Users, Minus, Plus, AlertTriangle } from 'lucide-react';
import type { Character } from '../types';
import { useCharacters, useCreateCharacter, useUpdateCharacter, useDeleteCharacter } from '../hooks/useApi';
import Modal from '../components/Modal';
import CharacterForm from '../components/CharacterForm';

function LabelBadges({ label, color }: { label: string | null; color: string }) {
  if (!label) return null;
  const labels = label.split(',').map(l => l.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map(l => (
        <span
          key={l}
          className="badge text-xs"
          style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

export default function Characters() {
  const { data: characters = [], isLoading } = useCharacters();
  const createChar = useCreateCharacter();
  const updateChar = useUpdateCharacter();
  const deleteChar = useDeleteCharacter();

  const [showCreate, setShowCreate]   = useState(false);
  const [editTarget, setEditTarget]   = useState<Character | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-arc-text mb-1">Characters</h1>
          <p className="text-arc-muted text-sm">Manage the characters you track blueprints for.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add Character
        </button>
      </div>

      {isLoading && <div className="text-arc-muted text-sm py-8 text-center">Loading characters…</div>}

      {!isLoading && characters.length === 0 && (
        <div className="card p-12 text-center border-dashed">
          <Users className="w-10 h-10 text-arc-dim mx-auto mb-3" />
          <p className="text-arc-text font-medium">No characters yet</p>
          <p className="text-arc-muted text-sm mt-1 mb-4">Add your first character to start tracking blueprints.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
            <UserPlus className="w-4 h-4" /> Create Character
          </button>
        </div>
      )}

      {characters.length > 0 && (
        <div className="space-y-3">
          {characters.map(char => (
            <div key={char.id} className="card p-4 flex items-center gap-4 hover:border-arc-muted/40 transition-colors">
              <div
                className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: char.color + '20', border: `1px solid ${char.color}40`, color: char.color }}
              >
                {char.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-arc-text">{char.name}</span>
                </div>
                <LabelBadges label={char.label} color={char.color} />
                {char.notes && <p className="text-xs text-arc-dim mt-1 truncate">{char.notes}</p>}
                <p className="text-[10px] text-arc-dim mt-0.5">
                  Created {new Date(char.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-medium text-arc-muted uppercase tracking-wide">Nomad Stash</span>
                  <div className="flex items-center gap-1">
                    <button
                      className="btn-ghost p-1 rounded disabled:opacity-40"
                      title="Decrease Nomad Stash"
                      disabled={char.nomad_stash <= 0 || updateChar.isPending}
                      onClick={() => updateChar.mutate({ id: char.id, nomad_stash: Math.max(0, char.nomad_stash - 1) })}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="min-w-[2rem] text-center text-sm font-semibold text-arc-text tabular-nums">
                      {char.nomad_stash}
                    </span>
                    <button
                      className="btn-ghost p-1 rounded"
                      title="Increase Nomad Stash"
                      disabled={updateChar.isPending}
                      onClick={() => updateChar.mutate({ id: char.id, nomad_stash: char.nomad_stash + 1 })}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => setEditTarget(char)} className="btn-ghost p-2" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(char)} className="btn-danger p-2" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Character">
        <CharacterForm
          onSubmit={async (payload) => { await createChar.mutateAsync(payload); setShowCreate(false); }}
          onCancel={() => setShowCreate(false)}
          loading={createChar.isPending}
        />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Character">
        {editTarget && (
          <CharacterForm
            initial={editTarget}
            onSubmit={async (payload) => { await updateChar.mutateAsync({ id: editTarget.id, ...payload }); setEditTarget(null); }}
            onCancel={() => setEditTarget(null)}
            loading={updateChar.isPending}
          />
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Character" width="max-w-sm">
        {deleteTarget && (
          <div>
            <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-arc-danger/10 border border-arc-danger/30">
              <AlertTriangle className="w-5 h-5 text-arc-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-arc-text">
                  Delete <span style={{ color: deleteTarget.color }}>{deleteTarget.name}</span>?
                </p>
                <p className="text-xs text-arc-muted mt-1">
                  All blueprint tracking data for this character will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn bg-arc-danger/80 text-white hover:bg-arc-danger"
                disabled={deleteChar.isPending}
                onClick={async () => { await deleteChar.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}
              >
                {deleteChar.isPending ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
