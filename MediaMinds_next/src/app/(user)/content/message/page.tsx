'use client';

import { useMemo, useState } from 'react';
import { Box, Button, Card, Stack, Tab, Tabs, Typography } from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import PageHeader from '@/components/common/PageHeader';
import MessageList from '@/components/user/MessageList';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { useMessageStore } from '@/stores/messageStore';
import { toast } from '@/lib/notify';

type TabKey = 'all' | 'unread' | 'system' | 'personal';

export default function MessagePage() {
  const confirm = useConfirm();
  const { messages, markRead, markAllRead, removeMessage, clear } = useMessageStore();
  const [tab, setTab] = useState<TabKey>('all');

  const filtered = useMemo(() => {
    switch (tab) {
      case 'unread':
        return messages.filter((m) => !m.read);
      case 'system':
        return messages.filter((m) => m.isSystem);
      case 'personal':
        return messages.filter((m) => m.isPersonal);
      default:
        return messages;
    }
  }, [messages, tab]);

  const hasUnread = messages.some((m) => !m.read);

  const handleClear = async () => {
    const ok = await confirm({
      title: '清空消息',
      description: '确定要清空全部消息吗？此操作不可恢复。',
      danger: true,
      confirmText: '清空',
    });
    if (ok) {
      clear();
      toast.success('消息已清空');
    }
  };

  return (
    <Box>
      <PageHeader
        title="消息中心"
        subtitle="查看您收到的通知与消息"
        icon={<NotificationsRoundedIcon />}
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<DoneAllRoundedIcon />}
              disabled={!hasUnread}
              onClick={() => {
                markAllRead();
                toast.success('已全部标为已读');
              }}
            >
              全部标为已读
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepRoundedIcon />}
              disabled={messages.length === 0}
              onClick={handleClear}
            >
              清空消息
            </Button>
          </>
        }
      />

      <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="all" label={`全部 (${messages.length})`} />
          <Tab value="unread" label={`未读 (${messages.filter((m) => !m.read).length})`} />
          <Tab value="system" label={`系统通知 (${messages.filter((m) => m.isSystem).length})`} />
          <Tab value="personal" label={`个人消息 (${messages.filter((m) => m.isPersonal).length})`} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {filtered.length === 0 ? (
            <Stack alignItems="center" spacing={1} sx={{ py: 6, color: 'text.secondary' }}>
              <NotificationsRoundedIcon sx={{ fontSize: 56, opacity: 0.35 }} />
              <Typography>暂无消息</Typography>
            </Stack>
          ) : (
            <MessageList messages={filtered} onRead={markRead} onDelete={removeMessage} />
          )}
        </Box>
      </Card>
    </Box>
  );
}
