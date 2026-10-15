import { redirect } from 'next/navigation';

export default function NotFoundRedirect() {
  redirect('/404');
}
