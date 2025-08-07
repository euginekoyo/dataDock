import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/roles';
import { HomeIcon, UsersIcon, FolderIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { ArticleIcon } from './icons';
import Link from 'next/link';
import classNames from 'classnames';

const menuItems = [
    {
        id: 0,
        label: 'Home',
        icon: HomeIcon,
        link: '/',
        permission: 'view_dashboard',
    },
    {
        id: 1,
        label: 'User Management',
        icon: UsersIcon,
        link: '/dashboard',
        permission: 'manage_users',
    },
    {
        id: 2,
        label: 'Template Configuration',
        icon: ArticleIcon,
        link: '/templates',
        permission: 'view_templates',
    },
    {
        id: 3,
        label: 'Libraries',
        icon: FolderIcon,
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
        'fixed left-0 top-0 h-screen flex flex-col border-r transition-all duration-300 ease-in-out z-40',
        'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
        'shadow-lg dark:shadow-gray-900/20',
        {
            'w-64': !toggleCollapse,
            'w-16': toggleCollapse,
        }
    );

    const overlayClasses = classNames(
        'fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-30 md:hidden',
        {
            'opacity-100 visible': !toggleCollapse && isMobile,
            'opacity-0 invisible': toggleCollapse || !isMobile,
        }
    );

    const collapseButtonClasses = classNames(
        'absolute -right-3 top-6 z-50 p-1.5 rounded-full border shadow-md',
        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600',
        'hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        {
            'rotate-180': toggleCollapse,
        }
    );

    const getNavItemClasses = (menu) => {
        const isActive = activeMenu?.id === menu.id;
        return classNames(
            'group relative flex items-center w-full px-3 py-3 rounded-lg',
            'transition-all duration-200 ease-in-out cursor-pointer',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900',
            {
                'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600': isActive,
                'text-gray-700 dark:text-gray-300': !isActive,
            }
        );
    };

    const iconClasses = classNames(
        'w-5 h-5 flex-shrink-0 transition-colors duration-200'
    );

    const labelClasses = classNames(
        'ml-3 text-sm font-medium truncate transition-all duration-200',
        {
            'opacity-0 translate-x-4 pointer-events-none': toggleCollapse,
            'opacity-100 translate-x-0': !toggleCollapse,
        }
    );

    const tooltipClasses = classNames(
        'absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none',
        'whitespace-nowrap z-50 transform translate-x-2 group-hover:translate-x-0'
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
            <div className="fixed left-0 top-0 w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Loading...</span>
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
                <div className="relative p-4 border-b border-gray-100 dark:border-gray-800">
                    <div
                        className={classNames('flex items-center transition-all duration-300', {
                            'justify-center': toggleCollapse,
                            'justify-start': !toggleCollapse,
                        })}
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-sm">L</span>
                        </div>
                        <div
                            className={classNames('ml-3 transition-all duration-300 overflow-hidden', {
                                'w-0 opacity-0': toggleCollapse,
                                'w-auto opacity-100': !toggleCollapse,
                            })}
                        >
              <span className="text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                Dashboard
              </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                Management Panel
                            </p>
                        </div>
                    </div>
                    {(isCollapsible || isMobile) && (
                        <button
                            className={collapseButtonClasses}
                            onClick={handleToggle}
                            aria-label={toggleCollapse ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                    )}
                </div>
                <nav className="flex-1 px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                    {filteredMenuItems.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
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
                                                    <div className="absolute right-2 w-2 h-2 bg-blue-600 rounded-full" />
                                                )}
                                                {toggleCollapse && (
                                                    <div className={tooltipClasses}>
                                                        {menu.label}
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
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
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div
                        className={classNames('flex items-center transition-all duration-300', {
                            'justify-center': toggleCollapse,
                            'justify-start': !toggleCollapse,
                        })}
                    >
                        <div className="relative">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-medium">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
                            </div>
                            {user?.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                            )}
                        </div>
                        <div
                            className={classNames('ml-3 min-w-0 flex-1 transition-all duration-300', {
                                'opacity-0 w-0 overflow-hidden': toggleCollapse,
                                'opacity-100 w-auto': !toggleCollapse,
                            })}
                        >
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user?.role || 'No role'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                {user?.email || 'user@example.com'}
                            </p>
                            <button
                                onClick={handleLogout}
                                className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200 font-medium"
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