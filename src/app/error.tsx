"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
