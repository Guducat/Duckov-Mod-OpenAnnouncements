import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Button,
  TextField,
  Collapse,
  IconButton,
  CircularProgress,
  Alert,
  AlertColor,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Modal } from '../Modal';
import { AppSnackbar } from '../AppSnackbar';

const USE_MOCK_API = (import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() !== 'false';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

const apiUrl = (path: string) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);

interface ApiDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
}

interface ApiResponse {
  status: number;
  data: unknown;
  error?: string;
}

interface ApiEndpointConfig {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  params?: { name: string; placeholder: string; required?: boolean }[];
  bodyFields?: { name: string; placeholder: string; required?: boolean; multiline?: boolean }[];
  requiresAuth?: boolean;
  requiresApiKey?: boolean;
}

const API_ENDPOINTS: ApiEndpointConfig[] = [
  // 公开接口
  {
    method: 'GET',
    path: '/api/public/list',
    description: '获取指定 Mod 的公告列表',
    params: [{ name: 'modId', placeholder: '例如 DuckovMod_v1', required: true }],
  },
  {
    method: 'GET',
    path: '/api/mod/list',
    description: '获取所有 Mod 列表',
  },
  // Push API
  {
    method: 'POST',
    path: '/api/push/announcement',
    description: 'CI 自动推送公告',
    requiresApiKey: true,
    bodyFields: [
      { name: 'apiKey', placeholder: 'your-api-key', required: true },
      { name: 'modId', placeholder: 'DuckovMod_v1', required: true },
      { name: 'title', placeholder: '公告标题', required: true },
      { name: 'content_html', placeholder: '<p>公告内容</p>', required: true, multiline: true },
      { name: 'version', placeholder: 'v1.0.0' },
    ],
  },
  // 管理接口
  {
    method: 'POST',
    path: '/api/admin/post',
    description: '创建公告',
    requiresAuth: true,
    bodyFields: [
      { name: 'modId', placeholder: 'DuckovMod_v1', required: true },
      { name: 'title', placeholder: '公告标题', required: true },
      { name: 'content_html', placeholder: '<p>公告内容</p>', required: true, multiline: true },
      { name: 'version', placeholder: 'v1.0.0' },
    ],
  },
  {
    method: 'GET',
    path: '/api/user/list',
    description: '获取用户列表（需要超级管理员权限）',
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/api/apikey/list',
    description: '列出 API key',
    requiresAuth: true,
  },
];

const ApiEndpointTester: React.FC<{
  config: ApiEndpointConfig;
  token?: string;
  onMessage: (msg: string, severity: AlertColor) => void;
  disabled?: boolean;
}> = ({ config, token, onMessage, disabled }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [body, setBody] = useState<Record<string, string>>({});

  const handleTest = async () => {
    setLoading(true);
    setResponse(null);

    try {
      let url = config.path;

      // 构建查询参数
      if (config.params) {
        const queryParams = new URLSearchParams();
        config.params.forEach((p) => {
          if (params[p.name]) {
            queryParams.set(p.name, params[p.name]);
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // 使用 API base URL
      const fullUrl = apiUrl(url);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.requiresAuth && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchOptions: RequestInit = {
        method: config.method,
        headers,
      };

      if (config.method === 'POST' && config.bodyFields) {
        const bodyData: Record<string, string> = {};
        config.bodyFields.forEach((f) => {
          if (body[f.name]) {
            bodyData[f.name] = body[f.name];
          }
        });
        fetchOptions.body = JSON.stringify(bodyData);
      }

      const res = await fetch(fullUrl, fetchOptions);
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        setResponse({
          status: res.status,
          data,
        });
      } else {
        // 非 JSON 响应
        const text = await res.text();
        setResponse({
          status: res.status,
          data: null,
          error: `响应类型非 JSON: ${contentType}\n\n${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`,
        });
      }
    } catch (err) {
      setResponse({
        status: 0,
        data: null,
        error: err instanceof Error ? err.message : '请求失败',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = async () => {
    if (response) {
      try {
        const text = response.error || JSON.stringify(response.data, null, 2);
        await navigator.clipboard.writeText(text);
        onMessage('已复制到剪贴板', 'success');
      } catch {
        onMessage('复制失败', 'error');
      }
    }
  };

  const needsAuth = config.requiresAuth && !token;
  const isDisabled = disabled || needsAuth;

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: 'action.hover',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Chip
            label={config.method}
            size="small"
            color={config.method === 'GET' ? 'success' : 'info'}
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {config.path}
          </Typography>
          {config.requiresAuth && (
            <Chip label="需认证" size="small" variant="outlined" color="warning" sx={{ fontSize: '0.7rem' }} />
          )}
          {config.requiresApiKey && (
            <Chip label="API Key" size="small" variant="outlined" color="secondary" sx={{ fontSize: '0.7rem' }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={loading ? <CircularProgress size={14} /> : <PlayArrowIcon />}
            onClick={handleTest}
            disabled={loading || isDisabled}
            sx={{ textTransform: 'none', minWidth: 'auto' }}
          >
            测试
          </Button>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {config.description}
      </Typography>

      {needsAuth && !disabled && (
        <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
          此接口需要登录认证
        </Alert>
      )}

      {/* Expanded Content */}
      <Collapse in={expanded}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {/* Query Params */}
          {config.params && config.params.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                查询参数
              </Typography>
              <Stack spacing={1}>
                {config.params.map((p) => (
                  <TextField
                    key={p.name}
                    size="small"
                    label={`${p.name}${p.required ? ' *' : ''}`}
                    placeholder={p.placeholder}
                    value={params[p.name] || ''}
                    onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                    fullWidth
                    disabled={disabled}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Body Fields */}
          {config.bodyFields && config.bodyFields.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                请求体 (Body)
              </Typography>
              <Stack spacing={1}>
                {config.bodyFields.map((f) => (
                  <TextField
                    key={f.name}
                    size="small"
                    label={`${f.name}${f.required ? ' *' : ''}`}
                    placeholder={f.placeholder}
                    value={body[f.name] || ''}
                    onChange={(e) => setBody((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    fullWidth
                    multiline={f.multiline}
                    rows={f.multiline ? 3 : 1}
                    disabled={disabled}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Response */}
          {response && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  响应结果
                  <Chip
                    label={response.status || 'Error'}
                    size="small"
                    color={response.status >= 200 && response.status < 300 ? 'success' : 'error'}
                    sx={{ ml: 1, fontSize: '0.7rem' }}
                  />
                </Typography>
                <IconButton size="small" onClick={handleCopyResponse} title="复制响应">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box
                component="pre"
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  m: 0,
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                {response.error || JSON.stringify(response.data, null, 2)}
              </Box>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
};

export const ApiDebugModal: React.FC<ApiDebugModalProps> = ({ isOpen, onClose, token }) => {
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showMessage = (message: string, severity: AlertColor) => {
    setSnackbar({ open: true, message, severity });
  };

  const publicEndpoints = API_ENDPOINTS.filter((e) => !e.requiresAuth && !e.requiresApiKey);
  const pushEndpoints = API_ENDPOINTS.filter((e) => e.requiresApiKey);
  const adminEndpoints = API_ENDPOINTS.filter((e) => e.requiresAuth);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="API 调试" maxWidth="md">
        <Stack spacing={3}>
          {USE_MOCK_API ? (
            <Alert severity="warning">
              当前为 Mock 模式（LocalStorage），API 测试功能不可用。请设置 <code>VITE_USE_MOCK_API=false</code> 和 <code>VITE_API_BASE_URL</code> 以连接真实 API。
            </Alert>
          ) : (
            <Alert severity="info" icon={false}>
              点击每个接口的"测试"按钮可发起实际请求并查看返回值。展开接口可填写参数。
              {API_BASE_URL && (
                <Typography variant="caption" component="div" sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                  API 基础地址: {API_BASE_URL}
                </Typography>
              )}
            </Alert>
          )}

          {/* Public APIs */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              公开接口（无需认证）
            </Typography>
            <Stack spacing={1}>
              {publicEndpoints.map((endpoint) => (
                <ApiEndpointTester
                  key={endpoint.path}
                  config={endpoint}
                  token={token}
                  onMessage={showMessage}
                  disabled={USE_MOCK_API}
                />
              ))}
            </Stack>
          </Box>

          {/* Push APIs */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              自动化推送（需要 API key）
            </Typography>
            <Stack spacing={1}>
              {pushEndpoints.map((endpoint) => (
                <ApiEndpointTester
                  key={endpoint.path}
                  config={endpoint}
                  token={token}
                  onMessage={showMessage}
                  disabled={USE_MOCK_API}
                />
              ))}
            </Stack>
          </Box>

          {/* Admin APIs */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              管理接口（需要登录 Bearer Token）
            </Typography>
            <Stack spacing={1}>
              {adminEndpoints.map((endpoint) => (
                <ApiEndpointTester
                  key={endpoint.path}
                  config={endpoint}
                  token={token}
                  onMessage={showMessage}
                  disabled={USE_MOCK_API}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </Modal>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
};
