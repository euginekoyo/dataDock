import Link from 'next/link';
import Sidebar from '../components/sidebar/Sidebar';
import Switcher from '../hooks/Switcher';

import { BsSlack } from 'react-icons/bs';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-nowrap">
            <Sidebar />
            <div className="flex flex-col w-full">
                <div className="bg-gray-100 dark:bg-gray-800 flex items-center gap-2 justify-end px-4 py-2">

                    <Switcher />
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800">
                    {children}{' '}
                </div>
            </div>
        </div>
    );
};

export default Layout;