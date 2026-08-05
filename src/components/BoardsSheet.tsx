import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Board } from '@/state/boardStore';
import { colors, spacing } from '@/theme';

interface Props {
  boards: Board[];
  activeBoardId: string;
  onSelect: (boardId: string) => void;
  onRename: (boardId: string, name: string) => void;
  onDelete: (boardId: string) => void;
  onCreate: () => void;
  onDismiss: () => void;
}

/** Full-screen overlay for managing saved boards: switch, rename, delete, create. */
export function BoardsSheet({ boards, activeBoardId, onSelect, onRename, onDelete, onCreate, onDismiss }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const startEditing = (board: Board) => {
    setEditingId(board.id);
    setDraftName(board.name);
  };

  const commitEditing = () => {
    if (editingId && draftName.trim()) {
      onRename(editingId, draftName.trim());
    }
    setEditingId(null);
  };

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <View style={styles.sheet}>
        <Text style={styles.title}>내 보드</Text>
        {boards.map((board) => (
          <View key={board.id} style={styles.row}>
            {editingId === board.id ? (
              <TextInput
                style={styles.input}
                value={draftName}
                onChangeText={setDraftName}
                onSubmitEditing={commitEditing}
                onBlur={commitEditing}
                autoFocus
                selectTextOnFocus
              />
            ) : (
              <Pressable style={styles.nameButton} onPress={() => onSelect(board.id)}>
                <Text
                  style={[styles.name, board.id === activeBoardId && styles.nameActive]}
                  numberOfLines={1}
                >
                  {board.id === activeBoardId ? '● ' : ''}
                  {board.name}
                </Text>
                <Text style={styles.count}>{board.tiles.length}개 타일</Text>
              </Pressable>
            )}
            <Pressable style={styles.iconButton} onPress={() => startEditing(board)}>
              <Text style={styles.iconText}>이름변경</Text>
            </Pressable>
            {boards.length > 1 && (
              <Pressable style={styles.iconButton} onPress={() => onDelete(board.id)}>
                <Text style={[styles.iconText, styles.dangerText]}>삭제</Text>
              </Pressable>
            )}
          </View>
        ))}
        <Pressable style={styles.createButton} onPress={onCreate}>
          <Text style={styles.createButtonText}>+ 새 보드</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nameButton: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  name: { color: colors.textDim, fontSize: 15, fontWeight: '700' },
  nameActive: { color: colors.accent },
  count: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: spacing.xs,
  },
  iconButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  dangerText: { color: colors.danger },
  createButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  createButtonText: { color: colors.accentText, fontWeight: '800' },
});
