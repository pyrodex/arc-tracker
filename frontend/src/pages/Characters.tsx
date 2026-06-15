import { useState } from 'react';
import { UserPlus, Pencil, Trash2, Users } from 'lucide-react';
import type { Character } from '../types';
import { useCharacters, useCreateCharacter, useUpdateCharacter, useDeleteCharacter } from '../hooks/useApi';
import Modal from '../components/Modal';
import CharacterForm from '../components/CharacterForm';

export default function Characters() {
  const { data: characters = [], isLoading } = useCharacters();
  const createChar = useCreateCharacter();
  const updateChar = useUpdateCharacter();
  const deleteChar = useDeleteCharacter();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Character | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Characters</h1>
          <p className="text-slate-400 text-sm">Manage the characters you track blueprints for.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add Character
        </button>
      </div>

      {isLoading && (
        <div className="text-slate-400 text-sm py-8 text-center">Loading characters…</div>
      )}

      {!isLoading && characters.length === 0 && (
        <div className="card p-12 text-center border-dashed">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">No characters yet</p>
          <p className="text-slate-500 text-sm mt-1 mb-4">Add your first character to start tracking blueprints.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
            <UserPlus className="w-4 h-4" /> Create Character
          </button>
        </div>
      )}

      {characters.length > 0 && (
        <div className="space-y-3">
          {characters.map(char => (
            <CharacterRow
              key={char.id}
              character={char}
              onEdit={() => setEditTarget(char)}
              onDelete={() => setDeleteTarget(char)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Character">
        <CharacterForm
          onSubmit={async (payload) => {
            await createChar.mutateAsync(payload);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
          loading={createChar.isPending}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Character">
        {editTarget && (
          <CharacterForm
            initial={editTarget}
            onSubmit={async (payload) => {
              await updateChar.mutateAsync({ id: editTarget.id, ...payload });
              setEditTarget(null);
            }}
            onCancel={() => setEditTarget(null)}
            loading={updateChar.isPending}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Character" width="max-w-sm">
        {deleteTarget && (
          <div>
            <p className="text-slate-300 text-sm mb-1">
              Are you sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>?
            </p>
            <p className="text-slate-500 text-xs mb-5">
              All blueprint tracking data for this character will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn bg-arc-danger/80 text-white hover:bg-arc-danger"
                disabled={deleteChar.isPending}
                onClick={async () => {
                  await deleteChar.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                {deleteChar.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CharacterRow({
  character, onEdit, onDelete,
}: { character: Character; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      {/* Color indicator */}
      <div
        className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg font-bold"
        style={{ backgroundColor: character.color + '20', border: `1px solid ${character.color}40`, color: character.color }}
      >
        {character.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white">{character.name}</span>
          {character.label && (
            <span
              className="badge text-xs"
              style={{ backgroundColor: character.color + '20', color: character.color, borderColor: character.color + '40', border: '1px solid' }}
            >
              {character.label}
            </span>
          )}
        </div>
        {character.notes && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{character.notes}</p>
        )}
        <p className="text-[10px] text-slate-600 mt-0.5">
          Created {new Date(character.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="btn-ghost p-2" title="Edit">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="btn-danger p-2" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
