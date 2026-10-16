'use client';

import { useEffect, useRef } from 'react';
import { reportActivityService } from '@/api/activity';
import type { MediaType } from '@/types';

/** 上报间隔；页面隐藏或卸载时也会立即上报一次 */
const FLUSH_INTERVAL_MS = 30_000;

/** 单次 tick 允许计入的最大秒数（防止后台标签页被节流后一次性计入很久） */
const MAX_TICK_SECONDS = 120;

/**
 * 媒体消费时长追踪。
 *
 * <p>口径：只有 `active` 为 true **且页面可见**时才计时。
 * 暂停播放、切到别的标签页、关闭页面都不计——这样统计出来的才是「真的在消费内容」的时间。
 *
 * <p>上报策略：每 30 秒上报一次增量；页面隐藏 / 卸载时补报一次。
 * 上报失败会把秒数放回去，等下次一起报，绝不因为统计而影响正常使用。
 */
export function useActivityTracker(mediaType: MediaType, active: boolean) {
  const pendingRef = useRef(0);
  const lastTickRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    lastTickRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      if (document.visibilityState === 'visible' && elapsed > 0 && elapsed < MAX_TICK_SECONDS) {
        pendingRef.current += elapsed;
      }
    };

    const flush = () => {
      const seconds = Math.floor(pendingRef.current);
      if (seconds <= 0) return;
      pendingRef.current -= seconds;
      reportActivityService(mediaType, seconds).catch(() => {
        // 失败就放回去，下次一起报
        pendingRef.current += seconds;
      });
    };

    const timer = window.setInterval(() => {
      tick();
      flush();
    }, FLUSH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        tick();
        flush();
      } else {
        // 回到前台时重置计时起点，避免把隐藏期间算进去
        lastTickRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onLeave = () => {
      tick();
      flush();
    };
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
      tick();
      flush();
    };
  }, [mediaType, active]);
}
