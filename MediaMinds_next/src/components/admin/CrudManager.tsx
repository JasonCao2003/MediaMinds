'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type Column } from '@/components/common/DataTable';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { toast } from '@/lib/notify';

export interface CrudField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select';
  options?: Array<{ label: string; value: string | number }>;
  required?: boolean;
  defaultValue?: unknown;
  helperText?: string;
}

export interface SearchField {
  name: string;
  label: string;
  type?: 'text' | 'select';
  options?: Array<{ label: string; value: string | number }>;
}

export interface CrudManagerProps<T> {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  columns: Array<Column<T>>;
  /** 若提供 fields 则显示新增 / 编辑按钮 */
  fields?: CrudField[];
  searchFields?: SearchField[];
  fetchList: (params: Record<string, unknown>) => Promise<{ rows: T[]; total: number }>;
  rowKey: (row: T) => string | number;
  onCreate?: (values: Record<string, unknown>) => Promise<unknown>;
  onUpdate?: (values: Record<string, unknown>, row: T) => Promise<unknown>;
  onDelete?: (row: T) => Promise<unknown>;
  /** 额外的行内操作 */
  extraRowActions?: (row: T) => ReactNode;
  defaultQuery?: Record<string, string>;
  defaultPageSize?: number;
  emptyText?: string;
  toolbar?: ReactNode;
}

export default function CrudManager<T extends Record<string, unknown>>({
  title,
  subtitle,
  icon,
  columns,
  fields,
  searchFields = [],
  fetchList,
  rowKey,
  onCreate,
  onUpdate,
  onDelete,
  extraRowActions,
  defaultQuery = {},
  defaultPageSize = 10,
  emptyText,
  toolbar,
}: CrudManagerProps<T>) {
  const confirm = useConfirm();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<Record<string, string>>(defaultQuery);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const activeQuery = Object.fromEntries(
        Object.entries(query).filter(([, v]) => v !== '' && v !== undefined && v !== null),
      );
      const res = await fetchList({ ...activeQuery, page, size: pageSize });
      setRows(res.rows);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [fetchList, query, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    const initial: Record<string, unknown> = {};
    fields?.forEach((f) => {
      initial[f.name] = f.defaultValue ?? (f.type === 'number' ? undefined : '');
    });
    setValues(initial);
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: T) => {
    const initial: Record<string, unknown> = { ...row };
    fields?.forEach((f) => {
      if (initial[f.name] === undefined) initial[f.name] = f.defaultValue ?? '';
    });
    setValues(initial);
    setEditing(row);
    setDialogOpen(true);
  };

  const submit = async () => {
    const missing = fields?.find(
      (f) => f.required && (values[f.name] === undefined || values[f.name] === '' || values[f.name] === null),
    );
    if (missing) {
      toast.warning(`请填写「${missing.label}」`);
      return;
    }
    try {
      if (editing && onUpdate) {
        await onUpdate(values, editing);
        toast.success('修改成功');
      } else if (onCreate) {
        await onCreate(values);
        toast.success('新增成功');
      }
      setDialogOpen(false);
      load();
    } catch {
      /* 拦截器已提示 */
    }
  };

  const handleDelete = async (row: T) => {
    const ok = await confirm({
      title: '确认删除',
      description: '此操作不可恢复，确定要删除该记录吗？',
      danger: true,
      confirmText: '删除',
    });
    if (!ok || !onDelete) return;
    try {
      await onDelete(row);
      toast.success('删除成功');
      load();
    } catch {
      /* ignore */
    }
  };

  const finalColumns = useMemo<Array<Column<T>>>(() => {
    if (!onUpdate && !onDelete && !extraRowActions) return columns;
    return [
      ...columns,
      {
        key: '__actions',
        label: '操作',
        width: 200,
        render: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {extraRowActions?.(row)}
            {onUpdate && (
              <Button size="small" startIcon={<EditRoundedIcon fontSize="small" />} onClick={() => openEdit(row)}>
                编辑
              </Button>
            )}
            {onDelete && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
                onClick={() => handleDelete(row)}
              >
                删除
              </Button>
            )}
          </Stack>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, onUpdate, onDelete, extraRowActions]);

  return (
    <Box>
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        actions={
          <>
            {toolbar}
            {fields && (
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
                新增
              </Button>
            )}
          </>
        }
      />

      {searchFields.length > 0 && (
        <Card sx={{ p: 2.5, mb: 3, borderRadius: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            {searchFields.map((f) => (
              <FormControl key={f.name} size="small" sx={{ minWidth: 180 }}>
                {f.type === 'select' ? (
                  <>
                    <InputLabel>{f.label}</InputLabel>
                    <Select
                      label={f.label}
                      value={query[f.name] ?? ''}
                      onChange={(e) => setQuery((q) => ({ ...q, [f.name]: e.target.value }))}
                    >
                      <MenuItem value="">全部</MenuItem>
                      {f.options?.map((o) => (
                        <MenuItem key={String(o.value)} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                ) : (
                  <TextField
                    label={f.label}
                    value={query[f.name] ?? ''}
                    onChange={(e) => setQuery((q) => ({ ...q, [f.name]: e.target.value }))}
                  />
                )}
              </FormControl>
            ))}
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<SearchRoundedIcon />}
                onClick={() => {
                  setPage(1);
                  load();
                }}
                disabled={loading}
              >
                查询
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => {
                  setQuery(defaultQuery);
                  setPage(1);
                }}
              >
                重置
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}

      <DataTable
        columns={finalColumns}
        rows={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        rowKey={rowKey}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        emptyText={emptyText}
      />

      {fields && (
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{editing ? '编辑' : '新增'}{title}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.25} sx={{ mt: 1 }}>
              {fields.map((f) => {
                if (f.type === 'select') {
                  return (
                    <FormControl key={f.name} fullWidth>
                      <InputLabel>{f.label}</InputLabel>
                      <Select
                        label={f.label}
                        value={values[f.name] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      >
                        {f.options?.map((o) => (
                          <MenuItem key={String(o.value)} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  );
                }
                return (
                  <TextField
                    key={f.name}
                    label={f.label}
                    type={f.type === 'number' ? 'number' : 'text'}
                    multiline={f.type === 'textarea'}
                    minRows={f.type === 'textarea' ? 4 : undefined}
                    fullWidth
                    required={f.required}
                    helperText={f.helperText}
                    value={values[f.name] ?? ''}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                      }))
                    }
                  />
                );
              })}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button variant="contained" onClick={submit}>
              确定
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
