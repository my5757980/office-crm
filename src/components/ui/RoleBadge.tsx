const colors: Record<string, string> = {
  user: "bg-gray-100 text-gray-700",
  admin: "bg-blue-100 text-blue-700",
  manager: "bg-green-100 text-green-700",
  super_admin: "bg-red-100 text-red-700",
};

export default function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[role] ?? "bg-gray-100 text-gray-700"}`}>
      {role.replace("_", " ")}
    </span>
  );
}
