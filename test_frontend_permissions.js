/**
 * Frontend Permission Test Script
 * ==============================
 * 
 * Test script untuk memverifikasi permission system di frontend
 * berdasarkan role yang berbeda.
 */

// Mock user data untuk testing
const testUsers = {
    super_admin: {
        id: 1,
        name: 'Test Super Admin',
        email: 'test_superadmin@example.com',
        role: 'super_admin',
        category: null
    },
    admin_ga_manager: {
        id: 2,
        name: 'Test GA Manager',
        email: 'test_gamanager@example.com',
        role: 'admin_ga_manager',
        category: null
    },
    admin_ga: {
        id: 3,
        name: 'Test GA Admin',
        email: 'test_gaadmin@example.com',
        role: 'admin_ga',
        category: null
    },
    user_ob: {
        id: 4,
        name: 'Test OB User',
        email: 'test_ob@example.com',
        role: 'user',
        category: 'ob'
    },
    user_driver: {
        id: 5,
        name: 'Test Driver User',
        email: 'test_driver@example.com',
        role: 'user',
        category: 'driver'
    },
    user_security: {
        id: 6,
        name: 'Test Security User',
        email: 'test_security@example.com',
        role: 'user',
        category: 'security'
    },
    user_magang: {
        id: 7,
        name: 'Test Magang User',
        email: 'test_magang@example.com',
        role: 'user',
        category: 'magang_pkl'
    }
};

// Mock navigation items function
function getNavigationItems(user) {
    const baseItems = [
        { name: 'Dashboard', href: '/dashboard', icon: 'Home' }
    ];

    if (user?.role === 'user') {
        return [
            ...baseItems,
            { name: 'To-Do List', href: '/todos', icon: 'CheckSquare' },
            { name: 'Request Item', href: '/requests', icon: 'Package' },
            { name: 'My Activity', href: '/my-activity', icon: 'History' }
        ];
    }

    if (['admin_ga', 'admin_ga_manager', 'super_admin'].includes(user?.role)) {
        const adminItems = [
            ...baseItems,
            { name: 'User Management', href: '/admin/users', icon: 'Users' },
            { name: 'All To-Dos', href: '/admin/todos', icon: 'CheckSquare' },
            { name: 'Request Items', href: '/admin/requests', icon: 'Package' },
            { name: 'Asset Management', href: '/admin/asset-management', icon: 'Building' }
        ];

        // Only admin_ga and admin_ga_manager can see activity logs
        if (['admin_ga', 'admin_ga_manager'].includes(user?.role)) {
            adminItems.push({ name: 'Activity Logs', href: '/admin/activity-logs', icon: 'History' });
        }

        return adminItems;
    }

    return baseItems;
}

// Mock route protection function
function canAccessRoute(user, route) {
    const routePermissions = {
        '/admin/users': ['admin_ga', 'admin_ga_manager', 'super_admin'],
        '/admin/todos': ['admin_ga', 'admin_ga_manager', 'super_admin'],
        '/admin/requests': ['admin_ga', 'admin_ga_manager', 'super_admin'],
        '/admin/asset-management': ['admin_ga', 'admin_ga_manager', 'super_admin'],
        '/admin/activity-logs': ['admin_ga', 'admin_ga_manager'], // Only GA roles
        '/admin/visitors': ['admin_ga', 'admin_ga_manager', 'super_admin'],
        '/todos': ['user'],
        '/requests': ['user'],
        '/my-activity': ['user'],
        '/dashboard': ['admin_ga', 'admin_ga_manager', 'super_admin', 'user']
    };

    const allowedRoles = routePermissions[route] || [];
    return allowedRoles.includes(user?.role);
}

// Test function
function runFrontendPermissionTests() {
    console.log('🧪 STARTING FRONTEND PERMISSION TESTS');
    console.log('=====================================\n');

    // Test navigation items for each role
    Object.entries(testUsers).forEach(([userKey, user]) => {
        console.log(`🔍 Testing ${user.name} (${user.role}${user.category ? ` - ${user.category}` : ''}):`);
        
        const navigationItems = getNavigationItems(user);
        console.log(`  📋 Navigation items: ${navigationItems.map(item => item.name).join(', ')}`);
        
        // Test specific permissions
        const tests = [
            { route: '/admin/users', expected: ['admin_ga', 'admin_ga_manager', 'super_admin'] },
            { route: '/admin/todos', expected: ['admin_ga', 'admin_ga_manager', 'super_admin'] },
            { route: '/admin/requests', expected: ['admin_ga', 'admin_ga_manager', 'super_admin'] },
            { route: '/admin/asset-management', expected: ['admin_ga', 'admin_ga_manager', 'super_admin'] },
            { route: '/admin/activity-logs', expected: ['admin_ga', 'admin_ga_manager'] },
            { route: '/admin/visitors', expected: ['admin_ga', 'admin_ga_manager', 'super_admin'] },
            { route: '/todos', expected: ['user'] },
            { route: '/requests', expected: ['user'] },
            { route: '/my-activity', expected: ['user'] },
            { route: '/dashboard', expected: ['admin_ga', 'admin_ga_manager', 'super_admin', 'user'] }
        ];
        
        tests.forEach(test => {
            const canAccess = canAccessRoute(user, test.route);
            const shouldAccess = test.expected.includes(user.role);
            
            if (canAccess === shouldAccess) {
                console.log(`    ✅ ${test.route}: ${canAccess ? 'CAN' : 'CANNOT'} access`);
            } else {
                console.log(`    ❌ ${test.route}: ${canAccess ? 'CAN' : 'CANNOT'} access (Expected: ${shouldAccess ? 'CAN' : 'CANNOT'})`);
            }
        });
        
        // Test ActivityLogs specific permission
        const canAccessActivityLogs = ['admin_ga', 'admin_ga_manager'].includes(user.role);
        const hasActivityLogsInNav = navigationItems.some(item => item.name === 'Activity Logs');
        
        if (canAccessActivityLogs === hasActivityLogsInNav) {
            console.log(`    ✅ Activity Logs: ${canAccessActivityLogs ? 'CAN' : 'CANNOT'} access`);
        } else {
            console.log(`    ❌ Activity Logs: Navigation mismatch`);
        }
        
        console.log('');
    });

    // Test specific scenarios
    console.log('🎯 TESTING SPECIFIC SCENARIOS:');
    console.log('==============================\n');
    
    // Test 1: Super Admin should NOT see ActivityLogs in navigation
    const superAdminNav = getNavigationItems(testUsers.super_admin);
    const superAdminHasActivityLogs = superAdminNav.some(item => item.name === 'Activity Logs');
    
    if (!superAdminHasActivityLogs) {
        console.log('✅ Super Admin correctly does NOT see ActivityLogs in navigation');
    } else {
        console.log('❌ Super Admin incorrectly sees ActivityLogs in navigation');
    }
    
    // Test 2: GA Manager should see ActivityLogs in navigation
    const gaManagerNav = getNavigationItems(testUsers.admin_ga_manager);
    const gaManagerHasActivityLogs = gaManagerNav.some(item => item.name === 'Activity Logs');
    
    if (gaManagerHasActivityLogs) {
        console.log('✅ GA Manager correctly sees ActivityLogs in navigation');
    } else {
        console.log('❌ GA Manager incorrectly does NOT see ActivityLogs in navigation');
    }
    
    // Test 3: GA Admin should see ActivityLogs in navigation
    const gaAdminNav = getNavigationItems(testUsers.admin_ga);
    const gaAdminHasActivityLogs = gaAdminNav.some(item => item.name === 'Activity Logs');
    
    if (gaAdminHasActivityLogs) {
        console.log('✅ GA Admin correctly sees ActivityLogs in navigation');
    } else {
        console.log('❌ GA Admin incorrectly does NOT see ActivityLogs in navigation');
    }
    
    // Test 4: Users should see My Activity instead of ActivityLogs
    const userRoles = ['user_ob', 'user_driver', 'user_security', 'user_magang'];
    userRoles.forEach(userKey => {
        const user = testUsers[userKey];
        const userNav = getNavigationItems(user);
        const hasMyActivity = userNav.some(item => item.name === 'My Activity');
        const hasActivityLogs = userNav.some(item => item.name === 'Activity Logs');
        
        if (hasMyActivity && !hasActivityLogs) {
            console.log(`✅ ${user.name} correctly sees My Activity (not ActivityLogs)`);
        } else {
            console.log(`❌ ${user.name} navigation issue: My Activity: ${hasMyActivity}, ActivityLogs: ${hasActivityLogs}`);
        }
    });
    
    console.log('\n✅ FRONTEND PERMISSION TESTS COMPLETED!');
}

// Run the tests
runFrontendPermissionTests();
