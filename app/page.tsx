import { redirect } from 'next/navigation';

export default function HomePage() {
  // Automatically redirect root visitors directly to the Customer LIFF Booking App
  redirect('/liff');
}
