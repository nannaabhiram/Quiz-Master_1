import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("admin/:adminToken", "routes/admin-dynamic.tsx"), // Dynamic admin route
  route("student", "routes/student.tsx"),
  route("host", "routes/host.tsx"),
] satisfies RouteConfig;
