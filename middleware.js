// Vercel Edge Middleware - Handles CORS at the edge before serverless function
// This runs on Vercel's Edge Network, before your serverless function
// Note: Edge Middleware might need to be in the frontend project, not backend

export default function middleware(request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://dearly-tau.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  // Check if origin is allowed
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    const headers = new Headers();
    
    if (isAllowed) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
      headers.set('Access-Control-Max-Age', '86400');
    }
    
    return new Response(null, { 
      status: 204, 
      headers 
    });
  }
  
  // For regular requests, pass through (function will add headers)
  // Edge middleware can't modify response headers easily, so we handle OPTIONS here
  // and let the function handle regular requests
}

export const config = {
  matcher: '/api/:path*',
};

