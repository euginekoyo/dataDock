import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/roles';
import { Home, Users, Folder, FileText, ChevronLeft, LogOut, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import classNames from 'classnames';
import {ConfigIcon, HomeIcon, UsersIcon} from "./icons";

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
        label: 'Collaboration Settings',
        icon: UsersIcon,
        link: '/collaborate',
        permission: 'Collaboration_Settings',
    },
    {
        id: 4,
        label: 'Create Jobs',
        icon: ConfigIcon,
        link: '/configuration',
        permission: 'Create_Jobs',
    },
    {
        id: 5,
        label: 'Pending Jobs',
        icon: HomeIcon,
        link: '/imports',
        permission: 'Pending_Jobs',
    },
];

// Page Loader Component
const PageLoader = ({ isVisible, message = "Signing out..." }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-96 h-96 -top-48 -left-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute w-64 h-64 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-500/10 rounded-full blur-2xl animate-ping"></div>
            </div>

            {/* Main loader content */}
            <div className="relative z-10 text-center">
                <div className="mb-8 relative">
                    {/* Outer rotating ring */}
                    <div className="w-24 h-24 mx-auto border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>

                    {/* Inner pulsing circle */}
                    <div className="absolute inset-0 w-16 h-16 m-auto bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse opacity-80"></div>

                    {/* Center icon */}
                    <div className="absolute inset-0 w-8 h-8 m-auto text-white">
                        <Sparkles className="w-full h-full animate-bounce" />
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">
                    {message}
                </h3>
                <p className="text-purple-200 text-sm animate-fade-in-up">
                    Please wait while we process your request
                </p>

                {/* Progress dots */}
                <div className="flex justify-center space-x-2 mt-6">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
                </div>
            </div>
        </div>
    );
};

const Sidebar = ({ onToggle }) => {
    const { user, logout } = useAuth();
    const [toggleCollapse, setToggleCollapse] = useState(false);
    const [isCollapsible, setIsCollapsible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [filteredMenuItems, setFilteredMenuItems] = useState([]);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
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
        'fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 bg-gradient-to-b from-white via-gray-50 to-white border-r border-gray-200 shadow-xl backdrop-blur-sm z-30',
        {
            'w-64': !toggleCollapse,
            'w-16': toggleCollapse,
        }
    );

    const overlayClasses = classNames(
        'fixed inset-0 bg-black bg-opacity-40 transition-all duration-300 z-20 md:hidden backdrop-blur-sm',
        {
            'opacity-100 visible': !toggleCollapse && isMobile,
            'opacity-0 invisible': toggleCollapse || !isMobile,
        }
    );

    const collapseButtonClasses = classNames(
        'absolute -right-3 top-6 z-40 p-2 rounded-full border-2 shadow-lg bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 hover:scale-110 group',
        {
            'rotate-180': toggleCollapse,
        }
    );

    const getNavItemClasses = (menu) => {
        const isActive = activeMenu?.id === menu.id;
        return classNames(
            'group relative flex items-center w-full px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-sm hover:scale-[1.02] transform',
            {
                'text-black shadow-lg scale-[1.02]': isActive,
                'text-gray-700 hover:text-gray-900': !isActive,
            }
        );
    };

    const iconClasses = classNames(
        'w-5 h-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110'
    );

    const labelClasses = classNames(
        'ml-3 text-sm font-medium truncate transition-all duration-300',
        {
            'opacity-0 translate-x-8 pointer-events-none': toggleCollapse,
            'opacity-100 translate-x-0': !toggleCollapse,
        }
    );

    const tooltipClasses = classNames(
        'absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-xl',
        'before:content-[""] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:-translate-x-1 before:w-2 before:h-2 before:bg-gray-900 before:rotate-45'
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

    const handleLogout = async () => {
        setIsLoggingOut(true);

        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            setIsLoggingOut(false);
        }
    };

    if (!user) {
        return (
            <div className="fixed left-0 top-0 w-64 h-screen bg-gradient-to-b from-white via-gray-50 to-white border-r border-gray-200 flex items-center justify-center shadow-xl">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4">
                        <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded-full w-3/4 mx-auto animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <PageLoader isVisible={isLoggingOut} message="Signing out..." />

            <div className={overlayClasses} onClick={handleOverlayClick} />

            <aside
                className={sidebarClasses}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Header */}
                <div className="relative p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div
                        className={classNames('flex items-center transition-all duration-300', {
                            'justify-center': toggleCollapse,
                            'justify-start': !toggleCollapse,
                        })}
                    >

                        <div
                            className={classNames('ml-4 transition-all duration-300 overflow-hidden', {
                                'w-0 opacity-0': toggleCollapse,
                                'w-auto opacity-100': !toggleCollapse,
                            })}
                        >
                            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                Dashboard
                            </h1>
                            <p className="text-sm text-gray-500 font-medium">Management Panel</p>
                        </div>
                    </div>

                    {(isCollapsible || isMobile) && (
                        <button
                            className={collapseButtonClasses}
                            onClick={handleToggle}
                            aria-label={toggleCollapse ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-600 group-hover:text-gray-800 transition-colors duration-300" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {filteredMenuItems.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-center">
                                {toggleCollapse ? (
                                    <div className="text-2xl">🔒</div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-4xl opacity-50">🚫</div>
                                        <p className="text-gray-500 text-sm font-medium">No permissions available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
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
                                                    <div className="absolute right-4 w-2 h-2  rounded-full shadow-sm animate-pulse" />
                                                )}

                                                {toggleCollapse && (
                                                    <div className={tooltipClasses}>
                                                        {menu.label}
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

                {/* User Profile */}
                <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
                    <div
                        className={classNames('flex items-center transition-all duration-300', {
                            'justify-center': toggleCollapse,
                            'justify-start': !toggleCollapse,
                        })}
                    >
                        <div className="relative group">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                                <span className="text-white text-sm font-bold">
                                    {user?.name?.[0]?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            {user?.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm" />
                            )}
                        </div>

                        <div
                            className={classNames('ml-3 min-w-0 flex-1 transition-all duration-300', {
                                'opacity-0 w-0 overflow-hidden': toggleCollapse,
                                'opacity-100 w-auto': !toggleCollapse,
                            })}
                        >
                            <p className="text-sm font-semibold text-gray-900 truncate">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-600 truncate font-medium">
                                {user?.role || 'No role'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user?.email || 'user@example.com'}
                            </p>

                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 transition-all duration-300 hover:bg-red-50 px-2 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {isLoggingOut ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <LogOut className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                                )}
                                {isLoggingOut ? 'Signing out...' : 'Sign out'}
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;