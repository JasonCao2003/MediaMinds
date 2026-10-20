'use client';

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import PlaylistRemoveRoundedIcon from '@mui/icons-material/PlaylistRemoveRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';

export interface MediaListItem {
  id: number;
  title: string;
  subtitle?: string;
  cover?: string;
}

/** 书单 / 播单详情：展示成员并支持移除 */
export default function ListItemsDialog({
  open,
  title,
  subtitle,
  items,
  loading,
  emptyText,
  onRemove,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  items: MediaListItem[];
  loading?: boolean;
  emptyText: string;
  onRemove: (item: MediaListItem) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pt: 2.5 }}>{title}</DialogTitle>
      <DialogContent>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {subtitle}
          </Typography>
        )}

        {loading ? (
          <EmptyState icon={<CircularProgress size={32} />} title="正在加载…" minHeight={180} />
        ) : items.length === 0 ? (
          <EmptyState title={emptyText} minHeight={180} />
        ) : (
          <List sx={{ maxHeight: 460, overflowY: 'auto' }}>
            {items.map((item) => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <Tooltip title="从列表移除">
                    <IconButton
                      size="small"
                      aria-label="从列表移除"
                      onClick={() => onRemove(item)}
                    >
                      <PlaylistRemoveRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <Box
                  sx={{
                    width: 42,
                    height: 58,
                    mr: 1.5,
                    flexShrink: 0,
                    overflow: 'hidden',
                    bgcolor: 'var(--mm-sunken)',
                  }}
                >
                  <CoverImage
                    src={item.cover}
                    alt={item.title}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Box>
                <ListItemText
                  primary={item.title}
                  secondary={item.subtitle}
                  slotProps={{ primary: { noWrap: true, fontWeight: 700 }, secondary: { noWrap: true } }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Stack direction="row" sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
