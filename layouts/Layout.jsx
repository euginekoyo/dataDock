import Link from 'next/link';
import { useState, useEffect } from 'react';
import Sidebar from '../components/sidebar/Sidebar';
import Switcher from '../hooks/Switcher';

import { BsSlack } from 'react-icons/bs';

const Layout = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect screen size changes
    useEffect(() => {
        const checkScreenSize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Auto-collapse sidebar on mobile
            if (mobile) {
                setSidebarCollapsed(true);
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Listen for sidebar collapse state changes
    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar onToggle={handleSidebarToggle} />

            {/* Main content area with dynamic margin */}
            <div
                className={`min-h-screen transition-all duration-300 ease-in-out ${
                    isMobile
                        ? 'ml-0' // No margin on mobile - sidebar overlays
                        : sidebarCollapsed
                            ? 'ml-16' // Collapsed sidebar width
                            : 'ml-64' // Full sidebar width
                }`}
            >
                {/* Top header bar */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* Mobile menu button */}
                            <button
                                className={`md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                    isMobile ? 'block' : 'hidden'
                                }`}
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                aria-label="Toggle sidebar"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            {/* Page title or breadcrumbs can go here */}
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Dashboard
                            </h1>
                        </div>

                        {/* Right side header items */}
                        <div className="flex items-center space-x-3">
                            {/* Notifications or other header items */}
                            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5c-5.5 0-10-4.5-10-10s4.5-10 10-10 10 4.5 10 10h-5z" />
                                </svg>
                            </button>

                            <Switcher />
                        </div>
                    </div>
                </header>

                {/* Main content */}
                <main className="flex-1 p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;