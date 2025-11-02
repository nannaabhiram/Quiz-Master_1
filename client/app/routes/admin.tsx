import type { Route } from "./+types/admin";
import AdminPanel from "../components/AdminPanel";
import ProtectedRoute from "../components/ProtectedRoute";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "quiz Admin" },
    { name: "description", content: "Create and manage quizzes" },
  ];
}

export default function AdminRoute() {
  return (
    <ProtectedRoute>
      <AdminPanel />
    </ProtectedRoute>
  );
}
