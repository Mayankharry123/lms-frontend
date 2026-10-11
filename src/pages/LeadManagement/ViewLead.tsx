/**
 * @file ViewLead.tsx
 * @description Read-only lead detail view.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, MapPin, User, Briefcase, Calendar, Flag, Building2, Globe, Hash, Building, Map, Tag, Layers, ArrowUpCircle, UserCheck } from 'lucide-react';
import { ROUTES } from '../../constants';
import { Button } from '../../components/ui';
import { fetchLeadById } from '../../services/ViewLead';
import type { Lead as ApiLead } from '../../services/ViewLead';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { IoIosArrowBack } from 'react-icons/io';


const ViewLead: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [lead, setLead] = useState<ApiLead | null>(null);

  useEffect(() => {
    const fetchLead = async () => {
      setIsLoading(true);
      const data = await fetchLeadById(id || '');
      setLead(data);
      setIsLoading(false);
    };
    if (id) fetchLead();
  }, [id]);

  const handleBack = () => {
    navigate('/lead-management/all-leads');
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 w-full">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
            <p className="mt-4 text-gray-600">Loading lead details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex-1 p-6 w-full">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-orange-500 hover:text-orange-500 font-medium mb-4"
        >
          <ChevronLeft size={20} className="mr-1" />
          Back to Leads
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium text-lg">Lead not found</p>
          <Button
            onClick={handleBack}
            variant="primary"
            className="mt-4"
          >
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'text-red-500';
    if (priority === 'Medium') return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      {/* Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Breadcrumb
          items={[{ label: 'Lead Management', path: ROUTES.LEAD_MANAGEMENT }, { label: `Lead ${lead.id}`, isActive: true }]}
        />
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            className="font-semibold px-3 py-1 rounded-md flex items-center text-sm"
            onClick={handleBack}
          >

            <IoIosArrowBack size={16} className="mr-1" />
            Go Back
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left Column - Main Info */}
        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2 space-y-4">
          {/* Lead Overview Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Lead Overview</h2>
            <div className="grid sm:grid-cols-2 2xl:grid-cols-2 gap-3">

              {/* Brand */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <Tag />
                </span>

                <div className="flex items-center flex-wrap">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Brand :  </label>
                  <p className="text-sm text-gray-600">{lead.brand?.name || '-'}</p>
                </div>
              </div>

              {/* Type */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <Layers />
                </span>

                <div className="flex items-center flex-wrap">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Type : </label>
                  <p className="text-sm text-gray-600">{lead.type}</p>
                </div>
              </div>

              {/* Status removed per request */}
              {/* Organisation */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <Building2 />
                </span>

                <div className="flex items-center flex-wrap">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Organisation : </label>
                  <p className="text-sm text-gray-600">{lead.organisation?.name || lead.organisation_name || '-'}</p>
                </div>
              </div>

              {/* Priority */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <ArrowUpCircle />
                </span>

                <div className="flex items-center flex-wrap">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Priority : </label>

                  <div className="flex items-center">
                    <Flag size={16} className={`mr-2 ${getPriorityColor(lead.priority?.name || 'Medium')}`} />
                    <span className="text-sm text-gray-600">{lead.priority?.name || 'Not Set'}</span>
                  </div>
                </div>
              </div>

              {/* Lead Status */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <UserCheck />
                </span>

                <div className="flex items-center flex-wrap">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Lead Status :</label>
                  <p className="text-sm text-gray-600">{lead.lead_status_relation?.name || lead.lead_status || '-'}</p>
                </div>
              </div>
            </div>
          </div>


          {/* Contact Information Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Name */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-xs'>
                  <User />
                </span>

                <div className="flex flex-wrap items-center gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Name :
                  </label>
                  <p className="text-sm text-gray-600">{lead.name}</p>
                </div>
              </div>

              {/* Designation */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-xs'>
                  <Briefcase />
                </span>

                <div className="flex flex-wrap items-center gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Designation :
                  </label>
                  <p className="text-sm text-gray-600">{lead.designation?.name || 'Not Set'}</p>
                </div>

              </div>


              {/* Department */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-xs'>
                  <Building2 />
                </span>

                <div className="flex flex-wrap items-center gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Department :
                  </label>
                  <p className="text-sm text-gray-800">{lead.department?.name || 'Not Set'}</p>
                </div>
              </div>

              {/* Email */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <Mail />
                </span>

                <div className="flex flex-wrap items-center gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Email :
                  </label>

                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="text-sm !text-gray-600">
                      {lead.email}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-600">Not provided</p>
                  )}
                </div>
              </div>


              {/* Phone Number */}
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <Phone />
                </span>

                <div className="flex flex-wrap items-center gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Phone Number :
                  </label>
                  {lead.mobile_number && lead.mobile_number.length > 0 ? (
                    <a href={`tel:${typeof lead.mobile_number[0] === 'string' ? lead.mobile_number[0] : lead.mobile_number[0].number}`} className="text-sm !text-gray-600">
                      {typeof lead.mobile_number[0] === 'string' ? lead.mobile_number[0] : lead.mobile_number[0].number}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-600">Not provided</span>
                  )}
                </div>
                {/* Secondary Phone */}
                {lead.mobile_number && lead.mobile_number.length > 1 && (
                  <div>
                    <div className="flex items-center text-sm font-medium text-gray-600 mb-2">
                      <Phone size={16} className="mr-2" />
                      Secondary Phone
                    </div>
                    <a href={`tel:${typeof lead.mobile_number[1] === 'string' ? lead.mobile_number[1] : lead.mobile_number[1].number}`} className="text-base font-medium text-orange-500 hover:text-orange-500 underline">
                      {typeof lead.mobile_number[1] === 'string' ? lead.mobile_number[1] : lead.mobile_number[1].number}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Location Information Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Location Information</h2>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <Globe />
                </span>

                <div className="flex items-center flex-wrap gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Country :
                  </label>
                  <p className="text-sm text-gray-800">{lead.country?.name || 'Not Set'}</p>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <MapPin />
                </span>

                <div className="flex items-center flex-wrap gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    State: </label>
                  <p className="text-sm text-gray-800">{lead.state?.name || 'Not Set'}</p>
                </div>
              </div>


              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <Building />
                </span>

                <div className="flex items-center flex-wrap gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    City :</label>
                  <p className="text-sm text-gray-800">{lead.city?.name || 'Not Set'}</p>
                </div>
              </div>


              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <Map />
                </span>

                <div className="flex items-center flex-wrap gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Zone :</label>
                  <p className="text-sm text-gray-800">{lead.zone?.name || 'Not Set'}</p>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center text-center rounded-md bg-gray-100 w-10 h-10  text-gray-800 text-sm'>
                  <Hash />
                </span>

                <div className="flex items-center flex-wrap gap-x-2">
                  <label className="flex items-center text-sm font-semibold text-gray-800 gap-3">
                    Postal Code :</label>
                  <p className="text-sm text-gray-800">{lead.postal_code || 'Not Set'}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Additional Information Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h2>
            <div className="space-y-4">
              {lead.comment && (
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-2">Comment</label>
                  <div className="bg-gray-100 rounded-lg p-3 border border-gray-200">
                    <p className="text-gray-700 leading-relaxed">{lead.comment}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="xl:col-span-1">
          {/* Assignment Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Assignment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">Organisation</label>
                <div className="bg-orange-100 rounded-lg p-3 border border-orange-200">
                  <p className="text-base font-medium text-gray-800">{lead.organisation?.name || lead.organisation_name || '-'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">Assigned User</label>
                <div className="bg-orange-100 rounded-lg p-3 border border-orange-200">
                  <p className="text-base font-medium text-gray-800">{lead.assigned_user?.name || '-'}</p>
                  <p className="text-xs text-gray-600 mt-1">{lead.assigned_user?.email || ''}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">Current Assign User ID</label>
                <div className="bg-orange-100 rounded-lg p-3 border border-orange-200">
                  <p className="text-base font-medium text-gray-800">{lead.current_assign_user}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Call Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Call Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">Call Status</label>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-base font-medium text-gray-800">{lead.call_status_relation?.name || lead.call_status || '-'}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Date & Time Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center text-sm font-medium text-gray-600 mb-2">
                  <Calendar size={16} className="mr-2" />
                  Created
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-base font-medium text-gray-800">{lead.created_at ? new Date(lead.created_at).toLocaleString() : '-'}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center text-sm font-medium text-gray-600 mb-2">
                  <Calendar size={16} className="mr-2" />
                  Updated
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-base font-medium text-gray-800">{lead.updated_at ? new Date(lead.updated_at).toLocaleString() : '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div >
  );
};

export default ViewLead;