import React from 'react';
import ReactQuill from 'react-quill';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    ['link', 'clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet',
  'link'
];

export const Editor: React.FC<EditorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="rounded-md overflow-hidden transition-colors duration-300">
      <ReactQuill 
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        readOnly={disabled}
        className="h-64 mb-12" // mb-12 to account for toolbar height in layout
      />
    </div>
  );
};