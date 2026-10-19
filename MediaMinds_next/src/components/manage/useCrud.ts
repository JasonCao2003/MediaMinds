'use client';

import { useCallback, useState } from 'react';
import { toast } from '@/lib/notify';
import { useConfirm } from '@/components/common/ConfirmProvider';

/** 后端统一响应里我们关心的部分 */
interface CrudResult {
  code?: number;
  msg?: string;
  message?: string;
  /** 新建接口会返回实体（含自增 id），供调用方继续上传文件 */
  data?: unknown;
}

type CrudFn<T> = (arg: T) => Promise<CrudResult>;

export interface UseCrudOptions {
  /** 新建（不传则该资源不支持新建） */
  create?: CrudFn<Record<string, unknown>>;
  /** 更新（不传则该资源不支持编辑） */
  update?: CrudFn<Record<string, unknown>>;
  /** 删除（不传则该资源不支持删除） */
  remove?: CrudFn<string | number>;
  /** 成功之后做什么（一般是刷新列表） */
  onChanged?: () => void;
  /** 资源名，用于提示文案，例如「图书」 */
  label?: string;
}

/**
 * 内容 CRUD 的通用逻辑。
 *
 * <p>把「调用接口 → 判断 code → toast → 刷新列表」这套重复流程收在一处，
 * 各资源页只需要传三个接口函数 + 一个刷新回调。
 *
 * <p>删除会先弹确认框（复用全局 `ConfirmProvider`）。
 */
export function useCrud({ create, update, remove, onChanged, label = '内容' }: UseCrudOptions) {
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  /** 保存（新建或编辑）。返回是否成功 + 后端返回的数据（新建时含自增 id） */
  const save = useCallback(
    async (values: Record<string, unknown>, isEdit: boolean): Promise<{ ok: boolean; data?: unknown }> => {
      const fn = isEdit ? update : create;
      if (!fn) {
        toast.error(`${label}暂不支持${isEdit ? '编辑' : '新建'}`);
        return { ok: false };
      }
      setSaving(true);
      try {
        const res = await fn(values);
        if (res?.code === 200) {
          toast.success(isEdit ? `${label}已保存` : `${label}已创建`);
          onChanged?.();
          return { ok: true, data: res.data };
        }
        toast.error(res?.msg || res?.message || '保存失败');
        return { ok: false };
      } catch {
        /* 拦截器已提示 */
        return { ok: false };
      } finally {
        setSaving(false);
      }
    },
    [create, update, onChanged, label],
  );

  /** 删除（带确认框）。返回是否成功 */
  const removeById = useCallback(
    async (id: string | number, name?: string): Promise<boolean> => {
      if (!remove) {
        toast.error(`${label}暂不支持删除`);
        return false;
      }
      const ok = await confirm({
        title: `删除${label}`,
        description: name ? `确定要删除「${name}」吗？此操作不可撤销。` : '确定要删除吗？此操作不可撤销。',
        confirmText: '删除',
        danger: true,
      });
      if (!ok) return false;

      setRemoving(true);
      try {
        const res = await remove(id);
        if (res?.code === 200) {
          toast.success(`${label}已删除`);
          onChanged?.();
          return true;
        }
        toast.error(res?.msg || res?.message || '删除失败');
        return false;
      } catch {
        return false;
      } finally {
        setRemoving(false);
      }
    },
    [remove, onChanged, label, confirm],
  );

  return { saving, removing, save, removeById };
}
