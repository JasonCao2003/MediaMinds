'use client';

import { useRef } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CoverImage from '@/components/common/CoverImage';

export type FormFieldType = 'text' | 'textarea' | 'number' | 'select' | 'switch' | 'image' | 'file';

export interface FormField {
  name: string;
  label: string;
  type?: FormFieldType;
  required?: boolean;
  /** type='select' 的选项 */
  options?: Array<{ label: string; value: string | number }>;
  helperText?: string;
  /** text / textarea 的最大长度 */
  maxLength?: number;
  /** textarea 行数 */
  rows?: number;
  /** image / file 接受的文件类型，如 "image/*" */
  accept?: string;
}

/**
 * 表单字段渲染（受控）。
 *
 * <p>`FormDialog` 与 `DimensionDialog` 共用这一份字段渲染，避免两处各写一遍。
 * 文件选择由一个**隐藏 input** 统一处理——不在 `<button>` 里嵌 `<input>`，
 * 那是无效 HTML，会触发 React hydration 报错。
 */
export default function FormFields({
  fields,
  values,
  files,
  previews,
  onChange,
  onFileChange,
}: {
  fields: FormField[];
  values: Record<string, unknown>;
  files: Record<string, File>;
  previews: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
  onFileChange: (name: string, file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeFieldRef = useRef<FormField | null>(null);

  const openPicker = (field: FormField) => {
    activeFieldRef.current = field;
    const input = fileInputRef.current;
    if (!input) return;
    input.value = '';
    input.accept = field.accept ?? '';
    input.click();
  };

  return (
    <Stack spacing={2.5}>
      {fields.map((f) => {
        const value = values[f.name];

        if (f.type === 'switch') {
          return (
            <FormControlLabel
              key={f.name}
              control={<Switch checked={Boolean(value)} onChange={(e) => onChange(f.name, e.target.checked)} />}
              label={<Typography sx={{ fontWeight: 700 }}>{f.label}</Typography>}
            />
          );
        }

        if (f.type === 'select') {
          return (
            <TextField
              key={f.name}
              select
              fullWidth
              label={f.label}
              required={f.required}
              value={value ?? ''}
              onChange={(e) => onChange(f.name, e.target.value)}
              helperText={f.helperText}
            >
              {(f.options ?? []).map((o) => (
                <MenuItem key={String(o.value)} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          );
        }

        if (f.type === 'image' || f.type === 'file') {
          const chosen = files[f.name];
          const preview = previews[f.name] || (typeof value === 'string' ? value : '');
          return (
            <Box key={f.name}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--mm-text-2)',
                }}
              >
                {f.label}
                {f.required ? ' *' : ''}
              </Typography>

              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                {f.type === 'image' && (
                  <Box
                    sx={{
                      width: 72,
                      height: 96,
                      flexShrink: 0,
                      overflow: 'hidden',
                      bgcolor: 'var(--mm-sunken)',
                      boxShadow: 'var(--mm-sunken-sm)',
                    }}
                  >
                    <CoverImage
                      src={preview || undefined}
                      alt={f.label}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => openPicker(f)}>
                    {chosen ? '重新选择' : `选择${f.type === 'image' ? '图片' : '文件'}`}
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }} noWrap>
                    {chosen ? chosen.name : f.helperText || '保存后自动上传'}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          );
        }

        return (
          <TextField
            key={f.name}
            fullWidth
            multiline={f.type === 'textarea'}
            minRows={f.type === 'textarea' ? f.rows ?? 3 : undefined}
            type={f.type === 'number' ? 'number' : 'text'}
            label={f.label}
            required={f.required}
            value={value ?? ''}
            onChange={(e) => onChange(f.name, e.target.value)}
            helperText={f.helperText}
            slotProps={f.maxLength ? { htmlInput: { maxLength: f.maxLength } } : undefined}
          />
        );
      })}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={(e) => {
          const field = activeFieldRef.current;
          if (field) onFileChange(field.name, e.target.files?.[0] ?? null);
        }}
      />
    </Stack>
  );
}
