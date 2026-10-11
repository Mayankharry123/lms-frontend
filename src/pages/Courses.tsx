/**
 * @file Courses.tsx
 * @description Courses listing and management page.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React from 'react';

const Courses: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
          <p className="mt-2 text-gray-600">
            Explore our comprehensive course catalog.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Course Cards */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-gradient-to-r from-orange-400 to-orange-500"></div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">React Fundamentals</h3>
              <p className="text-gray-600 mb-4">
                Learn the basics of React development with hands-on projects.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">12 hours</span>
                <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors">
                  Enroll
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">TypeScript Mastery</h3>
              <p className="text-gray-600 mb-4">
                Master TypeScript for scalable JavaScript applications.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">16 hours</span>
                <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors">
                  Enroll
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-gradient-to-r from-green-400 to-green-600"></div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Node.js Backend</h3>
              <p className="text-gray-600 mb-4">
                Build robust backend applications with Node.js.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">20 hours</span>
                <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors">
                  Enroll
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Courses;
