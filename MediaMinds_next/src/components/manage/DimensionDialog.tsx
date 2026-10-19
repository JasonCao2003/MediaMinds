'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import FormFields, { type FormField } from '@/components/manage/FormFields';
import EmptyState from '@/components/common/EmptyState';

export interface DimensionItem {
  id: string | number;
  label: string;
  caption?: string;
  /** 原始记录，选中时用来回填表单 */
  raw: Record<string, unknown>;
}

/**
 * 辅助维度的管理弹窗：左边列表、右边表单。
 *
 * <p>图书类型 / 影片分类 / 标签 / 歌手 / 歌单 这 5 个维度的字段都很简单，
 * 共用这一个弹窗——各页面只需给出字段 schema、列表数据与保存回调。
 *
 * <p>**维度只支持新建与编辑，不提供删除**：这些维度被内容记录引用，
 * 删掉会让引用方变成「未分类 / 未知歌手」这类悬空状态。要删除只删内容本体。
 */
export default function DimensionDialog({
  open,
  title,
  fields,
  items,
  loading = false,
  saving = false,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  fields: FormField[];
  items: DimensionItem[];
  loading?: boolean;
  saving?: boolean;
  onClose: () => void;
  /** 保存（新建或编辑）。返回是否成功——成功后弹窗会清空表单 */
  onSave: (
    values: Record<string, unknown>,
    editingId: string | number | null,
    files: Record<string, File>,
  ) => Promise<boolean>;
}) {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const resetForm = () => {
    setEditingId(null);
    setValues({});
    setFiles({});
    setPreviews((prev) => {
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
      return {};
    });
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const pick = (item: DimensionItem) => {
    setEditingId(item.id);
    setValues({ ...item.raw });
    setFiles({});
  };

  const submit = async () => {
    const ok = await onSave(values, editingId, files);
    if (ok) resetForm();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pt: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {title}
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<AddRoundedIcon />} onClick={resetForm}>
          新建
        </Button>
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
            gap: 3,
            pt: 1,
          }}
        >
          {/* 左：已有条目 */}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em', color: 'var(--mm-text-2)' }}>
              已有 {items.length} 项
            </Typography>

            <Box sx={{ mt: 1, maxHeight: 380, overflowY: 'auto', pr: 0.5 }}>
              {loading ? (
                <Stack alignItems="center" sx={{ py: 4 }}>
                  <CircularProgress size={22} />
                </Stack>
              ) : items.length === 0 ? (
                <EmptyState title="还没有数据" description="在右侧填写并保存即可新建" minHeight={160} />
              ) : (
                <Stack spacing={1}>
                  {items.map((item) => {
                    const active = editingId !== null && String(editingId) === String(item.id);
                    return (
                      <Box
                        key={String(item.id)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.5,
                          py: 1,
                          cursor: 'pointer',
                          bgcolor: active ? 'var(--mm-text)' : 'var(--mm-bg)',
                          color: active ? 'var(--mm-bg)' : 'var(--mm-text)',
                          boxShadow: active ? 'none' : 'var(--mm-raised-sm)',
                          '&:hover': { bgcolor: active ? 'var(--mm-text)' : 'var(--mm-sunken)' },
                        }}
                        onClick={() => pick(item)}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                            {item.label}
                          </Typography>
                          {item.caption && (
                            <Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.75 }}>
                              {item.caption}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Box>

          {/* 右：表单 */}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.06em', color: 'var(--mm-text-2)' }}>
              {editingId === null ? '新建' : '编辑'}
            </Typography>
            <Box sx={{ mt: 1.5 }}>
              <FormFields
                fields={fields}
                values={values}
                files={files}
                previews={previews}
                onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
                onFileChange={(name, file) => {
                  if (!file) return;
                  setFiles((prev) => ({ ...prev, [name]: file }));
                  const field = fields.find((f) => f.name === name);
                  if (field?.type === 'image') {
                    setPreviews((prev) => {
                      if (prev[name]) URL.revokeObjectURL(prev[name]);
                      return { ...prev, [name]: URL.createObjectURL(file) };
                    });
                  }
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
        <Button variant="outlined" onClick={onClose}>
          关闭
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? '保存中…' : editingId === null ? '新建' : '保存修改'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
