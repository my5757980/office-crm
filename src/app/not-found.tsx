import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <p className="text-gray-600 text-lg mb-6">Page not found</p>
        <Link
          href="/dashboard"
          className="bg-[#3b82f6] hover:bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
