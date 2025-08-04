import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState, useMemo } from 'react';
import { ArticleIcon, CollapsIcon, HomeIcon, ConfigIcon } from './icons';
import {
  UsersIcon,
  FolderIcon,
  RocketLaunchIcon,
  HomeIcon as HomeIconOutline,
} from '@heroicons/react/24/outline/';

const menuItems = [
  {
    id: 0,
    label: 'Home',
    icon: HomeIconOutline,
    link: '/',
  },
  {
    id: 2,
    label: 'Template Configuration',
    icon: ArticleIcon,
    link: '/templates',
  },
  {
    id: 6,
    label: 'Libraries',
    icon: FolderIcon,
    link: '/libraries',
  },
];

const Sidebar = () => {
  const [toggleCollapse, setToggleCollapse] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);

  const router = useRouter();

  const activeMenu = useMemo(
      () => menuItems.find((menu) => menu.link === router.pathname),
      [router.pathname]
  );

  // Improved class generation with better organization
  const sidebarClasses = classNames(
      // Base styles
      'min-h-screen flex flex-col border-r transition-all duration-300 ease-in-out',
      // Background and border colors
      'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
      // Width based on collapse state
      {
        'w-64': !toggleCollapse,
        'w-16': toggleCollapse,
      }
  );

  const collapseButtonClasses = classNames(
      'absolute -right-3 top-6 z-10 p-1.5 rounded-full border shadow-md',
      'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600',
      'hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200',
      {
        'rotate-180': toggleCollapse,
      }
  );

  const getNavItemClasses = (menu) => {
    const isActive = activeMenu?.id === menu.id;
    return classNames(
        'group relative flex items-center w-full px-3 py-2.5 rounded-lg',
        'transition-all duration-200 ease-in-out cursor-pointer',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        {
          'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': isActive,
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
        'opacity-0 translate-x-4': toggleCollapse,
        'opacity-100 translate-x-0': !toggleCollapse,
      }
  );

  const handleMouseEnter = () => setIsCollapsible(true);
  const handleMouseLeave = () => setIsCollapsible(false);
  const handleToggle = () => setToggleCollapse(!toggleCollapse);

  return (
      <aside
          className={sidebarClasses}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
      >
        {/* Header section */}
        <div className="relative p-4">
          {/* Logo/Brand area */}
          <div className={classNames(
              'flex items-center transition-all duration-300',
              {
                'justify-center': toggleCollapse,
                'justify-start': !toggleCollapse,
              }
          )}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            {!toggleCollapse && (
                <span className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
              Dashboard
            </span>
            )}
          </div>

          {/* Collapse button */}
          {isCollapsible && (
              <button
                  className={collapseButtonClasses}
                  onClick={handleToggle}
                  aria-label={toggleCollapse ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <CollapsIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
          )}
        </div>

        {/* Navigation section */}
        <nav className="flex-1 px-4 pb-4">
          <div className="space-y-1">
            {menuItems.map((menu) => {
              const Icon = menu.icon;
              const isActive = activeMenu?.id === menu.id;

              return (
                  <div key={menu.id} className="relative">
                    <Link href={menu.link}>
                      <a className={getNavItemClasses(menu)}>
                        <Icon className={iconClasses} />
                        <span className={labelClasses}>
                      {menu.label}
                    </span>

                        {/* Active indicator */}
                        {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                        )}

                        {/* Tooltip for collapsed state */}
                        {toggleCollapse && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                              {menu.label}
                            </div>
                        )}
                      </a>
                    </Link>
                  </div>
              );
            })}
          </div>
        </nav>

        {/* Footer section (optional) */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={classNames(
              'flex items-center transition-all duration-300',
              {
                'justify-center': toggleCollapse,
                'justify-start': !toggleCollapse,
              }
          )}>
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-300 text-xs font-medium">U</span>
            </div>
            {!toggleCollapse && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">User</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">user@example.com</p>
                </div>
            )}
          </div>
        </div>
      </aside>
  );
};

export default Sidebar;