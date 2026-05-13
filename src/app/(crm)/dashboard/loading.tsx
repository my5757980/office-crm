export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[#e5e7eb] bg-white px-6 py-3 h-14" />
      <div className="flex-1 p-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
