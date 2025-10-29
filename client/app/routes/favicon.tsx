// Simple favicon handler to prevent 404 errors
export default function Favicon() {
  return null;
}

export function loader() {
  // Return empty response for favicon requests
  return new Response(null, {
    status: 204,
    headers: {
      'Content-Type': 'image/x-icon',
    },
  });
}