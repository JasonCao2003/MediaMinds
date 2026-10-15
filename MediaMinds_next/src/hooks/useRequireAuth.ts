'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * 登录守卫：仅校验登录态（单角色，无权限区分）。
 */
export function useRequireAuth() {
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
