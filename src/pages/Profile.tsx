/**
 * @file Profile.tsx
 * @description Authenticated user profile view and settings.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useEffect, useState } from 'react';
import { getUserProfile } from '../services/Profile';
import axios from '../services/http';

function formatAssignedValues(value: unknown, nameKeys: string[]): string {
  if (!Array.isArray(value)) {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : 'N/A';
  }

  const names = value
    .map((item: unknown) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item);
      if (!item || typeof item !== 'object') return '';
      const record = item as Record<string, unknown>;
      const name = nameKeys
        .map((key) => record[key])
        .find((candidate) => typeof candidate === 'string' && candidate.trim());
      return typeof name === 'string' ? name.trim() : '';
    })
    .filter(Boolean);

  return names.length ? names.join(', ') : 'N/A';
}


const Profile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      setLoading(true);
      setError(false);
      try {
        // Get logged-in user info from /auth/me
        const meResp = await axios.get('/auth/me');
        const userData = meResp?.data?.data;
        const userId = userData?.id;
        if (!userId) throw new Error('No user id');
        try {
          // Try to get user profile from /users/{id}
          const userProfile = await getUserProfile(Number(userId));
          if (isMounted) {
            setProfile({
              ...userData,
              ...userProfile,
              organisations: userProfile.organisations ?? userData.organisations,
              departments: userProfile.departments ?? userData.departments,
              zone_name: userProfile.zone_name ?? userData.zone_name,
            });
          }
        } catch {
          // If /users/{id} fails, fallback to /auth/me data
          if (isMounted) setProfile(userData);
        }
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  // UI states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-500 text-lg font-semibold">Loading...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-red-500 text-lg font-semibold">Unable to load profile.</span>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-500 text-lg font-semibold">Profile not available</span>
      </div>
    );
  }

  // Format date string or human readable
  function formatDate(dateStr?: string, humanStr?: string) {
    if (humanStr) return humanStr;
    if (!dateStr) return '';
    // Remove trailing AM/PM if present, as it may be invalid with 24-hour time
    const cleanedDateStr = dateStr.replace(/\s+(AM|PM)$/i, '');
    const d = new Date(cleanedDateStr);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleString();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-6">
              <div className="sm:w-24 squire bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center overflow-hidden border-3 border-blue-200 custom-shadow">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-blue-600">
                    {(profile.full_name || profile.name || '?')[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg sm:text-3xl font-bold text-gray-900">
                  {profile.full_name || profile.name}
                </h2>
                <p className="text-gray-500 text-sm mb-2">{profile.email}</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${profile.status === '1' || profile.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${profile.status === '1' || profile.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {profile.status === '1' || profile.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {profile.is_admin && (
                    <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Account Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Full Name */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Full Name</label>
                <p className="text-base font-medium text-gray-900">{(profile.full_name || profile.name || 'N/A') + (profile.id ? ` #${profile.id}` : '')}</p>
              </div>

              {/* Email */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email Address</label>
                <p className="text-base font-medium text-gray-900 break-all">{profile.email || 'N/A'}</p>
              </div>

              {/* Phone */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone</label>
                <p className="text-base font-medium text-gray-900">{profile.phone || 'Not Available'}</p>
              </div>

              {/* Last Login */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Last Login</label>
                <p className="text-base font-medium text-gray-900">{formatDate(profile.last_login_at) || 'Never'}</p>
              </div>

              {/* Account Created */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Account Created</label>
                <p className="text-base font-medium text-gray-900">{formatDate(profile.created_at, profile.created_at_human) || 'N/A'}</p>
              </div>

              {/* Last Updated */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Last Updated</label>
                <p className="text-base font-medium text-gray-900">{formatDate(profile.updated_at, profile.updated_at_human) || 'N/A'}</p>
              </div>

              {/* Organisations */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Organisations</label>
                <p className="text-base font-medium text-gray-900">
                  {formatAssignedValues(profile.organisations, ['name', 'organisation_name'])}
                </p>
              </div>

              {/* Departments */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Departments</label>
                <p className="text-base font-medium text-gray-900">
                  {formatAssignedValues(profile.departments, ['departments_name', 'department_name', 'name'])}
                </p>
              </div>

              {/* Zone */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Zone</label>
                <p className="text-base font-medium text-gray-900">
                  {formatAssignedValues(profile.zone_name ?? profile.zone, ['name', 'zone_name'])}
                </p>
              </div>
            </div>
            {/* Roles Section */}
            <div className="mt-10">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Roles & Permissions</h2>
              {Array.isArray(profile.roles) && profile.roles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.roles.map((role: any) => (
                    <div key={role.id} className="bg-white border-l-4 border-l-orange-500 border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all hover:border-l-orange-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-base mb-2">{role.display_name || role.name}</h3>
                          {role.description && (
                            <p className="text-gray-600 text-sm leading-relaxed">{role.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-500 font-medium">No roles assigned.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;