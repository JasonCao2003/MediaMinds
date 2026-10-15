import UserLayout from '@/components/layout/UserLayout';

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return <UserLayout>{children}</UserLayout>;
}
