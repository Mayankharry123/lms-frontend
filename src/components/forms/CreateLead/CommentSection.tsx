import React from 'react';
import CollapsibleFormCard from '../../ui/CollapsibleFormCard';
import { MessageSquareText } from 'lucide-react';

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  collapsible?: boolean;
}

const CommentSection: React.FC<Props> = ({ value = '', onChange = () => {}, collapsible = false }) => {
  const textarea = (
    <>
      <label className="block text-sm text-gray-600 mb-1">Comment</label>
      <textarea
        placeholder="Additional notes about the lead..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-28 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
      />
    </>
  );

  if (!collapsible) {
    return (
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="px-4 py-5 p-5 bg-gray-50">{textarea}</div>
      </div>
    );
  }

  return (
    <CollapsibleFormCard
      title="Comment"
      collapsible
      defaultOpen={false}
      innerClassName="px-4 py-5 p-5 bg-gray-50"
      titleWrapperClassName="mb-4"
      icon={<MessageSquareText className="h-5 w-5" strokeWidth={2} />}
    >
      {textarea}
    </CollapsibleFormCard>
  );
};

export default CommentSection;
