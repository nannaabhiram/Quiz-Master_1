import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("admin", "routes/admin.tsx"),
  route("student", "routes/student.tsx"),
  route("host", "routes/host.tsx"),
  // Handle favicon.ico to prevent error
  route("favicon.ico", "routes/favicon.tsx"),
] satisfies RouteConfig;
