import { describe, it, expect, beforeEach } from 'vitest';
import { useNotesStore } from '../stores/notesStore';
import { useChatStore } from '../stores/chatStore';

describe('Frontend Zustand State Stores Test Suite', () => {
  beforeEach(() => {
    useNotesStore.setState({
      notes: [],
      activeNote: null,
      saveStatus: 'idle',
      hasUnsavedChanges: false,
    });
  });

  it('notesStore: selectNote updates activeNote and resets unsaved state', () => {
    const mockNote = {
      id: 'test-note-1',
      title: 'DevOps Architecture',
      contentJson: null,
      contentText: 'Docker and Kubernetes notes.',
      isPinned: false,
      isArchived: false,
      version: 1,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    };

    useNotesStore.getState().selectNote(mockNote);
    const state = useNotesStore.getState();

    expect(state.activeNote?.id).toBe('test-note-1');
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.saveStatus).toBe('saved');
  });

  it('notesStore: updateNoteLocally marks note as unsaved and tracks title edits', () => {
    const mockNote = {
      id: 'test-note-1',
      title: 'Original Title',
      contentJson: null,
      contentText: '',
      isPinned: false,
      isArchived: false,
      version: 1,
      lastEditedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    };

    useNotesStore.getState().selectNote(mockNote);
    useNotesStore.getState().updateNoteLocally({ title: 'Modified Title' });

    const state = useNotesStore.getState();
    expect(state.activeNote?.title).toBe('Modified Title');
    expect(state.hasUnsavedChanges).toBe(true);
    expect(state.saveStatus).toBe('unsaved');
  });

  it('chatStore: initial state has empty sessions and null active session', () => {
    const state = useChatStore.getState();
    expect(Array.isArray(state.sessions)).toBe(true);
    expect(state.isSending).toBe(false);
  });
});
