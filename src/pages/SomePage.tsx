/**
 * @file SomePage.tsx
 * @description Placeholder or sample page component.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import MasterForm from '../components/ui/MasterForm';

const SomePage = () => {
  const sampleFields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text' },
  ];

  return (
    <div>
      <h1>Some Page</h1>
      <MasterForm fields={sampleFields} />
    </div>
  );
};

export default SomePage;