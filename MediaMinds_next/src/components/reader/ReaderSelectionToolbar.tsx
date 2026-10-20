'use client';

import { Box, Button, Card, IconButton, Stack, Tooltip } from '@mui/material';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import FormatClearRoundedIcon from '@mui/icons-material/FormatClearRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import { ANNOTATION_COLORS, type AnnotationColor } from '@/lib/readerAnnotations';

export interface ReaderSelectionMenu {
  top: number;
  left: number;
}

/**
 * 阅读器选中文字后的浮动工具条。
 *
 * <p>固定在选区下方，`onMouseDown` 阻止默认行为，避免点按钮时浏览器先清掉选区。
 */
export default function ReaderSelectionToolbar({
  menu,
  onColor,
  onNote,
  onAnalyze,
  onClear,
}: {
  menu: ReaderSelectionMenu;
  onColor: (color: AnnotationColor) => void;
  onNote: () => void;
  onAnalyze: () => void;
  onClear: () => void;
}) {
  return (
    <Card
      data-reader-toolbar
      onMouseDown={(e) => e.preventDefault()}
      sx={{
        position: 'fixed',
        top: menu.top,
        left: menu.left,
        transform: 'translateX(-50%)',
        zIndex: 1400,
        px: 0.75,
        py: 0.5,
        maxWidth: 'calc(100vw - 24px)',
        overflowX: 'auto',
        borderRadius: 0,
        boxShadow: 'var(--mm-float)',
        bgcolor: 'var(--mm-bg)',
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center">
        {(Object.keys(ANNOTATION_COLORS) as AnnotationColor[]).map((color) => (
          <Tooltip key={color} title={`标记${ANNOTATION_COLORS[color].label}`}>
            <IconButton
              size="small"
              aria-label={`标记${ANNOTATION_COLORS[color].label}`}
              onClick={() => onColor(color)}
              sx={{ p: 0.5 }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  bgcolor: ANNOTATION_COLORS[color].css,
                  boxShadow: 'var(--mm-raised-sm)',
                }}
              />
            </IconButton>
          </Tooltip>
        ))}

        <Box sx={{ width: 1, height: 26, bgcolor: 'var(--mm-border-color)', mx: 0.25 }} />

        <Button size="small" startIcon={<EditNoteRoundedIcon fontSize="small" />} onClick={onNote}>
          笔记
        </Button>
        <Button size="small" startIcon={<SmartToyRoundedIcon fontSize="small" />} onClick={onAnalyze}>
          AI 分析
        </Button>
        <Tooltip title="清除这段文字的标记 / 笔记">
          <IconButton size="small" aria-label="清除标记" onClick={onClear}>
            <FormatClearRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Card>
  );
}
