import { useState, useCallback } from 'react';

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const useUndoableState = <T>(initialState: T) => {
  const [history, setHistory] = useState<History<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    setHistory(currentHistory => {
      const { past, present, future } = currentHistory;
      const newPast = past.slice(0, past.length - 1);
      const previous = past[past.length - 1];
      const newFuture = [present, ...future];
      
      return {
        past: newPast,
        present: previous,
        future: newFuture,
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    setHistory(currentHistory => {
      const { past, present, future } = currentHistory;
      const next = future[0];
      const newFuture = future.slice(1);
      const newPast = [...past, present];

      return {
        past: newPast,
        present: next,
        future: newFuture,
      };
    });
  }, [canRedo]);

  const setState = useCallback((newState: T) => {
    setHistory(currentHistory => {
      const { present } = currentHistory;

      if (JSON.stringify(newState) === JSON.stringify(present)) {
        return currentHistory;
      }

      const newPast = [...currentHistory.past, present];
      
      return {
        past: newPast,
        present: newState,
        future: [],
      };
    });
  }, []);

  const resetState = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  return {
    state: history.present,
    setState,
    resetState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};