
export type Contact = {
  id: string;
  fullName: string;
  profileUrl: string;
  email: string;
  mobileNo: string;
  mobileNo2: string;
  showSecondMobile: boolean;
  type: string;
  designation: string;
  agencyBrand: string;
  subSource: string;
  department: string;
  country: string;
  state: string;
  city: string;
  zone: string;
  postalCode: string;
};



export interface ContactPersonsCardProps {
  initialContacts?: Contact[];
  onChange?: (contacts: Contact[]) => void;
  errors?: Record<string, Partial<Record<string, string>>>;
  collapsible?: boolean;
}


// create lead form  
 
export interface ContactPerson {
  id: string;
  fullName: string;
  email: string;
  type: string;
  department: string;
  country: string;
  state: string;
  zone: string;
  profileUrl: string;
  mobileNo: string;
  designation: string;
  subSource: string;
  postalCode: string;
  city: string;
}

export interface CreateLeadFormProps {
  onSubmit: (data: any) => void;
  loading?: boolean;
}


export interface Props {
  selectedOption: 'brand' | 'agency';
  onSelectOption: (v: 'brand' | 'agency') => void;
  value?: string;
  onChange?: (value: string) => void;
  options?: { value: string; label: string }[];
  loading?: boolean;
  error?: string | null;
  collapsible?: boolean;
}


export interface AssignPriorityCardProps {
  assignTo?: string;
  assignedLabel?: string;
  priority?: string;
  callFeedback?: string;
  organisation?: string;
  organisationName?: string;
  organisationError?: string | null;
  mode?: 'create' | 'edit';
  collapsible?: boolean;
  onChange?: (values: { organisation?: string; assignTo?: string; priority?: string; callFeedback?: string }) => void;
}