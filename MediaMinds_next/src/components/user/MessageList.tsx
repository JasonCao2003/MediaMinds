'use client';

import {
  Avatar,
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EmptyState from '@/components/common/EmptyState';
import type { AppMessage } from '@/stores/messageStore';

interface MessageListProps {
  messages: AppMessage[];
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function timeText(msg: AppMessage) {
  const t = msg.time || msg.timestamp;
  if (!t) return '';
  return new Date(t).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageList({ messages, onRead, onDelete }: MessageListProps) {
  if (messages.length === 0) {
    return <EmptyState icon={<NotificationsRoundedIcon sx={{ fontSize: 64 }} />} title="暂无消息" />;
  }

  return (
    <List sx={{ display: 'grid', gap: 1 }}>
      {messages.map((msg) => (
        <ListItem
          key={msg.id}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: msg.read ? 'background.paper' : 'action.hover',
            alignItems: 'flex-start',
            transition: 'background-color 200ms',
          }}
          secondaryAction={
            <Stack direction="row" spacing={0.5}>
              {!msg.read && (
                <Tooltip title="标为已读">
                  <IconButton size="small" onClick={() => onRead(msg.id)}>
                    <CheckRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="删除">
                <IconButton size="small" color="error" onClick={() => onDelete(msg.id)}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          }
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: msg.isSystem ? 'primary.main' : 'secondary.main' }}>
              {msg.isSystem ? <CampaignRoundedIcon /> : <PersonRoundedIcon />}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2" fontWeight={700}>
                  {msg.title || '通知'}
                </Typography>
                {msg.isSystem ? (
                  <Chip label="系统" size="small" color="primary" variant="outlined" />
                ) : (
                  msg.isPersonal && <Chip label="个人" size="small" color="secondary" variant="outlined" />
                )}
                {!msg.read && <Chip label="未读" size="small" color="error" />}
                <Typography variant="caption" color="text.secondary">
                  {timeText(msg)}
                </Typography>
              </Stack>
            }
            secondary={msg.content}
            secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
          />
        </ListItem>
      ))}
    </List>
  );
}
