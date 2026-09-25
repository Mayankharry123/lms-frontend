/**
 * @file EditLead.tsx
 * @description Edit existing lead details and related actions.
 * @author Sanjay Jangid <sanjay.jangid@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MasterCreateHeader } from '../../components/ui/MasterCreateHeader';
import Table, { type Column } from '../../components/ui/Table';
// import { Mail, Eye, Bold, Italic, List, ListOrdered, X } from 'lucide-react';
import LeadManagementSection from '../../components/forms/CreateLead/LeadManagementSection';
import ContactPersonsCard from '../../components/forms/CreateLead/ContactPersonsCard';
import AssignPriorityCard from '../../components/forms/CreateLead/AssignPriorityCard';
import { fetchLeadById, fetchLeadHistory } from '../../services/ViewLead';
import { getBrandLists, getAgenciesLists, getLeadTypes } from '../../services/CreateLead';

import { Button } from '../../components/ui';
import { PhoneCall } from 'lucide-react';
import { updateLead } from '../../services/AllLeads';
import SweetAlert from '../../utils/SweetAlert';
import gmailService from '../../services/gmailService';
import CommentSection from '../../components/forms/CreateLead/CommentSection';
import CollapsibleFormCard from '../../components/ui/CollapsibleFormCard';
import type { EditLeadtype } from '../../types/AllLeadtype'

const EditLead: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [lead, setLead] = useState<EditLeadtype | null>(null);
  const [selectedOption, setSelectedOption] = useState<'brand' | 'agency'>('brand');
  const [dropdownValue, setDropdownValue] = useState<string>('');
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [leadTypeNameById, setLeadTypeNameById] = useState<Record<string, string>>({});
  // const [showEmailComposer, setShowEmailComposer] = useState(false);
  // const [emailTo, setEmailTo] = useState('');
  // const [emailSubject, setEmailSubject] = useState('');
  // const [emailBody, setEmailBody] = useState('');
  // const [sendingEmail, setSendingEmail] = useState(false);
  // const [templateName, setTemplateName] = useState('');
  // const [isCodeView, setIsCodeView] = useState(false);
  // const [isFullscreen, setIsFullscreen] = useState(false);
  // const [templateNameError, setTemplateNameError] = useState('');
  // const [subjectError, setSubjectError] = useState('');
  // const [emailToError, setEmailToError] = useState('');
  // const [emailBodyError, setEmailBodyError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  // const editorRef = useRef<HTMLDivElement>(null);

  const handlePriorityChange = useCallback(({ organisation, assignTo, priority, callFeedback }: { organisation?: string; assignTo?: string; priority?: string; callFeedback?: string }) => {
    setLead(prev => prev ? {
      ...prev,
      ...(organisation !== undefined ? { organisation } : {}),
      assignTo,
      priority,
      ...(callFeedback !== undefined ? { callFeedback } : {}),
    } : null);
  }, []);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        setIsLoading(true);

        if (!id) {
          setLead(null);
          return;
        }

        const apiLead = await fetchLeadById(id);

        if (!apiLead) {
          setLead(null);
          return;
        }

        const rawLead = apiLead as any;
        const resolvedLeadTypeValue =
          rawLead?.lead_type?.id != null
            ? String(rawLead.lead_type.id)
            : (rawLead?.lead_type_id != null
              ? String(rawLead.lead_type_id)
              : String(apiLead.type || ''));

        const contact = {
          id: String(apiLead.id),
          fullName: apiLead.name || '',
          profileUrl: apiLead.profile_url || '',
          email: apiLead.email || '',
          mobileNo: Array.isArray(apiLead.mobile_number) ? (apiLead.mobile_number[0] ? (typeof apiLead.mobile_number[0] === 'string' ? apiLead.mobile_number[0] : apiLead.mobile_number[0].number) : '') : (apiLead.mobile_number || apiLead.number || apiLead.phone || ''),
          mobileNo2: Array.isArray(apiLead.mobile_number) ? (apiLead.mobile_number[1] ? (typeof apiLead.mobile_number[1] === 'string' ? apiLead.mobile_number[1] : apiLead.mobile_number[1].number) : '') : '',
          showSecondMobile: Array.isArray(apiLead.mobile_number) && apiLead.mobile_number.length > 1,
          type: resolvedLeadTypeValue,
          designation: apiLead.designation?.id ? String(apiLead.designation.id) : '',
          agencyBrand: apiLead.brand?.name || (apiLead.agency ? apiLead.agency.name : ''),
          subSource: apiLead.sub_source?.id ? String(apiLead.sub_source.id) : '',
          department: apiLead.department?.id ? String(apiLead.department.id) : '',
          country: apiLead.country?.id ? String(apiLead.country.id) : '',
          state: apiLead.state?.id ? String(apiLead.state.id) : '',
          city: apiLead.city?.id ? String(apiLead.city.id) : '',
          zone: apiLead.zone?.id ? String(apiLead.zone.id) : '',
          postalCode: apiLead.postal_code || '',
        };

        const resolvedOrganisation = {
          id:
            rawLead.organisation?.id != null
              ? String(rawLead.organisation.id)
              : rawLead.organisation_id != null
                ? String(rawLead.organisation_id)
                : undefined,
          name:
            rawLead.organisation?.name ??
            rawLead.organisation_name ??
            undefined,
        };

        const mappedLead: EditLeadtype = {
          id: String(apiLead.id),
          selectedOption: apiLead.brand ? 'brand' : (apiLead.agency ? 'agency' : 'brand'),
          brandId: apiLead.brand?.id ? String(apiLead.brand.id) : undefined,
          agencyId: apiLead.agency?.id ? String(apiLead.agency.id) : undefined,
          contacts: [contact],
          assignTo: apiLead.assigned_user?.id ? String(apiLead.assigned_user.id) : undefined,
          assignToName: apiLead.assigned_user?.name || undefined,
          organisation: resolvedOrganisation.id,
          organisationName: resolvedOrganisation.name,
          priority: apiLead.priority?.id ? String(apiLead.priority.id) : undefined,
          callFeedback: apiLead.call_status_relation?.id ? String(apiLead.call_status_relation.id) : undefined,
          comment: apiLead.comment || '',
        };

        setLead(mappedLead);
        setSelectedOption(mappedLead.selectedOption);
        // set initial dropdownValue from mapped lead
        setDropdownValue(mappedLead.selectedOption === 'brand' ? (mappedLead.brandId || '') : (mappedLead.agencyId || ''));
      } catch (error) {
        console.error('Error fetching lead:', error);
        // TODO: Show error notification
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchLead();
    }
  }, [id]);

  // Initialize Gmail service
  useEffect(() => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
    try {
      gmailService.initGmail(CLIENT_ID);
    } catch (e) {
      console.warn('Gmail init error', e);
    }
  }, []);

  // Fetch lead history when lead is loaded
  useEffect(() => {
    let mounted = true;
    const loadHistory = async () => {
      if (!lead?.id || !mounted) return;

      setHistoryLoading(true);

      try {
        const data = await fetchLeadHistory(lead.id);
        setHistory(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch lead history:", error);
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
    return () => { mounted = false; };
  }, [lead?.id]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const types = await getLeadTypes();
        if (!isMounted) return;
        const map: Record<string, string> = {};
        (Array.isArray(types) ? types : []).forEach((t: any) => {
          const id = String(t?.id ?? '').trim();
          const name = String(t?.name ?? '').trim();
          if (id && name) map[id] = name;
        });
        setLeadTypeNameById(map);
      } catch {
        if (isMounted) setLeadTypeNameById({});
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // useEffect(() => {
  //   if (showEmailComposer && editorRef.current) {
  //     // Ensure editor is properly initialized
  //     editorRef.current.focus();
  //     if (!editorRef.current.innerHTML) {
  //       editorRef.current.innerHTML = emailBody;
  //     }
  //   }
  // }, [showEmailComposer, emailBody]);

  // Fetch brand/agency options when selectedOption changes
  useEffect(() => {
    let isMounted = true;
    setOptionsLoading(true);
    setOptionsError(null);
    setOptions([]);

    const fetchData = async () => {
      const fetchFn = selectedOption === 'brand' ? getBrandLists : getAgenciesLists;
      try {
        const data = await fetchFn();
        if (!isMounted) return;
        const fetched = Array.isArray(data) ? data.map((it: any) => ({ value: String(it.id), label: it.name })) : [];
        // If there's an existing selected value that's not present in fetched options,
        // add it using the dropdownValue as the label so the select shows the current value.
        if (dropdownValue) {
          const exists = fetched.find((o: any) => o.value === dropdownValue);
          if (!exists) {
            fetched.unshift({ value: dropdownValue, label: dropdownValue });
          }
        }
        setOptions(fetched);
      } catch {
        if (!isMounted) return;
        setOptionsError('Failed to load options');
        setOptions([]);
      } finally {
        if (isMounted) {
          setOptionsLoading(false);
        }
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [selectedOption, dropdownValue]);

  // Keep lead's brandId/agencyId in sync when dropdownValue changes
  useEffect(() => {
    setLead(prev => {
      if (!prev) return prev;
      return selectedOption === 'brand' ? { ...prev, brandId: dropdownValue } : { ...prev, agencyId: dropdownValue };
    });
  }, [dropdownValue, selectedOption]);

  const handleSubmit = async () => {
    if (!lead) return;

    const extractNumericId = (val?: string | number) => {
      if (val === undefined || val === null) return undefined;
      const s = String(val);
      const digits = s.replace(/\D+/g, '');
      return digits ? Number(digits) : undefined;
    };

    // SUB_SOURCE_MAP removed, subSource now contains the ID directly

    try {
      const contact = lead.contacts && lead.contacts.length ? lead.contacts[0] : null;

      const mobile_number: string[] = [];
      if (contact?.mobileNo) mobile_number.push(contact.mobileNo);
      if (contact?.mobileNo2) mobile_number.push(contact.mobileNo2);

      // Fix: Ensure call feedback ID is submitted
      const callStatusId = extractNumericId(lead.callFeedback);

      const assignUserId = lead.assignTo && String(lead.assignTo).trim()
        ? extractNumericId(lead.assignTo)
        : null;

      const payload: Record<string, any> = {
        name: contact?.fullName || undefined,
        email: contact?.email || null,
        profile_url: contact?.profileUrl || null,
        mobile_number: mobile_number.length ? mobile_number : undefined,
        current_assign_user: assignUserId,
        priority_id: lead.priority ? extractNumericId(lead.priority) : undefined,
        designation_id: contact?.designation ? Number(contact.designation) : undefined,
        department_id: contact?.department ? Number(contact.department) : undefined,
        sub_source_id: contact?.subSource ? Number(contact.subSource) : undefined,
        country_id: contact?.country ? Number(contact.country) : undefined,
        state_id: contact?.state ? Number(contact.state) : undefined,
        city_id: contact?.city ? Number(contact.city) : undefined,
        zone_id: contact?.zone ? Number(contact.zone) : undefined,
        postal_code: contact?.postalCode || undefined,
        comment: typeof lead.comment === 'string' ? lead.comment : (lead.comment ? String(lead.comment) : ''),
        call_status_id: callStatusId,
      };

      const typeValue = String(contact?.type || '').trim();
      if (typeValue) {
        const numericTypeId = Number(typeValue);
        const isNumericTypeValue =
          !Number.isNaN(numericTypeId) && Number.isFinite(numericTypeId) && numericTypeId > 0;
        // Never send numeric ID in `type`; send label or omit if unresolved.
        payload.type = leadTypeNameById[typeValue] || (isNumericTypeValue ? undefined : typeValue);
        if (isNumericTypeValue) {
          payload.lead_type_id = numericTypeId;
        }
      }

      if (selectedOption === 'brand') payload.brand_id = lead.brandId || undefined;
      else payload.agency_id = lead.agencyId || undefined;

      if (lead.organisation) {
        payload.organisation_id = extractNumericId(lead.organisation);
      }

      await updateLead(id || '', payload);
      // Assume updateLead throws on error or returns the updated item
      SweetAlert.showUpdateSuccess();
      window.location.replace(`${window.location.origin}/lead-management/all-leads`);
      return;
    } catch (error: any) {
      console.error('Error updating lead:', error);
      try { SweetAlert.showError(error?.message || 'Failed to update lead'); } catch {
        // no need to action
      }
    }
  };

  // const handleSave = async () => {
  //   setTemplateNameError('');
  //   setSubjectError('');
  //   setEmailToError('');
  //   setEmailBodyError('');
  //   setSuccessMessage('');
  //   if (!emailTo.trim() || !emailTo.includes('@')) {
  //     setEmailToError('Valid email address is required.');
  //     return;
  //   }
  //   if (!templateName.trim()) {
  //     setTemplateNameError('Template Name is required.');
  //     return;
  //   }
  //   if (!emailSubject.trim()) {
  //     setSubjectError('Subject is required.');
  //     return;
  //   }
  //   const body = isCodeView ? emailBody : (editorRef.current?.innerHTML || '');
  //   if (!body.trim()) {
  //     setEmailBodyError('Email body is required.');
  //     return;
  //   }
  //   setSendingEmail(true);
  //   try {
  //     let t = gmailService.getAccessToken();
  //     if (!t) {
  //       t = await gmailService.requestAccessToken('consent');
  //     }
  //     const body = isCodeView ? emailBody : (editorRef.current?.innerHTML || '');
  //     await gmailService.sendEmail(emailTo, emailSubject, body);
  //     setSuccessMessage('Email sent successfully.');
  //     setTimeout(() => {
  //       setShowEmailComposer(false);
  //       handleClear();
  //     }, 2000);
  //   } catch (err: any) {
  //     setTemplateNameError('Failed to send email: ' + String(err));
  //   } finally {
  //     setSendingEmail(false);
  //   }
  // };

  // const handleFormat = (command: string, value?: string) => {
  //   if (editorRef.current) {
  //     editorRef.current.focus();
  //     document.execCommand(command, false, value);
  //   }
  // };

  // const handleInsertLink = () => {
  //   const url = prompt('Enter URL:');
  //   if (url) handleFormat('createLink', url);
  // };

  // const handleInsertImage = () => {
  //   const url = prompt('Enter Image URL:');
  //   if (url) handleFormat('insertImage', url);
  // };

  // const handleFontSize = (size: string) => {
  //   handleFormat('fontSize', size);
  // };

  // const handleCodeViewToggle = () => {
  //   if (isCodeView) {
  //     // Switch to WYSIWYG
  //     if (editorRef.current) {
  //       editorRef.current.innerHTML = emailBody;
  //     }
  //   } else {
  //     // Switch to code view
  //     if (editorRef.current) {
  //       setEmailBody(editorRef.current.innerHTML);
  //     }
  //   }
  //   setIsCodeView(!isCodeView);
  // };

  // const handleClear = () => {
  //   setTemplateName('');
  //   setEmailSubject('');
  //   setEmailBody('');
  //   setEmailTo('');
  //   setTemplateNameError('');
  //   setSubjectError('');
  //   setEmailToError('');
  //   setEmailBodyError('');
  //   setSuccessMessage('');
  //   if (editorRef.current) editorRef.current.innerHTML = '';
  // };

  if (isLoading) {
    return (

      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-gray-500">Lead not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden">
      <MasterCreateHeader
        onClose={() => navigate('/lead-management/all-leads')}
      />

      <div className="space-y-3 sm:space-y-4">
        <LeadManagementSection
          selectedOption={selectedOption}
          onSelectOption={(opt) => {
            setSelectedOption(opt);
            // when switching, keep dropdownValue in sync with lead
            setDropdownValue(opt === 'brand' ? (lead?.brandId || '') : (lead?.agencyId || ''));
          }}
          value={dropdownValue}
          onChange={(value) => {
            setDropdownValue(value);
          }}
          options={options}
          loading={optionsLoading}
          error={optionsError}
          collapsible
        />

        <ContactPersonsCard
          initialContacts={lead.contacts}
          onChange={(contacts) => {
            setLead(prev => prev ? { ...prev, contacts } : null);
          }}
          collapsible
        />

        <AssignPriorityCard
          mode="edit"
          organisation={lead.organisation}
          organisationName={lead.organisationName}
          assignTo={lead.assignTo}
          assignedLabel={lead.assignToName}
          priority={lead.priority}
          callFeedback={lead.callFeedback}
          onChange={handlePriorityChange}
          collapsible
        />

        {/* Comment Card Section */}
        <CommentSection
          value={lead.comment || ''}
          onChange={(value) => {
            setLead(prev => prev ? { ...prev, comment: value } : null);
          }}
          collapsible
        />

        {/* Email Activity Section */}
        {/* <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm text-gray-800 font-medium">Email Activity</h3>
            <Button onClick={() => { setShowEmailComposer(true); setEmailTo(lead.contacts[0]?.email || ''); }}>Send Email</Button>
          </div>
          {showEmailComposer && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className={`bg-white rounded-lg shadow-lg ${isFullscreen ? 'w-full h-full' : 'max-w-4xl w-full mx-4'} max-h-[90vh] overflow-y-auto`}>
                <div className="flex justify-between items-center p-3 border-b border-gray-200">
                  <h2 className="text-lg font-semibold">Send Email</h2>
                  <button onClick={() => setShowEmailComposer(false)} className="text-gray-500 text-xl hover:text-gray-700"><X /></button>
                </div>
                {successMessage && (
                  <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                    {successMessage}
                  </div>
                )}
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">To <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => {
                        setEmailTo(e.target.value);
                        setEmailToError('');
                      }}
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      required
                    />
                    {emailToError && <p className="text-red-500 text-sm mt-1">{emailToError}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Template Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => {
                          setTemplateName(e.target.value);
                          setTemplateNameError('');
                        }}
                        className="w-full p-2 border border-gray-200 rounded-lg"
                        required
                      />
                      {templateNameError && <p className="text-red-500 text-sm mt-1">{templateNameError}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Subject <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => {
                          setEmailSubject(e.target.value);
                          setSubjectError('');
                        }}
                        className="w-full p-2 border border-gray-200 rounded-lg"
                        required
                      />
                      {subjectError && <p className="text-red-500 text-sm mt-1">{subjectError}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email Body <span className="text-red-500">*</span></label>
                    <div className="border border-gray-200 rounded-lg">
                      <div className="flex flex-wrap items-center p-2 border-b border-gray-200 bg-gray-50">
                        <button type="button" onClick={handleCodeViewToggle} className="p-1 hover:bg-gray-200" title="Code View">&lt;/&gt;</button>
                        <button type="button" onClick={() => handleFormat('undo')} className="p-1 hover:bg-gray-200" title="Undo">↶</button>
                        <button type="button" onClick={() => handleFormat('redo')} className="p-1 hover:bg-gray-200" title="Redo">↷</button>
                        <div className="w-px h-6 bg-gray-300 mx-2"></div>
                        <button type="button" onClick={() => handleFormat('bold')} className="p-1 hover:bg-gray-200" title="Bold"><Bold size={16} /></button>
                        <button type="button" onClick={() => handleFormat('italic')} className="p-1 hover:bg-gray-200" title="Italic"><Italic size={16} /></button>
                        <button type="button" onClick={() => handleFormat('strikeThrough')} className="p-1 hover:bg-gray-200" title="Strikethrough">S</button>
                        <select onChange={(e) => handleFontSize(e.target.value)} className="p-1 border rounded text-sm">
                          <option value="1">Size 1</option>
                          <option value="2">Size 2</option>
                          <option value="3">Size 3</option>
                          <option value="4">Size 4</option>
                          <option value="5">Size 5</option>
                          <option value="6">Size 6</option>
                          <option value="7">Size 7</option>
                        </select>
                        <div className="w-px h-6 bg-gray-300 mx-2"></div>
                        <button type="button" onClick={() => handleFormat('justifyLeft')} className="p-1 hover:bg-gray-200" title="Align Left">⬅</button>
                        <button type="button" onClick={() => handleFormat('justifyCenter')} className="p-1 hover:bg-gray-200" title="Align Center">⬌</button>
                        <button type="button" onClick={() => handleFormat('justifyRight')} className="p-1 hover:bg-gray-200" title="Align Right">➡</button>
                        <div className="w-px h-6 bg-gray-300 mx-2"></div>
                        <button type="button" onClick={() => handleFormat('insertUnorderedList')} className="p-1 hover:bg-gray-200" title="Bullet List"><List size={16} /></button>
                        <button type="button" onClick={() => handleFormat('insertOrderedList')} className="p-1 hover:bg-gray-200" title="Numbered List"><ListOrdered size={16} /></button>
                        <div className="w-px h-6 bg-gray-300 mx-2"></div>
                        <button type="button" onClick={handleInsertLink} className="p-1 hover:bg-gray-200" title="Insert Link">🔗</button>
                        <button type="button" onClick={handleInsertImage} className="p-1 hover:bg-gray-200" title="Insert Image">🖼</button>
                        <div className="ml-auto">
                          <button type="button" onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 hover:bg-gray-200" title="Fullscreen">⛶</button>
                        </div>
                      </div>
                      {isCodeView ? (
                        <textarea
                          value={emailBody}
                          onChange={(e) => {
                            setEmailBody(e.target.value);
                            setEmailBodyError('');
                          }}
                          className="w-full h-64 p-2 font-mono text-sm"
                          placeholder="Enter HTML code..."
                        />
                      ) : (
                        <div
                          ref={editorRef}
                          contentEditable
                          className="min-h-[200px] p-2"
                          onInput={() => setEmailBodyError('')}
                        />
                      )}
                    </div>
                    {emailBodyError && <p className="text-red-500 text-sm mt-1">{emailBodyError}</p>}
                  </div>
                </div>
                <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 bg-gray-50">
                  <Button onClick={handleClear} className="bg-red-500 text-white hover:bg-red-600">Clear</Button>
                  <Button onClick={handleSave} disabled={sendingEmail}>
                    {sendingEmail ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {['Subject Line 1', 'Subject Line 2', 'Subject Line 3'].map((sub, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
                    <Mail className="w-4 h-4 text-gray-800" />
                  </div>
                  <div className="text-sm text-gray-800">{sub}</div>
                </div>
                <div className="text-gray-800">
                  <Eye className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        </div> */}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:space-x-4 pt-1">
          <Button
            onClick={() => navigate('/lead-management/all-leads')}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Update
          </Button>
        </div>

        {/* Call Details Table Section */}
        <CollapsibleFormCard
          title="Call Details"
          collapsible
          defaultOpen={false}
          scrollable
          innerClassName="bg-white p-0"
          titleWrapperClassName="mb-3"
          icon={<PhoneCall className="h-5 w-5" strokeWidth={2} />}
        >
            <div className="min-w-0">
              {/* Render call history rows from API (fallback to sample rows) */}
              {
                (() => {
                  const formatDateTime = (date: string | null | undefined) => {
                    if (!date) return '-';
                    try {
                      return new Date(date).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });
                    } catch {
                      return '-';
                    }
                  };

                  const rows = history && history.length > 0 ? history.map((h: any) => ({
                    id: String(h.id || h.uuid),
                    assignedTo: h.assigned_user?.name || '-',
                    currentUser: h.current_user?.name || '-',
                    priority: h.priority?.name || h.priority?.slug || '-',
                    status: h.status?.name || '-',
                    callStatus: h.call_status?.name || '-',
                    meetingDateTime: h.meeting_date ? formatDateTime(h.meeting_date) : '-',
                    createdAt: formatDateTime(h.created_at),
                    comment: h.lead_comment || '-'
                  })) : Array.from({ length: 3 }).map((_, i) => ({
                    id: String(i),
                    assignedTo: lead.assignToName || lead.assignTo || '-',
                    currentUser: '-',
                    priority: '-',
                    status: '-',
                    callStatus: 'Not Interested',
                    meetingDateTime: '-',
                    createdAt: '-',
                    comment: 'According to Form'
                  }));

                  type Row = typeof rows[number];

                  const columns: Column<Row>[] = [
                    { key: 'assignedTo', header: 'Assigned To', render: (r) => r.assignedTo, minWidth: 130 },
                    { key: 'currentUser', header: 'Current User', render: (r) => r.currentUser, minWidth: 140 },
                    { key: 'priority', header: 'Priority', render: (r) => r.priority, minWidth: 100 },
                    { key: 'status', header: 'Status', render: (r) => r.status, minWidth: 140 },
                    { key: 'callStatus', header: 'Call Status', render: (r) => r.callStatus, minWidth: 140 },
                    { key: 'meetingDateTime', header: 'Meeting Date & Time', render: (r) => r.meetingDateTime, minWidth: 180 },
                    { key: 'createdAt', header: 'Created At', render: (r) => r.createdAt, minWidth: 170 },
                    { key: 'comment', header: 'Comment', render: (r) => r.comment, minWidth: 180, maxWords: 5 },
                  ];

                  return (
                    <Table<Row>
                      data={rows}
                      columns={columns}
                      startIndex={0}
                      loading={historyLoading}
                      compact
                      desktopOnMobile={true}
                      keyExtractor={(it) => it.id}
                    />
                  );
                })()
              }
            </div>
        </CollapsibleFormCard>
      </div>
    </div>
  );
};

export default EditLead;