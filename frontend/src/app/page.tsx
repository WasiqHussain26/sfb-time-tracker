import { redirect } from 'next/navigation';

export default function Home() {
  // Immediately redirect everyone to the login page
  redirect('/login');
}