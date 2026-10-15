'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 路由切换时的顶部进度条（对应 Vue 版 NProgress）。
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setWidth(20);
    const t1 = setTimeout(() => setWidth(70), 120);
    const t2 = setTimeout(() => setWidth(100), 380);
    const t3 = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 620);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  if (!visible) return null;

  return <div className="mm-progress-bar" style={{ width: `${width}%` }} />;
}
