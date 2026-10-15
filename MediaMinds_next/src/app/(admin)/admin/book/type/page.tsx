'use client';

import { Box, Chip, Typography } from '@mui/material';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import CrudManager from '@/components/admin/CrudManager';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import {
  getTypeListService,
  addTypeService,
  updateTypeService,
  deleteTypeService,
} from '@/api/book';
import type { BookType } from '@/types';

export default function BookTypeManagePage() {
  const columns: Array<Column<Record<string, unknown>>> = [
    { key: 'id', label: 'ID', width: 90 },
    {
      key: 'typeName',
      label: '类型名称',
      render: (r) => <Typography fontWeight={600}>{String(r.typeName ?? '')}</Typography>,
    },
    { key: 'createTime', label: '创建时间', width: 200 },
    { key: 'updateTime', label: '更新时间', width: 200 },
  ];

  return (
    <CrudManager
      title="图书类型管理"
      subtitle="维护图书分类，便于检索与推荐"
      icon={<CategoryRoundedIcon />}
      columns={columns}
      fields={[{ name: 'typeName', label: '类型名称', required: true }]}
      searchFields={[{ name: 'typeName', label: '类型名称' }]}
      fetchList={async (params) => {
        const res = await getTypeListService(Number(params.page), Number(params.size));
        return normalizePage<Record<string, unknown>>(res);
      }}
      rowKey={(r) => String(r.id)}
      onCreate={(values) => addTypeService(values as Partial<BookType>)}
      onUpdate={(values) => updateTypeService(values as Partial<BookType>)}
      onDelete={(row) => deleteTypeService(String(row.id))}
      emptyText="暂无图书类型"
    />
  );
}
