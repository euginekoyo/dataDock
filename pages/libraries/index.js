import React from 'react';
import Layout from '../../layouts/Layout';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

const librariesList = [
  {
    id: 1,
    template_name: 'CSV Libraries',
    template_description:
        'Prepare the CSVs and data then get it validated by creating a DataDock template before importing.',
    link: '/csvlibraries',
  },
  {
    id: 2,
    template_name: 'Template Libraries',
    template_description:
        'List of popular template libraries that you can use to prepare your CSV file.',
    link: '/templatelibraries',
  },
  {
    id: 3,
    template_name: 'Regex Libraries',
    template_description:
        'List of popular regex libraries that you can use to prepare your CSV file.',
    link: '/regexlibraries',
  },
];

const Index = () => {
  return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  DataFusion Libraries
                </h1>
              </div>
              <p className="text-gray-600 text-sm">Explore our collection of libraries for CSV preparation</p>
            </div>

            {/* Libraries Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {librariesList.map((obj, idx) => (
                  <div
                      className="bg-white rounded-xl shadow-md border border-blue-100 p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                      key={idx}
                  >
                    <div className="flex flex-col">
                      <Link href={obj.link}>
                        <h2 className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                          {obj.template_name}
                        </h2>
                      </Link>
                      <p className="text-xs text-gray-600 mt-2">
                        {obj.template_description}
                      </p>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <Link href={obj.link}>
                        <button
                            type="button"
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs"
                        >
                          View Libraries
                        </button>
                      </Link>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
  );
};

export default Index;