import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-24">
      <h1 className="text-4xl font-bold text-blue-600 mb-8">SFB Time Tracker</h1>
      <p className="text-lg mb-8">Internal Company Portal</p>
      
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Login
        </Link>
        <Link href="/register" className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-gray-50">
          Register Company
        </Link>
      </div>
    </div>
  );
}