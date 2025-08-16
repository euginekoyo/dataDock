import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/roles';
import { Briefcase, ChevronLeft, Clock, FileText, Home, Loader2, LogOut, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import classNames from 'classnames';

const menuItems = [
    { id: 0, label: 'Dashboard', icon: Home, link: '/', permission: 'view_dashboard' },
    { id: 1, label: 'User Management', icon: Users, link: '/dashboard', permission: 'manage_users' },
    { id: 2, label: 'Template Configuration', icon: FileText, link: '/templates', permission: 'view_templates' },
    { id: 3, label: 'Collaboration Settings', icon: Settings, link: '/collaborate', permission: 'Collaboration_Settings' },
    { id: 4, label: 'Create Jobs', icon: Briefcase, link: '/configuration', permission: 'Create_Jobs' },
    { id: 5, label: 'Pending Jobs', icon: Clock, link: '/imports', permission: 'Pending_Jobs' },
];

const PageLoader = ({ isVisible, message = 'Signing out...' }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-xs text-gray-200 mt-3 font-medium">{message}</p>
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

    useEffect(() => {
        const checkScreenSize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile && !toggleCollapse) {
                setToggleCollapse(true);
                if (onToggle) onToggle(true);
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [onToggle, toggleCollapse]);

    useEffect(() => {
        const filterMenuItems = async () => {
            if (!user) {
                setFilteredMenuItems([]);
                return;
            }
            let redirectTo = null;

            // Precompute all permission checks
            const permissionChecks = await Promise.all(
                menuItems.map(async (item) => ({
                    item,
                    result: await hasPermission(user.role, item.permission),
                }))
            );

            // Filter items the user has access to
            const filtered = permissionChecks
                .filter(({ result }) => result.hasPerm)
                .map(({ item }) => item);

            // Find the first accessible item for redirection if 403 is encountered
            if (filtered.length === 0) {
                const firstAccessible = permissionChecks.find(({ result }) => result.hasPerm);
                if (firstAccessible) {
                    redirectTo = firstAccessible.item.link;
                } else {
                    redirectTo = '/'; // Fallback to Dashboard if no permissions
                }
            }

            setFilteredMenuItems(filtered);
            if (redirectTo && router.pathname !== redirectTo) {
                console.log(`Redirecting to ${redirectTo} due to permission denial`);
                router.push(redirectTo).catch((err) => console.error('Redirection failed:', err));
            }
        };

        filterMenuItems().catch((error) => console.error('Error filtering menu items:', error));
    }, [user, router]);

    const activeMenu = useMemo(
        () => filteredMenuItems.find((menu) => menu.link === router.pathname),
        [router.pathname, filteredMenuItems]
    );

    const sidebarClasses = classNames(
        'fixed left-0 top-0 h-screen flex flex-col transition-all duration-200 bg-gray-50 border-r border-gray-100 shadow-sm z-[-1]',
        { 'w-56': !toggleCollapse, 'w-14': toggleCollapse }
    );

    const overlayClasses = classNames(
        'fixed inset-0 bg-black bg-opacity-30 transition-all duration-200 z-5 md:hidden',
        { 'opacity-100 visible': !toggleCollapse && isMobile, 'opacity-0 invisible': toggleCollapse || !isMobile }
    );

    const collapseButtonClasses = classNames(
        'absolute -right-3 top-4 z-15 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 hover:border-gray-300 transition-all duration-200',
        { 'rotate-180': toggleCollapse }
    );

    const getNavItemClasses = (menu) => {
        const isActive = activeMenu?.id === menu.id;
        return classNames(
            'group relative flex items-center w-full px-3 py-2 rounded-md transition-all duration-200 cursor-pointer hover:bg-blue-50',
            { 'bg-blue-600 text-white hover:bg-blue-700': isActive, 'text-gray-600 hover:text-gray-800': !isActive }
        );
    };

    const iconClasses = classNames('h-3 w-3 flex-shrink-0');

    const labelClasses = classNames(
        'ml-2 text-xs font-medium truncate transition-all duration-200',
        { 'opacity-0 translate-x-4 pointer-events-none': toggleCollapse, 'opacity-100 translate-x-0': !toggleCollapse }
    );

    const tooltipClasses = classNames(
        'absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-20'
    );

    const handleMouseEnter = () => {
        if (!isMobile) setIsCollapsible(true);
    };

    const handleMouseLeave = () => {
        if (!isMobile) setIsCollapsible(false);
    };

    const handleToggle = () => {
        const newCollapseState = !toggleCollapse;
        setToggleCollapse(newCollapseState);
        if (onToggle) onToggle(newCollapseState);
    };

    const handleOverlayClick = () => {
        if (isMobile) setToggleCollapse(true);
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
            await logout();
            // router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            setIsLoggingOut(false);
        }
    };

    if (!user) {
        return (
            <div className="fixed left-0 top-0 w-56 h-screen bg-gray-50 border-r border-gray-100 flex items-center justify-center shadow-sm">
                <div className="text-center">
                    <div className="w-8 h-8 mx-auto border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                    <p className="text-xs text-gray-600 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <PageLoader isVisible={isLoggingOut} message="Signing out..." />

            <div className={overlayClasses} onClick={handleOverlayClick} />

            <aside className={sidebarClasses} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 bg-white">
                    <div className={classNames('flex items-center', { 'justify-center': toggleCollapse, 'justify-start': !toggleCollapse })}>
                        <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                            <span className="text-white text-sm font-bold">L</span>
                        </div>
                        <div className={classNames('ml-2 transition-all duration-200', { 'w-0 opacity-0': toggleCollapse, 'w-auto opacity-100': !toggleCollapse })}>
                            <h1 className="text-sm font-semibold text-gray-800">Dashboard</h1>
                            <p className="text-xs text-gray-500">Management Panel</p>
                        </div>
                    </div>
                    {(isCollapsible || isMobile) && (
                        <button className={collapseButtonClasses} onClick={handleToggle} aria-label={toggleCollapse ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!toggleCollapse}>
                            <ChevronLeft className="h-3 w-3 text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                    {filteredMenuItems.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-center">
                                {toggleCollapse ? (
                                    <p className="text-lg">🔒</p>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-lg">🚫</p>
                                        <p className="text-xs text-gray-500">No permissions</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredMenuItems.map((menu) => {
                                const Icon = menu.icon;
                                const isActive = activeMenu?.id === menu.id;
                                return (
                                    <div key={menu.id} className="relative">
                                        <Link href={menu.link}>
                                            <a className={getNavItemClasses(menu)} onClick={() => isMobile && setToggleCollapse(true)}>
                                                <Icon className={iconClasses} />
                                                <span className={labelClasses}>{menu.label}</span>
                                                {isActive && !toggleCollapse && <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full" />}
                                                {toggleCollapse && <div className={tooltipClasses}>{menu.label}</div>}
                                            </a>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <div className={classNames('flex items-center', { 'justify-center': toggleCollapse, 'justify-start': !toggleCollapse })}>
                        <div className="relative">
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                            </div>
                            {user?.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full" />}
                        </div>
                        <div className={classNames('ml-2 min-w-0 flex-1', { 'opacity-0 w-0 overflow-hidden': toggleCollapse, 'opacity-100 w-auto': !toggleCollapse })}>
                            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-gray-600 truncate">{user?.role || 'No role'}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="mt-1 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all duration-200 disabled:opacity-50"
                            >
                                {isLoggingOut ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
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