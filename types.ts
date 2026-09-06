
export enum UserRole {
  ADMIN = 'admin',
  PHOTOGRAPHER = 'photographer',
  CUSTOMER = 'customer',
  PRODUCER = 'producer',
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
  slug?: string;
  bio?: string;
  avatar_url: string;
  banner_url?: string;
  location?: string;
  social_instagram?: string;
  is_active: boolean;
  bulkDiscountRules?: BulkDiscountRule[];
  bank_info?: BankInfo;
  pix_key?: string;
  pix_key_type?: string;
  payout_frequency?: 'diario' | 'semanal' | 'mensal';
  liability_waiver_accepted_at?: string;
  sports_policy_accepted_at?: string;
  phone?: string;
  company_name?: string;
  communication_templates?: {
    abandoned_cart?: {
      email_subject?: string;
      email_body?: string;
      whatsapp_text?: string;
    }
  };
}

export interface EventCollaborator {
  id: string;
  event_id: string;
  producer_id: string;
  photographer_id?: string;
  invited_email: string;
  status: 'pending' | 'accepted' | 'declined';
  coordinator_commission_percent: number;
  created_at: string;
  accepted_at?: string;
  photographer?: {
    id: string;
    name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
  };
  event?: PhotoEvent;
}

export interface ProducerWithStats extends User {
  eventsCount: number;
  collaboratorsCount: number;
  totalTeamPhotos: number;
  totalSalesCount: number;
  totalTeamRevenue: number;
  producerCommissionTotal: number;
}

export interface PhotographerWithStats extends User {
  photoCount: number;
  totalPhotos?: number;
  hasPhotos?: boolean;
  salesCount: number;
  commissionValue: number;
  commissionRate: number;
  likesCount: number;
  avgRating: number; // 0-5
  reviewCount: number;
  approvalPercentage: number; // 0-100

  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
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
  thumb_url?: string;
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
  is_face_indexed?: boolean;
  event_id?: string;
  sales_count: number;
  media_type?: 'photo' | 'video';
  video_uid?: string;
  video_duration?: number;
  file_size_bytes?: number;
  sub_group?: string | null;
  original_filename?: string;
}

export interface PhotoEvent {
  id: string;
  photographer_id: string;
  producer_id?: string;
  producer_commission_percent?: number;
  category_id: string;
  name: string;
  description?: string;
  location?: string;
  event_date: string;
  cover_photo_url?: string;
  created_at: string;
  allow_discounts?: boolean;
  is_featured?: boolean;
  is_photos_private?: boolean; // false = público (padrão), true = oculto (apenas busca facial)
  photographer?: {
    name: string;
    avatar_url?: string;
    is_active?: boolean;
  };
  collaborators?: EventCollaborator[];
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
  userPhone?: string;
  items: CartItem[];
  date: string;
  status: 'pending' | 'recovered' | 'contacted' | 'converted' | 'lost';
}

export interface PurchasedPhoto extends Photo {
  purchase_date: string;
  sale_id: string;
  paid_price?: number;
  photographer_name?: string;
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
  buyer_email?: string | null;
  buyer_phone?: string | null;
  sale_date: string;
  price: number;
  commission: number;
  status?: string;
  billing_id?: string | null;
  commission_rate?: number;
  photographer_id?: string;
  photo?: any;
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
  balance_pending?: number;
  balance_available?: number;
}

export interface CommissionSettings {
  defaultRate: number;
  defaultVideoRate?: number;
  customRates: {
    [photographerId: string]: number;
  };
  customVideoRates?: {
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
  welcomePhotographer: EmailTemplate;
  welcomeCustomer: EmailTemplate;
  purchaseConfirmation: EmailTemplate;
}

export interface Review {
  id: string;
  photographer_id: string;
  reviewer_id: string;
  rating: number; // 1-5
  comment?: string;
  created_at: string;
  reviewer?: { name: string; avatar_url?: string };
}

export type ReportReason = 'conteudo_inapropriado' | 'perfil_falso' | 'violacao_direitos' | 'assedio' | 'spam' | 'outro';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  photographer_id: string;
  reporter_id: string | null;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  admin_note?: string;
  created_at: string;
  resolved_at?: string;
  reporter?: { name: string; avatar_url?: string };
}

export type PageRoute =
  { name: 'home' } |
  { name: 'find-photos', initialSearch?: string } |
  { name: 'login' } |
  { name: 'register' } |
  { name: 'pending-approval' } |
  { name: 'admin' } |
  { name: 'photographer' } |
  { name: 'producer' } |
  { name: 'customer-dashboard' } |
  { name: 'category', id: string } |
  { name: 'event', id: string } |
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
  { name: 'checkout-success'; photoIds?: string[] } |
  { name: 'welcome'; role?: 'photographer' | 'customer' | 'producer' | 'pending-approval' } |

  { name: 'face-search' } |
  { name: 'not-found' } |
  { name: 'reset-password', token?: string };

export interface RegisterResponse {
  user: User | null;
  session: any | null; // Supabase Session
}

export type Page = PageRoute & {
  toastMessage?: string;
  toastType?: 'success' | 'error' | 'info';
};
