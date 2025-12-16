
export enum UserRole {
  SUPER = 'super',
  EDITOR = 'editor',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled'
}

export interface User {
  username: string;
  role: UserRole;
  displayName?: string;
  allowedMods?: string[]; // RBAC: List of Mod IDs this user can access
  status: UserStatus;
  isRootAdmin?: boolean;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  displayName?: string;
  allowedMods?: string[];
}

export interface ResetPasswordRequest {
  username: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface SetUserStatusRequest {
  username: string;
  status: UserStatus;
}

export interface UpdateUserRequest {
  username: string;
  role?: UserRole;
  displayName?: string;
  allowedMods?: string[];
}

export interface ModDefinition {
  id: string;   // Alphanumeric only, e.g., 'DuckovCustomSoundsMod_v1'
  name: string; // Display name, can be Chinese, e.g., '鸭科夫自定义音乐音效Mod'
}

export interface Announcement {
  id: string;
  modId: string;
  /**
   * 可选版本号/版本标签（例如：1.0.1、1.0.0 Beta、1.0.0 Alpha）
   * - 用于前端按版本排序与展示
   * - 不参与鉴权/路由等业务逻辑
   */
  version?: string;
  title: string;
  content_html: string;
  content_text: string; // Unity 客户端使用的内容（带标签的富文本/HTML 源字符串，解析由客户端负责）
  author: string;
  timestamp: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ApiKeyStatus = 'active' | 'revoked';

export interface ApiKey {
  id: string;
  name: string;
  allowedMods: string[];
  createdAt: number;
  createdBy: string;
  status: ApiKeyStatus;
  revokedAt?: number;
  revokedBy?: string;
  lastUsedAt?: number;
}

export interface CreateApiKeyResponse extends ApiKey {
  token: string; // 仅创建时返回一次
}
