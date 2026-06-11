import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">Finding Keepers</h1>
        <p className="text-xl text-gray-600 mb-8">Verified Marriage Matching Platform</p>

        <div className="flex gap-4 justify-center">
          <Link 
            href="/register" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Register
          </Link>
          <Link 
            href="/login" 
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
