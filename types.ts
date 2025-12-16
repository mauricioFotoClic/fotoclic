
export enum UserRole {
  ADMIN = 'admin',
  PHOTOGRAPHER = 'photographer',
  CUSTOMER = 'customer',
}

export interface BankInfo {
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  bankName?: string;
  accountNumber?: string;
  agency?: string;
}

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'rejected';

export interface BulkDiscountRule {
  minQuantity: number;
  discountPercent: number;
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  bio?: string;
  avatar_url: string;
  banner_url?: string;
  location?: string;
  social_instagram?: string;
  is_active: boolean;
  bulkDiscountRules?: BulkDiscountRule[];
  bank_info?: BankInfo;
}

export interface PhotographerWithStats extends User {
  photoCount: number;
  salesCount: number;
  commissionValue: number;
  commissionRate: number;
  likesCount: number;
  avgRating: number; // 0-5
  reviewCount: number;
  approvalPercentage: number; // 0-100
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  sort_order?: number;
}

export interface PhotoQualityAnalysis {
  overallScore: number;
  sharpness: number;
  lighting: number;
  composition: number;
  noise: number;
  ai_tags: string[];
  recommendation: 'approve' | 'reject' | 'manual';
  summary: string;
}

export interface Photo {
  id: string;
  photographer_id: string;
  category_id: string;
  title: string;
  description: string;
  preview_url: string;
  file_url: string;
  price: number;
  resolution: 'HD' | 'Full HD' | '4K' | 'RAW';
  width?: number;
  height?: number;
  tags: string[];
  is_public: boolean;
  upload_date: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  is_featured: boolean;
  quality_analysis?: PhotoQualityAnalysis;
  likes: number;
  liked_by_users: string[];
}

export interface CartItem {
  photo_id: string;
  title: string;
  price: number;
  preview_url: string;
  photographer_id: string;
}

export interface AbandonedCart {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  items: CartItem[];
  date: string;
  status: 'pending' | 'recovered' | 'contacted';
}

export interface PurchasedPhoto extends Photo {
  purchase_date: string;
  sale_id: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  expiration_date: string;
  photographer_id: string;
  is_active: boolean;
}

export interface Sale {
  id: string;
  photo_id: string;
  buyer_id: string;
  buyer_name: string;
  sale_date: string;
  price: number;
  commission: number;
}

export interface Payout {
  id: string;
  photographer_id: string;
  amount: number;
  request_date: string;
  scheduled_date: string;
  processed_date?: string;
  status: PayoutStatus;
  admin_note?: string;
}

export interface PhotographerBalance extends PhotographerWithStats {
  totalEarnings: number; // Net earnings
  totalPaid: number;
  currentBalance: number;
  totalSalesGross: number;
  totalPlatformFees: number;
  likesCount: number;
}

export interface CommissionSettings {
  defaultRate: number;
  customRates: {
    [photographerId: string]: number;
  };
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailTemplates {
  photographerActivated: EmailTemplate;
  photographerDeactivated: EmailTemplate;
  photoRejected: EmailTemplate;
  payoutProcessed: EmailTemplate;
}

export interface Review {
  id: string;
  photographer_id: string;
  reviewer_id: string;
  rating: number; // 1-5
  comment?: string;
  created_at: string;
}

export type Page =
  { name: 'home' } |
  { name: 'login' } |
  { name: 'register' } |
  { name: 'pending-approval' } |
  { name: 'admin' } |
  { name: 'photographer' } |
  { name: 'customer-dashboard' } |
  { name: 'category', id: string } |
  { name: 'photo-detail', id: string } |
  { name: 'photographer-portfolio', photographerId: string } |
  { name: 'about' } |
  { name: 'contact' } |
  { name: 'help-center' } |
  { name: 'terms' } |
  { name: 'privacy' } |
  { name: 'featured-photos' } |
  { name: 'discover', initialSearch?: string } |
  { name: 'photographers' } |
  { name: 'cart' } |
  { name: 'checkout' } |
  { name: 'test-stripe' } |
  { name: 'face-search' };
