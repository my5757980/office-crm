const colors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  closed: "bg-gray-100 text-gray-600",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
