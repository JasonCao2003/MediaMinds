'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * 单用户模式：仅校验登录态，不再做角色判断。
 * （保留 options 参数以兼容既有调用签名）
 */
export function useRequireAuth(_options: { admin?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    import('@/stores/authStore').then(({ useAuthStore }) => {
      const { token } = useAuthStore.getState();
      if (!token) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    });
  }, [router, pathname]);
}
