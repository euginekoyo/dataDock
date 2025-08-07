import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/roles';
import { Home, Users, Folder, FileText, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import classNames from 'classnames';

const menuItems = [
    {
        id: 0,
        label: 'Home',
        icon: Home,
        link: '/',
        permission: 'view_dashboard',
    },
    {
        id: 1,
        label: 'User Management',
        icon: Users,
        link: '/dashboard',
        permission: 'manage_users',
    },
    {
        id: 2,
        label: 'Template Configuration',
        icon: FileText,
        link: '/templates',
        permission: 'view_templates',
    },
    {
        id: 3,
        label: 'Libraries',
        icon: Folder,
        link: '/libraries',
        permission: 'view_libraries',
    },
];

const Sidebar = ({ onToggle }) => {
    const { user, logout } = useAuth();
    const [toggleCollapse, setToggleCollapse] = useState(false);
    const [isCollapsible, setIsCollapsible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [filteredMenuItems, setFilteredMenuItems] = useState([]);
    const router = useRouter();

    // Check for mobile screen size
    useEffect(() => {
        const checkScreenSize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile && !toggleCollapse) {
                setToggleCollapse(true);
                if (onToggle) {
                    onToggle(true);
                }
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [onToggle, toggleCollapse]);

    // Filter menu items based on permissions
    useEffect(() => {
        const filterMenuItems = async () => {
            if (!user) {
                console.log('Sidebar: No user, setting empty menu items');
                setFilteredMenuItems([]);
                return;
            }

            console.log('Sidebar user:', user);
            const filtered = [];
            for (const item of menuItems) {
                const permissions = await hasPermission(user.role);
                console.log(`Menu ${item.label}: hasPermission(${user.role}, ${item.permission}) =`, permissions);
                if (permissions.includes(item.permission)) {
                    filtered.push(item);
                }
            }
            console.log('Filtered menu items:', filtered);
            setFilteredMenuItems(filtered);
        };

        filterMenuItems();
    }, [user]);

    const activeMenu = useMemo(
        () => filteredMenuItems.find((menu) => menu.link === router.pathname),
        [router.pathname, filteredMenuItems]
    );

    const sidebarClasses = classNames(
        'fixed left-0 top-0 h-screen flex flex-col border-r transition-all duration-200 bg-white border-blue-100 shadow-md',
        {
            'w-56': !toggleCollapse,
            'w-14': toggleCollapse,
        }
    );

    const overlayClasses = classNames(
        'fixed inset-0 bg-black bg-opacity-30 transition-opacity duration-200 z-10 md:hidden',
        {
            'opacity-100 visible': !toggleCollapse && isMobile,
            'opacity-0 invisible': toggleCollapse || !isMobile,
        }
    );

    const collapseButtonClasses = classNames(
        'absolute -right-2.5 top-5 z-20 p-1 rounded-full border shadow-sm bg-white border-blue-100 hover:bg-blue-50 transition-all duration-200',
        {
            'rotate-180': toggleCollapse,
        }
    );

    const getNavItemClasses = (menu) => {
        const isActive = activeMenu?.id === menu.id;
        return classNames(
            'group relative flex items-center w-full px-2.5 py-2 rounded-lg transition-all duration-200 cursor-pointer hover:bg-blue-50',
            {
                'bg-blue-50 text-blue-600 border-r-2 border-blue-600': isActive,
                'text-gray-600': !isActive,
            }
        );
    };

    const iconClasses = classNames(
        'w-4 h-4 flex-shrink-0 transition-colors duration-200'
    );

    const labelClasses = classNames(
        'ml-2 text-xs font-medium truncate transition-all duration-200',
        {
            'opacity-0 translate-x-4 pointer-events-none': toggleCollapse,
            'opacity-100 translate-x-0': !toggleCollapse,
        }
    );

    const tooltipClasses = classNames(
        'absolute left-full ml-1.5 px-1.5 py-0.5 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20'
    );

    const handleMouseEnter = () => {
        if (!isMobile) {
            setIsCollapsible(true);
        }
    };

    const handleMouseLeave = () => {
        if (!isMobile) {
            setIsCollapsible(false);
        }
    };

    const handleToggle = () => {
        const newCollapseState = !toggleCollapse;
        setToggleCollapse(newCollapseState);
        if (onToggle) {
            onToggle(newCollapseState);
        }
    };

    const handleOverlayClick = () => {
        if (isMobile) {
            setToggleCollapse(true);
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (!user) {
        return (
            <div className="fixed left-0 top-0 w-56 h-screen bg-white border-r border-blue-100 flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
        );
    }

    return (
        <>
            <div className={overlayClasses} onClick={handleOverlayClick} />
            <aside
                className={sidebarClasses}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="relative p-3 border-b border-blue-50">
                    <div
                        className={classNames('flex items-center transition-all duration-200', {
                            'justify-center': toggleCollapse,
                            'justify-start': !toggleCollapse,
                        })}
                    >
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-xs">L</span>
                        </div>
                        <div
                            className={classNames('ml-2 transition-all duration-200 overflow-hidden', {
                                'w-0 opacity-0': toggleCollapse,
                                'w-auto opacity-100': !toggleCollapse,
                            })}
                        >
                            <span className="text-base font-semibold text-gray-900">Dashboard</span>
                            <p className="text-xs text-gray-500">Management Panel</p>
                        </div>
                    </div>
                    {(isCollapsible || isMobile) && (
                        <button
                            className={collapseButtonClasses}
                            onClick={handleToggle}
                            aria-label={toggleCollapse ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            <ChevronLeft className="w-3 h-3 text-gray-600" />
                        </button>
                    )}
                </div>
                <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {filteredMenuItems.length === 0 ? (
                        <div className="flex items-center justify-center h-24">
                            <p className="text-gray-500 text-xs text-center">
                                {toggleCollapse ? '🚫' : 'No permissions available'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredMenuItems.map((menu) => {
                                const Icon = menu.icon;
                                const isActive = activeMenu?.id === menu.id;
                                return (
                                    <div key={menu.id} className="relative">
                                        <Link href={menu.link}>
                                            <a
                                                className={getNavItemClasses(menu)}
                                                onClick={() => isMobile && setToggleCollapse(true)}
                                            >
                                                <Icon className={iconClasses} />
                                                <span className={labelClasses}>{menu.label}</span>
                                                {isActive && !toggleCollapse && (
                                                    <div className="absolute right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                                )}
                                                {toggleCollapse && (
                                                    <div className={tooltipClasses}>
                                                        {menu.label}
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 w-1.5 h-1.5 bg-gray-800 rotate-45" />
                                                    </div>
                                                )}
                                            </a>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </nav>
                <div className="p-3 border-t border-blue-50 bg-blue-50">
                    <div
                        className={classNames('flex items-center transition-all duration-200', {
                            'justify-center': toggleCollapse,
                            'justify-start': !toggleCollapse,
                        })}
                    >
                        <div className="relative">
                            <div className="w-7 h-7 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white text-xs font-medium">
                                    {user?.name?.[0]?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            {user?.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full" />
                            )}
                        </div>
                        <div
                            className={classNames('ml-2 min-w-0 flex-1 transition-all duration-200', {
                                'opacity-0 w-0 overflow-hidden': toggleCollapse,
                                'opacity-100 w-auto': !toggleCollapse,
                            })}
                        >
                            <p className="text-xs font-medium text-gray-900 truncate">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user?.role || 'No role'}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                                {user?.email || 'user@example.com'}
                            </p>
                            <button
                                onClick={handleLogout}
                                className="mt-1 text-xs text-red-600 hover:text-red-800 transition-colors duration-200"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;