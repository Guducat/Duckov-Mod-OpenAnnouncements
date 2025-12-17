import { createTheme, PaletteMode, ThemeOptions } from '@mui/material/styles';

// 品牌色定义 - 保持与原 Tailwind 配置一致
export const brandColors = {
  blue: '#3b82f6',      // brand-blue (Blue 500)
  yellow: '#fbbf24',    // brand-yellow (Amber 400)
  base: '#0f172a',      // brand-base (Slate 900) - 深蓝背景
  card: '#1e293b',      // brand-card (Slate 800) - 卡片背景
  white: '#f8fafc',     // brand-white (Slate 50) - 纯白文本
  muted: '#94a3b8',     // brand-muted (Slate 400) - 灰色文本
};

// Light 模式调色板
const lightPalette = {
  mode: 'light' as PaletteMode,
  primary: {
    main: brandColors.blue,
    light: '#60a5fa',
    dark: '#2563eb',
    contrastText: '#ffffff',
  },
  secondary: {
    main: brandColors.yellow,
    light: '#fcd34d',
    dark: '#f59e0b',
    contrastText: brandColors.base,
  },
  background: {
    default: '#f8fafc',     // slate-50
    paper: '#ffffff',
  },
  text: {
    primary: '#0f172a',     // slate-900
    secondary: '#64748b',   // slate-500
    disabled: '#94a3b8',    // slate-400
  },
  divider: '#e2e8f0',       // slate-200
  error: {
    main: '#ef4444',
    light: '#fca5a5',
    dark: '#dc2626',
  },
  warning: {
    main: '#f59e0b',
    light: '#fcd34d',
    dark: '#d97706',
  },
  success: {
    main: '#22c55e',
    light: '#86efac',
    dark: '#16a34a',
  },
};

// Dark 模式调色板
const darkPalette = {
  mode: 'dark' as PaletteMode,
  primary: {
    main: brandColors.yellow,  // Dark 模式下使用黄色作为主色
    light: '#fcd34d',
    dark: '#f59e0b',
    contrastText: brandColors.base,
  },
  secondary: {
    main: brandColors.blue,
    light: '#60a5fa',
    dark: '#2563eb',
    contrastText: '#ffffff',
  },
  background: {
    default: brandColors.base,   // brand-base
    paper: brandColors.card,     // brand-card
  },
  text: {
    primary: brandColors.white,
    secondary: brandColors.muted,
    disabled: '#475569',
  },
  divider: 'rgba(59, 130, 246, 0.2)',  // brand-blue/20
  error: {
    main: '#f87171',
    light: '#fca5a5',
    dark: '#ef4444',
  },
  warning: {
    main: '#fbbf24',
    light: '#fcd34d',
    dark: '#f59e0b',
  },
  success: {
    main: '#4ade80',
    light: '#86efac',
    dark: '#22c55e',
  },
};

// 共享组件样式覆盖
const getComponentOverrides = (mode: PaletteMode): ThemeOptions['components'] => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        transition: 'background-color 0.3s ease, color 0.3s ease',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        borderRadius: 8,
        fontWeight: 700,
        padding: '8px 16px',
      },
    },
    variants: [
      {
        props: { variant: 'contained', color: 'primary' },
        style: {
          boxShadow:
            mode === 'light'
              ? '0 4px 6px -1px rgba(59, 130, 246, 0.1)'
              : '0 4px 6px -1px rgba(251, 191, 36, 0.2)',
          '&:hover': {
            boxShadow:
              mode === 'light'
                ? '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                : '0 4px 6px -1px rgba(251, 191, 36, 0.3)',
          },
        },
      },
    ],
    defaultProps: {
      disableElevation: true,
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxHeight: '90vh',
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '1.25rem',
        fontWeight: 700,
        padding: '16px 24px',
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '24px',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        border: mode === 'light'
          ? '1px solid #e2e8f0'
          : '1px solid rgba(59, 130, 246, 0.2)',
        backgroundImage: 'none',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
        },
      },
    },
    defaultProps: {
      size: 'small',
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: mode === 'light' ? brandColors.blue : brandColors.yellow,
        },
      },
      notchedOutline: {
        borderColor: mode === 'light' ? '#cbd5e1' : 'rgba(59, 130, 246, 0.3)',
      },
    },
  },
  MuiSelect: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 500,
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
    },
    defaultProps: {
      elevation: 0,
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: {
        height: 3,
        borderRadius: '3px 3px 0 0',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        minHeight: 48,
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: 8,
        border: mode === 'light'
          ? '1px solid #e2e8f0'
          : '1px solid rgba(59, 130, 246, 0.2)',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        margin: '2px 4px',
        '&:hover': {
          backgroundColor: mode === 'light'
            ? 'rgba(59, 130, 246, 0.08)'
            : 'rgba(251, 191, 36, 0.08)',
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 6,
        fontSize: '0.75rem',
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
});

// 创建主题工厂函数
export const createAppTheme = (mode: PaletteMode) => {
  const palette = mode === 'light' ? lightPalette : darkPalette;

  return createTheme({
    palette,
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      h1: {
        fontSize: '2rem',
        fontWeight: 700,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '1.5rem',
        fontWeight: 700,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '0.75rem',
        lineHeight: 1.5,
      },
      button: {
        fontWeight: 700,
      },
    },
    shape: {
      borderRadius: 8,
    },
    transitions: {
      duration: {
        standard: 300,
      },
    },
    components: getComponentOverrides(mode),
  });
};
