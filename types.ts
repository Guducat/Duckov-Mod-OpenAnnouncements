
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
