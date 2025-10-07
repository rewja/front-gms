import React from 'react';

const SkeletonLoader = ({ type = 'card', lines = 3, className = '' }) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  if (type === 'card') {
    return (
      <div className={`${baseClasses} p-6 ${className}`}>
        <div className="space-y-3">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        </div>
      </div>
    );
  }
  
  if (type === 'chart') {
    return (
      <div className={`${baseClasses} p-4 ${className}`}>
        <div className="h-32 bg-gray-300 rounded"></div>
      </div>
    );
  }
  
  if (type === 'list') {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className={`${baseClasses} p-4`}>
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (type === 'stats') {
    return (
      <div className={`${baseClasses} p-5 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-gray-300 rounded"></div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${baseClasses} ${className}`}>
      <div className="h-4 bg-gray-300 rounded"></div>
    </div>
  );
};

export default SkeletonLoader;


