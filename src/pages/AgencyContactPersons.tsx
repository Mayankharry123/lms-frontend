/**
 * @file AgencyContactPersons.tsx
 * @description Contact persons for a selected agency master record.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, MapPin, Flag, Calendar } from 'lucide-react';
import { ROUTES } from '../constants';
import { getAgency } from '../services/AgencyMaster';
import { getContactPersonsByAgency, type ContactPerson } from '../services/AgencyContactPersons';
import { Button } from '../components/ui';
import Breadcrumb from '../components/ui/Breadcrumb';
import { NotificationPopup } from '../components/ui';

const AgencyContactPersons: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const agencyId = params.id;

  const [agencyName, setAgencyName] = useState<string>('');
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!agencyId) return;
      setLoading(true);
      setError('');
      try {
        const agency = await getAgency(String(agencyId));
        if (!mounted) return;
        setAgencyName(String(agency.name || ''));

        const res = await getContactPersonsByAgency(String(agencyId));
        if (!mounted) return;
        setContacts(res.data || []);
      } catch (err: any) {
        if (mounted) {
          const errMsg = err?.message || 'Failed to load contact persons';
          setError(errMsg);
          setContacts([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [agencyId]);

  const handleBack = () => {
    navigate(ROUTES.AGENCY_MASTER);
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'text-red-500';
    if (priority === 'Medium') return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 w-full">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
            <p className="mt-4 text-gray-600">Loading contact persons...</p>
          </div>
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 p-6 w-full">

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center flex flex-col items-center justify-center">
          <p className="text-red-700 font-medium text-lg">No contact persons found</p>
          <p className="text-red-600 text-sm mt-2">This agency has no contact persons associated with it.</p>
          <Button
            onClick={handleBack}
            variant="primary"
            className="mt-4"
          >
            Back to Agencies
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <NotificationPopup
        isOpen={!!error}
        onClose={() => setError('')}
        message={error}
        type="error"
      />

      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <Breadcrumb
          items={[
            { label: 'Agency Master', path: ROUTES.AGENCY_MASTER },
            { label: `${agencyName}`, isActive: true }
          ]}
        />
        <Button
          variant="primary"
          className="font-semibold px-3 py-1 rounded-md flex items-center text-sm"
          onClick={handleBack}
        >
          <ChevronLeft size={16} className="mr-1" />
          Go Back
        </Button>
      </div>

      {/* Contact List */}
      <div className="space-y-6">
        {contacts.map((contact, idx) => (
          <div key={contact.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 flex flex-col space-y-6">
              {/* Contact Overview Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{contact.name || '-'}</h2>
                    <p className="text-sm text-gray-600 mt-1">Contact #{idx + 1}</p>
                  </div>
                  {contact.priority && (
                    <div className="flex items-center gap-2">
                      <Flag size={18} className={getPriorityColor(contact.priority)} />
                      <span className="text-base font-medium text-gray-900">{contact.priority}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {contact.designation && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Designation</label>
                      <p className="text-base font-semibold text-gray-900 mt-2">{contact.designation}</p>
                    </div>
                  )}
                  {contact.department && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Department</label>
                      <p className="text-base font-semibold text-gray-900 mt-2">{contact.department}</p>
                    </div>
                  )}
                  {contact.brand && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Brand</label>
                      <p className="text-base font-semibold text-gray-900 mt-2">{contact.brand}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email */}
                  <div>
                    <div className="flex items-center text-sm font-medium text-gray-600 mb-2">
                      <Mail size={16} className="mr-2" />
                      Email
                    </div>
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="text-base font-medium text-orange-500 hover:text-orange-500 underline">
                        {contact.email}
                      </a>
                    ) : (
                      <p className="text-base font-medium text-gray-500">Not provided</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <div className="flex items-center text-sm font-medium text-gray-600 mb-2">
                      <Phone size={16} className="mr-2" />
                      Phone Number
                    </div>
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="text-base font-medium text-orange-500 hover:text-orange-500 underline">
                        {contact.phone}
                      </a>
                    ) : (
                      <span className="text-base font-medium text-gray-500">Not provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Information Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center mb-6">
                  <MapPin size={20} className="mr-2 text-orange-500" />
                  <h2 className="text-xl font-semibold text-gray-900">Location Information</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {contact.country && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">Country</label>
                      <p className="text-base font-medium text-gray-900">{contact.country}</p>
                    </div>
                  )}
                  {contact.state && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">State</label>
                      <p className="text-base font-medium text-gray-900">{contact.state}</p>
                    </div>
                  )}
                  {contact.city && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">City</label>
                      <p className="text-base font-medium text-gray-900">{contact.city}</p>
                    </div>
                  )}
                  {contact.zone && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">Zone</label>
                      <p className="text-base font-medium text-gray-900">{contact.zone}</p>
                    </div>
                  )}
                  {contact.postalCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">Postal Code</label>
                      <p className="text-base font-medium text-gray-900">{contact.postalCode}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information Card */}
              {contact.comment && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-auto">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Comments</h2>
                  <div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-gray-700 leading-relaxed">{contact.comment}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1 flex flex-col space-y-6">
              {/* Status Info Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Status</h3>
                <div className="space-y-4">
                  {contact.leadStatus && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">Lead Status</label>
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                        <p className="text-base font-medium text-gray-900">{contact.leadStatus}</p>
                      </div>
                    </div>
                  )}
                  {contact.callStatus && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">Call Status</label>
                      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                        <p className="text-base font-medium text-gray-900">{contact.callStatus}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Info Card */}
              {contact.assignedUser && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Assignment</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">Assigned User</label>
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-3 border border-orange-200">
                        <p className="text-base font-medium text-gray-900">{contact.assignedUser}</p>
                        {contact.assignedUserEmail && (
                          <p className="text-xs text-gray-600 mt-1">{contact.assignedUserEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Date & Time Info Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
                <div className="space-y-4">
                  {contact.createdAt && (
                    <div>
                      <div className="flex items-center text-sm font-medium text-gray-600 mb-2">
                        <Calendar size={16} className="mr-2" />
                        Created
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <p className="text-base font-medium text-gray-900">{formatDate(contact.createdAt)}</p>
                      </div>
                    </div>
                  )}
                  {contact.updatedAt && (
                    <div>
                      <div className="flex items-center text-sm font-medium text-gray-600 mb-2">
                        <Calendar size={16} className="mr-2" />
                        Updated
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <p className="text-base font-medium text-gray-900">{formatDate(contact.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgencyContactPersons;
