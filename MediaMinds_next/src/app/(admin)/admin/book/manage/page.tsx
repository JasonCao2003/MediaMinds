'use client';

import { useEffect, useState } from 'react';
import { Avatar, Stack, Typography } from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import CrudManager, { type CrudField } from '@/components/admin/CrudManager';
import UploadAction from '@/components/admin/UploadAction';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import {
  getBookListService,
  addBookService,
  updateBookService,
  deleteBookService,
  updateBookCoverService,
  getAllTypesService,
} from '@/api/book';
import type { Book } from '@/types';

export default function BookManagePage() {
  const [typeOptions, setTypeOptions] = useState<Array<{ label: string; value: string | number }>>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getAllTypesService()
      .then((res) => {
        const list = (res.data as unknown as Array<{ id: number; typeName: string }>) || [];
        setTypeOptions(list.map((t) => ({ label: t.typeName, value: t.id })));
      })
      .catch(() => undefined);
  }, []);

  const columns: Array<Column<Record<string, unknown>>> = [
    { key: 'id', label: 'ID', width: 80 },
    {
      key: 'bookName',
      label: '书名',
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar variant="rounded" src={(r.bookImg as string) || undefined}>
            {(String(r.bookName ?? '书'))[0]}
          </Avatar>
          <Typography fontWeight={600}>{String(r.bookName ?? '')}</Typography>
        </Stack>
      ),
    },
    { key: 'bookAuthor', label: '作者', width: 160 },
    { key: 'chapterCount', label: '章节数', width: 100, align: 'center' },
    { key: 'bookDetails', label: '描述' },
    { key: 'createTime', label: '创建时间', width: 180 },
  ];

  const fields: CrudField[] = [
    { name: 'bookName', label: '书名', required: true },
    { name: 'bookAuthor', label: '作者', required: true },
    { name: 'typeId', label: '图书类型', type: 'select', options: typeOptions },
    { name: 'bookDetails', label: '描述', type: 'textarea' },
  ];

  return (
    <CrudManager
      key={reloadKey}
      title="图书管理"
      subtitle="维护书籍信息、封面上传与分类"
      icon={<MenuBookRoundedIcon />}
      columns={columns}
      fields={fields}
      searchFields={[
        { name: 'bookName', label: '书名' },
        { name: 'bookAuthor', label: '作者' },
      ]}
      fetchList={async (params) => {
        const res = await getBookListService(Number(params.page), Number(params.size), {
          bookName: params.bookName,
          bookAuthor: params.bookAuthor,
        });
        return normalizePage<Record<string, unknown>>(res);
      }}
      rowKey={(r) => String(r.id)}
      onCreate={(values) => addBookService(values as Partial<Book>)}
      onUpdate={(values) => updateBookService(values as Partial<Book>)}
      onDelete={(row) => deleteBookService(String(row.id))}
      extraRowActions={(row) => (
        <UploadAction
          label="封面"
          onUpload={(file) => updateBookCoverService(String(row.id), file)}
          onDone={() => setReloadKey((k) => k + 1)}
        />
      )}
      emptyText="暂无图书数据"
    />
  );
}
