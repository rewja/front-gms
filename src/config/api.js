// Configuration for API endpoints
export const config = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
};

// Helper function to get storage URL
export const getStorageUrl = (path) => {
  if (!path) return '';
  
  // If path already contains full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Return full URL with backend URL
  return `${config.backendUrl}/${cleanPath}`;
};












