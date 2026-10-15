'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import CrudManager from '@/components/admin/CrudManager';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import {
  getChapterListService,
  addChapterService,
  updateChapterService,
  deleteChapterService,
  getBookListService,
} from '@/api/book';

export default function BookChapterManagePage() {
  const [books, setBooks] = useState<Array<{ id: number; bookName: string }>>([]);
  const [bookId, setBookId] = useState<string>('');

  useEffect(() => {
    getBookListService(1, 200)
      .then((res) => {
        const { rows } = normalizePage<{ id: number; bookName: string }>(res);
        setBooks(rows);
        if (rows.length) setBookId(String(rows[0].id));
      })
      .catch(() => undefined);
  }, []);

  const columns: Array<Column<Record<string, unknown>>> = [
    { key: 'id', label: 'ID', width: 80 },
    { key: 'chapterNumber', label: '章节序号', width: 110, align: 'center' },
    { key: 'chapterTitle', label: '章节标题', render: (r) => <Typography fontWeight={600}>{String(r.chapterTitle ?? '')}</Typography> },
    { key: 'contentPath', label: '内容路径' },
    { key: 'wordCount', label: '字数', width: 100, align: 'center' },
    { key: 'createTime', label: '创建时间', width: 180 },
  ];

  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 3, borderRadius: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            选择书籍：
          </Typography>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>书籍</InputLabel>
            <Select label="书籍" value={bookId} onChange={(e) => setBookId(e.target.value)}>
              {books.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>
                  {b.bookName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Card>

      {bookId && (
        <CrudManager
          key={bookId}
          title="图书章节管理"
          subtitle="维护所选书籍的章节内容"
          icon={<ArticleRoundedIcon />}
          columns={columns}
          fields={[
            { name: 'chapterNumber', label: '章节序号', type: 'number', required: true },
            { name: 'chapterTitle', label: '章节标题', required: true },
            { name: 'contentPath', label: '内容路径' },
            { name: 'wordCount', label: '字数', type: 'number' },
          ]}
          defaultQuery={{ bookId }}
          fetchList={async (params) => {
            const res = await getChapterListService(bookId, Number(params.page), Number(params.size));
            return normalizePage<Record<string, unknown>>(res);
          }}
          rowKey={(r) => String(r.id)}
          onCreate={(values) => addChapterService({ ...values, bookId: Number(bookId) })}
          onUpdate={(values) => updateChapterService({ ...values, bookId: Number(bookId) })}
          onDelete={(row) => deleteChapterService(String(row.id))}
          emptyText="该书籍暂无章节"
        />
      )}
    </Box>
  );
}
