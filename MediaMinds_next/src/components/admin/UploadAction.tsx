'use client';

import { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import { toast } from '@/lib/notify';

interface UploadActionProps {
  label: string;
  accept?: string;
  onUpload: (file: File) => Promise<unknown>;
  onDone?: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'inherit';
}

/** 兼容旧版浏览器不支持 MUI Button component="label" 的通用上传按钮 */
export default function UploadAction({
  label,
  accept = 'image/*',
  onUpload,
  onDone,
  color = 'primary',
}: UploadActionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLoading(true);
    try {
      await onUpload(file);
      toast.success(`${label}成功`);
      onDone?.();
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={handleChange} />
      <Button
        size="small"
        color={color}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={14} /> : <CloudUploadRoundedIcon fontSize="small" />}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}
