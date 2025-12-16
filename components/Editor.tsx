import React from 'react';
import { Box, useTheme } from '@mui/material';
import {
  MenuButtonBold,
  MenuButtonItalic,
  MenuButtonUnderline,
  MenuButtonStrikethrough,
  MenuButtonBlockquote,
  MenuButtonOrderedList,
  MenuButtonBulletedList,
  MenuButtonEditLink,
  MenuButtonRemoveFormatting,
  MenuControlsContainer,
  MenuDivider,
  MenuSelectHeading,
  RichTextEditor,
  type RichTextEditorRef,
} from 'mui-tiptap';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2],
    },
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
  }),
  Underline,
];

export const Editor: React.FC<EditorProps> = ({ value, onChange, disabled }) => {
  const theme = useTheme();
  const rteRef = React.useRef<RichTextEditorRef>(null);

  return (
    <Box
      sx={{
        // Target the RichTextField root container
        '& .MuiTiptap-RichTextField-root': {
          borderRadius: 2,
          overflow: 'hidden', // Clip children to rounded corners
        },
        // Fix the notched outline (focus border)
        '& .MuiTiptap-FieldContainer-notchedOutline': {
          borderRadius: 2,
        },
        // Fix toolbar background overflow - add rounded corners
        '& .MuiTiptap-MenuBar-root': {
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        },
        // Fix menu controls container
        '& .MuiTiptap-MenuControlsContainer': {
          borderRadius: 0,
        },
        // Content area
        '& .MuiTiptap-RichTextContent': {
          minHeight: 200,
          p: 2,
        },
        '& .ProseMirror': {
          minHeight: 200,
          outline: 'none',
          '& p': {
            margin: 0,
            marginBottom: 1,
          },
          '& h1': {
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: 1,
          },
          '& h2': {
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: 1,
          },
          '& blockquote': {
            borderLeft: `3px solid ${theme.palette.primary.main}`,
            paddingLeft: theme.spacing(2),
            marginLeft: 0,
            color: theme.palette.text.secondary,
          },
          '& ul, & ol': {
            paddingLeft: theme.spacing(3),
          },
          '& a': {
            color: theme.palette.primary.main,
            textDecoration: 'underline',
          },
        },
      }}
    >
      <RichTextEditor
        ref={rteRef}
        extensions={extensions}
        content={value}
        editable={!disabled}
        onUpdate={({ editor }) => {
          onChange(editor.getHTML());
        }}
        renderControls={() => (
          <MenuControlsContainer>
            <MenuSelectHeading />
            <MenuDivider />
            <MenuButtonBold />
            <MenuButtonItalic />
            <MenuButtonUnderline />
            <MenuButtonStrikethrough />
            <MenuDivider />
            <MenuButtonBlockquote />
            <MenuButtonOrderedList />
            <MenuButtonBulletedList />
            <MenuDivider />
            <MenuButtonEditLink />
            <MenuDivider />
            <MenuButtonRemoveFormatting />
          </MenuControlsContainer>
        )}
      />
    </Box>
  );
};
