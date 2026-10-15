'use client';

import { ReactNode } from 'react';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';

export interface Column<T> {
  key: string;
  label: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  loading?: boolean;
  total: number;
  page: number; // 1-based
  pageSize: number;
  rowKey: (row: T, index: number) => string | number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  dense?: boolean;
}

export default function DataTable<T>({
  columns,
  rows,
  loading = false,
  total,
  page,
  pageSize,
  rowKey,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  emptyText = '暂无数据',
  dense = false,
}: DataTableProps<T>) {
  return (
    <Card sx={{ overflow: 'hidden' }}>
      <TableContainer>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  bgcolor: 'action.hover',
                  fontWeight: 700,
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                },
              }}
            >
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align ?? 'left'} sx={{ width: col.width }}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: 'grid', placeItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <InboxRoundedIcon sx={{ fontSize: 44, opacity: 0.4 }} />
                    <Typography variant="body2">{emptyText}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={rowKey(row, index)}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 150ms',
                  }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} align={col.align ?? 'left'}>
                      {col.render ? col.render(row, index) : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={Math.max(0, page - 1)}
        onPageChange={(_, next) => onPageChange(next + 1)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[5, 10, 20, 50]}
        labelRowsPerPage="每页"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
      />
    </Card>
  );
}
