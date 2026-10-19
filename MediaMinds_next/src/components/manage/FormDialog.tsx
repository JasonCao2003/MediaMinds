'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import FormFields, { type FormField } from '@/components/manage/FormFields';
import { toast } from '@/lib/notify';

export type { FormField, FormFieldType } from '@/components/manage/FormFields';

export interface FormDialogProps {
  open: boolean;
  title: string;
  fields: FormField[];
  /** 编辑时的初始值；新建时不传 */
  initial?: Record<string, unknown>;
  /** 表单上方的附加区（上传信息、解析提示、额外操作等） */
  header?: ReactNode;
  /**
   * 外部合并进表单的补丁（如「检索在线元信息」选中的结果）。
   *
   * <p>与 `initial` 的区别：`initial` 只在 `open` 变 true 时重置整张表单，
   * 这里只把 `values` 合并进当前值，**不会冲掉用户已填内容**。
   * `version` 每次变更触发一次合并。
   */
  patch?: { values: Record<string, unknown>; version: number } | null;
  submitting?: boolean;
  onClose: () => void;
  /**
   * 提交。`values` 是表单值，`files` 是「字段名 → 本地文件」——
   * **文件还没上传**，因为所有上传接口都需要已有的记录 id，
   * 调用方要先保存拿到 id 再上传（见 `useCrud`）。
   */
  onSubmit: (values: Record<string, unknown>, files: Record<string, File>) => void;
}

/**
 * 声明式表单弹窗：由 `fields` 驱动，自动处理必填校验、默认值、提交态与文件预览。
 */
export default function FormDialog({
  open,
  title,
  fields,
  initial,
  header,
  patch,
  submitting = false,
  onClose,
  onSubmit,
}: FormDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // `initial` 通常是父组件内联构造的对象，每次渲染身份都变。
  // 若把它放进 useEffect 依赖，会在每次输入后重置表单、冲掉用户已填内容；
  // 因此只以 `open` 为触发条件，用 ref 读取「打开那一刻」的初始值。
  const initialRef = useRef(initial);
  initialRef.current = initial;

  // 补丁同样用 ref 读取，避免内联对象身份变化触发合并
  const patchRef = useRef(patch);
  patchRef.current = patch;
  const patchVersion = patch?.version ?? 0;

  useEffect(() => {
    if (!open) return;
    setValues(initialRef.current ?? {});
    setFiles({});
    setPreviews({});
  }, [open]);

  // 「检索在线元信息」选中的字段只合并、不重置
  useEffect(() => {
    if (!open || patchVersion <= 0) return;
    const next = patchRef.current;
    if (!next) return;
    setValues((prev) => ({ ...prev, ...next.values }));
  }, [open, patchVersion]);

  // 关闭时释放预览用的 object URL
  useEffect(() => {
    if (open) return;
    setPreviews((prev) => {
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
      return {};
    });
  }, [open]);

  const onChange = (name: string, value: unknown) => setValues((prev) => ({ ...prev, [name]: value }));

  const onFileChange = (name: string, file: File | null) => {
    if (!file) {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      return;
    }
    setFiles((prev) => ({ ...prev, [name]: file }));
    const field = fields.find((f) => f.name === name);
    if (field?.type === 'image') {
      setPreviews((prev) => {
        if (prev[name]) URL.revokeObjectURL(prev[name]);
        return { ...prev, [name]: URL.createObjectURL(file) };
      });
    }
  };

  const submit = () => {
    for (const f of fields) {
      if (!f.required || f.type === 'switch') continue;
      const v = values[f.name];
      if (v === undefined || v === null || String(v).trim() === '') {
        toast.warning(`请填写「${f.label}」`);
        return;
      }
    }
    onSubmit(values, files);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pt: 2.5 }}>{title}</DialogTitle>
      <DialogContent>
        {header}
        <FormFields
          fields={fields}
          values={values}
          files={files}
          previews={previews}
          onChange={onChange}
          onFileChange={onFileChange}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
        <Button variant="outlined" onClick={onClose}>
          取消
        </Button>
        <Button variant="contained" onClick={submit} disabled={submitting}>
          {submitting ? '保存中…' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
