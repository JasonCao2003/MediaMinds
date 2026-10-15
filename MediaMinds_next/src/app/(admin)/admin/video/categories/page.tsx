'use client';

import { Chip, Typography } from '@mui/material';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import CrudManager from '@/components/admin/CrudManager';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import {
  getCategoryListService,
  addCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from '@/api/video';

export default function VideoCategoryManagePage() {
  const columns: Array<Column<Record<string, unknown>>> = [
    { key: 'id', label: 'ID', width: 90 },
    { key: 'name', label: '分类名称', render: (r) => <Typography fontWeight={600}>{String(r.name ?? '')}</Typography> },
    { key: 'description', label: '描述' },
    { key: 'sortOrder', label: '排序', width: 100, align: 'center', render: (r) => <Chip size="small" label={String(r.sortOrder ?? 0)} /> },
    { key: 'createTime', label: '创建时间', width: 190 },
  ];

  return (
    <CrudManager
      title="视频分类管理"
      subtitle="维护影片分类与排序"
      icon={<SellRoundedIcon />}
      columns={columns}
      fields={[
        { name: 'name', label: '分类名称', required: true },
        { name: 'description', label: '描述', type: 'textarea' },
        { name: 'sortOrder', label: '排序', type: 'number', defaultValue: 0 },
      ]}
      searchFields={[{ name: 'name', label: '分类名称' }]}
      fetchList={async (params) => {
        const res = await getCategoryListService(Number(params.page), Number(params.size));
        return normalizePage<Record<string, unknown>>(res);
      }}
      rowKey={(r) => String(r.id)}
      onCreate={(values) => addCategoryService(values)}
      onUpdate={(values) => updateCategoryService(values)}
      onDelete={(row) => deleteCategoryService(String(row.id))}
      emptyText="暂无分类数据"
    />
  );
}
