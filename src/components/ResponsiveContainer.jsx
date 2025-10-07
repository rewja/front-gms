import React from 'react';

const ResponsiveContainer = ({ 
  children, 
  className = '', 
  maxWidth = 'max-w-7xl',
  padding = 'px-4 sm:px-6 lg:px-8',
  margin = 'mx-auto'
}) => {
  return (
    <div className={`${maxWidth} ${padding} ${margin} ${className}`}>
      {children}
    </div>
  );
};

export const ResponsiveGrid = ({ 
  children, 
  className = '',
  cols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  gap = 'gap-4 sm:gap-6'
}) => {
  return (
    <div className={`grid ${cols} ${gap} ${className}`}>
      {children}
    </div>
  );
};

export const ResponsiveCard = ({ 
  children, 
  className = '',
  padding = 'p-4 sm:p-6',
  shadow = 'shadow-sm hover:shadow-md',
  rounded = 'rounded-lg',
  border = 'border border-gray-200 dark:border-gray-700'
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 ${padding} ${shadow} ${rounded} ${border} ${className}`}>
      {children}
    </div>
  );
};

export const ResponsiveButton = ({ 
  children, 
  className = '',
  size = 'sm',
  variant = 'primary',
  fullWidth = false,
  ...props
}) => {
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300',
    ghost: 'hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-300'
  };

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const ResponsiveInput = ({ 
  className = '',
  size = 'md',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const baseClasses = 'block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200';

  return (
    <input
      className={`${baseClasses} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
};

export const ResponsiveTextarea = ({ 
  className = '',
  rows = 3,
  ...props
}) => {
  const baseClasses = 'block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200';

  return (
    <textarea
      rows={rows}
      className={`${baseClasses} ${className}`}
      {...props}
    />
  );
};

export const ResponsiveSelect = ({ 
  children,
  className = '',
  size = 'md',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const baseClasses = 'block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200';

  return (
    <select
      className={`${baseClasses} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export const ResponsiveTable = ({ 
  children, 
  className = '',
  striped = true,
  hover = true
}) => {
  const baseClasses = 'min-w-full divide-y divide-gray-200 dark:divide-gray-700';
  const stripedClasses = striped ? 'divide-y divide-gray-200 dark:divide-gray-700' : '';
  const hoverClasses = hover ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : '';

  return (
    <div className="overflow-x-auto">
      <table className={`${baseClasses} ${stripedClasses} ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const ResponsiveTableHead = ({ children, className = '' }) => {
  return (
    <thead className={`bg-gray-50 dark:bg-gray-800 ${className}`}>
      {children}
    </thead>
  );
};

export const ResponsiveTableBody = ({ children, className = '' }) => {
  return (
    <tbody className={`bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
      {children}
    </tbody>
  );
};

export const ResponsiveTableRow = ({ children, className = '', hover = true }) => {
  const hoverClasses = hover ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : '';
  return (
    <tr className={`${hoverClasses} ${className}`}>
      {children}
    </tr>
  );
};

export const ResponsiveTableCell = ({ 
  children, 
  className = '', 
  header = false,
  padding = 'px-6 py-4'
}) => {
  const baseClasses = header 
    ? 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
    : `${padding} whitespace-nowrap text-sm text-gray-900 dark:text-gray-100`;

  return (
    <td className={`${baseClasses} ${className}`}>
      {children}
    </td>
  );
};

export default ResponsiveContainer;



