/**
 * Permission helper functions
 * Super admin is read-only (can only view, export, navigate)
 * Only admin_ga and admin_ga_manager can create, edit, delete
 */

/**
 * Check if user can perform write operations (create, edit, delete)
 * @param {Object} user - User object from auth context
 * @returns {boolean} - True if user can write, false if read-only
 */
export const canWrite = (user) => {
  if (!user) return false;
  // Super admin is read-only
  if (user.role === 'super_admin') return false;
  // Admin GA and GA Manager can write
  return user.role === 'admin_ga' || user.role === 'admin_ga_manager';
};

/**
 * Check if user can create new items
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const canCreate = (user) => {
  return canWrite(user);
};

/**
 * Check if user can edit items
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const canEdit = (user) => {
  return canWrite(user);
};

/**
 * Check if user can delete items
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const canDelete = (user) => {
  return canWrite(user);
};

/**
 * Check if user can approve/reject (for meetings, requests, etc)
 * Super admin can view but cannot approve/reject
 * @param {Object} user - User object from auth context
 * @param {string} requiredRole - Required role for approval (e.g., 'admin_ga', 'admin_ga_manager')
 * @returns {boolean}
 */
export const canApprove = (user, requiredRole = null) => {
  if (!user) return false;
  // Super admin cannot approve
  if (user.role === 'super_admin') return false;
  
  if (requiredRole) {
    return user.role === requiredRole;
  }
  
  // Default: admin_ga and admin_ga_manager can approve
  return user.role === 'admin_ga' || user.role === 'admin_ga_manager';
};

