
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/sidebar/Sidebar';
import Switcher from '../hooks/Switcher';
import { Menu, Bell } from 'lucide-react';

const Layout = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect screen size changes
    useEffect(() => {
        const checkScreenSize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
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
        <div className=" bg-gradient-to-br from-blue-50 via-white to-blue-50 relative z-0"> {/* Reset stacking context */}
            <Sidebar onToggle={handleSidebarToggle} />

            {/* Main content area with dynamic margin and baseline z-index */}
            <div
                className={`min-h-screen transition-all duration-200 ${
                    isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-14' : 'ml-48'
                } z-0`} // Baseline z-index
            >
                {/* Top header bar */}
                {/* Uncomment and adjust if needed */}
                {/* <header className="bg-white border-b border-blue-100 px-4 py-2.5 sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                className={`md:hidden p-1.5 rounded-lg hover:bg-blue-50 transition-colors ${
                                    isMobile ? 'block' : 'hidden'
                                }`}
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                aria-label="Toggle sidebar"
                            >
                                <Menu className="w-4 h-4 text-gray-600" />
                            </button>

                            <h1 className="text-base font-semibold text-gray-900">
                                Dashboard
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors">
                                <Bell className="w-4 h-4" />
                            </button>
                            <Switcher />
                        </div>
                    </div>
                </header> */}

                {/* Main content */}
                <main className="flex-1">
                    <div>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
