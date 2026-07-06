import {
  User,
  Photo,
  Category,
  UserRole,
  PhotographerWithStats,
  Sale,
  Payout,
  PhotographerBalance,
  CommissionSettings,
  EmailTemplates,
  Coupon,
  PhotoQualityAnalysis,
  PurchasedPhoto,
  AbandonedCart,
  BulkDiscountRule,
  BankInfo,
  PayoutStatus,
  Review,
  Report,
  ReportReason,
  ReportStatus,
  PhotoEvent,
  RegisterResponse,
} from "../types";
import { supabase } from "./supabaseClient";
import bcrypt from "bcryptjs";

const API_URL = '/api';

// --- HELPER FUNCTIONS ---

// Formatar nome: "MARCIA M FEITOSA" -> "Marcia M Feitosa"
const formatNameAsTitleCase = (name: string): string => {
  if (!name) return name;
  const lowerCaseWords = ["de", "da", "do", "das", "dos", "e", "van", "von"];
  return name
    .toLowerCase()
    .split(/\s+/) // Separar por espaços garantindo que 2 espaços virem 1
    .map((word, index) => {
      if (word.length === 0) return word;
      if (index !== 0 && lowerCaseWords.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .trim();
};

const mapUser = (dbUser: any): User => {
  if (!dbUser) return {} as User;
  return {
    id: dbUser.id,
    role: dbUser.role as UserRole,
    name: formatNameAsTitleCase(dbUser.name),
    email: dbUser.email,
    slug: dbUser.slug,
    bio: dbUser.bio,
    avatar_url: dbUser.avatar_url,
    banner_url: dbUser.banner_url,
    location: dbUser.location,
    social_instagram: dbUser.social_instagram,
    is_active: dbUser.is_active,
    bulkDiscountRules: dbUser.bulk_discount_rules || [],
    bank_info: dbUser.bank_info || undefined,
    pix_key: dbUser.pix_key,
    pix_key_type: dbUser.pix_key_type,
    payout_frequency: dbUser.payout_frequency || 'diario',
    liability_waiver_accepted_at: dbUser.liability_waiver_accepted_at,
    phone: dbUser.phone,
    communication_templates: dbUser.communication_templates || undefined,
  };
};

const mapPhoto = (dbPhoto: any): Photo => {
  if (!dbPhoto) return {} as Photo;

  // Extract liked_by_users if it was included in the query
  let likedByUsers: string[] = [];
  if (dbPhoto.photo_likes && Array.isArray(dbPhoto.photo_likes)) {
    likedByUsers = dbPhoto.photo_likes.map((like: any) => like.user_id);
  }

  return {
    id: dbPhoto.id,
    photographer_id: dbPhoto.photographer_id,
    category_id: dbPhoto.category_id,
    title: dbPhoto.title,
    description: dbPhoto.description || "",
    preview_url: dbPhoto.media_type === 'video' && dbPhoto.preview_url && dbPhoto.preview_url.includes('videodelivery.net') && !dbPhoto.preview_url.includes('?time=')
      ? `${dbPhoto.preview_url}?time=2s`
      : dbPhoto.preview_url,
    file_url: dbPhoto.file_url || "",
    thumb_url: dbPhoto.media_type === 'video' && dbPhoto.thumb_url && dbPhoto.thumb_url.includes('videodelivery.net') && !dbPhoto.thumb_url.includes('?time=')
      ? `${dbPhoto.thumb_url}?time=2s`
      : (dbPhoto.thumb_url || dbPhoto.preview_url),
    price: Number(dbPhoto.price),
    resolution: dbPhoto.resolution,
    width: dbPhoto.width,
    height: dbPhoto.height,
    tags: dbPhoto.tags || [],
    is_public: dbPhoto.is_public,
    upload_date: dbPhoto.created_at,
    moderation_status: dbPhoto.moderation_status,
    rejection_reason: dbPhoto.rejection_reason,
    is_featured: dbPhoto.is_featured,
    likes: dbPhoto.likes_count || 0,
    liked_by_users: likedByUsers,
    quality_analysis: dbPhoto.quality_analysis || undefined,
    is_face_indexed: dbPhoto.is_face_indexed,
    event_id: dbPhoto.event_id,
    sales_count: dbPhoto.sales_count || 0,
    media_type: dbPhoto.media_type,
    video_uid: dbPhoto.video_uid,
    video_duration: dbPhoto.video_duration,
    file_size_bytes: dbPhoto.file_size_bytes,
    sub_group: dbPhoto.sub_group,
  };
};

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const inMemoryCache: {
  categories: { data: Category[] | null, ts: number },
  featured: { data: Photo[] | null, ts: number },
  recent: { data: Photo[] | null, ts: number },
  activePhotographers: { data: PhotographerWithStats[] | null, ts: number },
  allPhotographers: { data: PhotographerWithStats[] | null, ts: number },
  allEvents: { data: PhotoEvent[] | null, ts: number },
  userCache: Record<string, { data: User, ts: number }>,
  photographerPhotosCache: Record<string, { data: Photo[], ts: number }>,
  photographerEventsCache: Record<string, { data: PhotoEvent[], ts: number }>
} = {
  categories: { data: null, ts: 0 },
  featured: { data: null, ts: 0 },
  recent: { data: null, ts: 0 },
  activePhotographers: { data: null, ts: 0 },
  allPhotographers: { data: null, ts: 0 },
  allEvents: { data: null, ts: 0 },
  userCache: {},
  photographerPhotosCache: {},
  photographerEventsCache: {}
};

export const api = {
  // --- PHOTOS ---
  getFeaturedPhotos: async (): Promise<Photo[]> => {
    const now = Date.now();
    if (inMemoryCache.featured.data && (now - inMemoryCache.featured.ts < CACHE_TTL)) {
      return inMemoryCache.featured.data;
    }
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, preview_url, thumb_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags, sales_count",
      )
      .eq("is_featured", true)
      .eq("moderation_status", "approved")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) {
      console.warn("Error fetching featured photos:", error);
      return [];
    }
    const result = data ? data.map(mapPhoto) : [];
    inMemoryCache.featured = { data: result, ts: now };
    return result;
  },

  searchPhotos: async (searchTerm: string, categoryId?: string): Promise<Photo[]> => {
    const { normalizeString, includesNormalized } = await import("../utils/stringUtils");
    const cleanTerm = (searchTerm || "").trim();

    // Conjuntos para armazenar IDs que batem com a busca
    let matchingCategoryIds: string[] = [];
    let matchingEventIds: string[] = [];
    let matchingPhotographerIds: string[] = [];

    if (cleanTerm) {
      try {
        // Para busca verdadeiramente insensível a acentos no Supabase sem a extensão unaccent,
        // buscamos os registros e filtramos no JS para obter os IDs.
        const [catRes, eventRes, photogRes] = await Promise.all([
          supabase.from("categories").select("id, name"),
          supabase.from("events").select("id, name"),
          supabase.from("users").select("id, name").eq("role", "photographer")
        ]);

        if (catRes.data) {
          matchingCategoryIds = catRes.data
            .filter(c => includesNormalized(c.name, cleanTerm))
            .map(c => c.id);
        }
        if (eventRes.data) {
          matchingEventIds = eventRes.data
            .filter(e => includesNormalized(e.name, cleanTerm))
            .map(e => e.id);
        }
        if (photogRes.data) {
          matchingPhotographerIds = photogRes.data
            .filter(p => includesNormalized(p.name, cleanTerm))
            .map(p => p.id);
        }

      } catch (err) {
        console.warn("Error fetching related entities for search:", err);
      }
    }

    let query = supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, preview_url, thumb_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags, event_id, sales_count",
      )
      .eq("moderation_status", "approved")
      .eq("is_public", true);

    if (categoryId && categoryId !== 'all') {
      query = query.eq("category_id", categoryId);
    }

    if (cleanTerm) {
      // Filtros básicos: título e tags
      let conditions = [
        `title.ilike.%${cleanTerm}%`,
        `tags.cs.{${cleanTerm}}`
      ];

      // Adicionamos categorias correspondentes
      if (matchingCategoryIds.length > 0) {
        conditions.push(`category_id.in.(${matchingCategoryIds.join(",")})`);
      }

      // Adicionamos eventos correspondentes
      if (matchingEventIds.length > 0) {
        conditions.push(`event_id.in.(${matchingEventIds.join(",")})`);
      }

      // Adicionamos fotógrafos correspondentes
      if (matchingPhotographerIds.length > 0) {
        conditions.push(`photographer_id.in.(${matchingPhotographerIds.join(",")})`);
      }

      // Aplicamos o filtro OR universal
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Critical error in searchPhotos:", error);
      return [];
    }
    return data ? data.map(mapPhoto) : [];
  },

  getAllPhotos: async (photographerId?: string, shuffle: boolean = false, onlyPublic: boolean = false): Promise<Photo[]> => {
    const limit = shuffle ? 500 : 2000;
    let query = supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, preview_url, thumb_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags, event_id, sales_count",
      );

    if (photographerId) {
      query = query.eq("photographer_id", photographerId);
    }

    if (onlyPublic) {
      query = query.eq("moderation_status", "approved").eq("is_public", true);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Error fetching all photos:", error);
      return [];
    }
    let resultData = data || [];
    if (shuffle) resultData = shuffleArray(resultData);
    return resultData.map(mapPhoto);
  },

  getRecentPhotos: async (limit: number = 8): Promise<Photo[]> => {
    const now = Date.now();
    // Cache only if limit is 8 (the default for home page)
    if (limit === 8 && inMemoryCache.recent.data && (now - inMemoryCache.recent.ts < CACHE_TTL)) {
      return inMemoryCache.recent.data;
    }
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, preview_url, thumb_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags, sales_count",
      )
      .eq("moderation_status", "approved")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("Error fetching recent photos:", error);
      return [];
    }
    const result = data ? data.map(mapPhoto) : [];
    if (limit === 8) {
      inMemoryCache.recent = { data: result, ts: now };
    }
    return result;
  },

  getPhotosByCategoryId: async (
    categoryId: string,
    shuffle: boolean = false,
  ): Promise<Photo[]> => {
    const limit = shuffle ? 100 : 500;
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, preview_url, thumb_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags, sales_count",
      )
      .eq("category_id", categoryId)
      .eq("moderation_status", "approved")
      .eq("is_public", true)
      .limit(limit);
    if (error) throw error;
    let resultData = data || [];
    if (shuffle) resultData = shuffleArray(resultData);
    return resultData.map(mapPhoto);
  },

  getPhotoById: async (id: string): Promise<Photo | undefined> => {
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, description, preview_url, file_url, thumb_url, price, resolution, width, height, tags, is_public, created_at, moderation_status, rejection_reason, is_featured, likes_count, quality_analysis, is_face_indexed, event_id, sales_count, media_type, video_uid, video_duration, file_size_bytes, photo_likes(user_id)",
      )
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found is not an error here
      throw error;
    }
    return mapPhoto(data);
  },

  getPhotosByIds: async (ids: string[]): Promise<Photo[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, description, preview_url, thumb_url, price, resolution, width, height, tags, is_public, created_at, moderation_status, rejection_reason, is_featured, likes_count, quality_analysis, is_face_indexed, event_id, sales_count, media_type, video_uid, video_duration, file_size_bytes, photo_likes(user_id)",
      )
      .in("id", ids);

    if (error) throw error;
    return data ? data.map(mapPhoto) : [];
  },

  getPhotosByPhotographerId: async (
    photographerId: string,
  ): Promise<Photo[]> => {
    const now = Date.now();
    const cached = inMemoryCache.photographerPhotosCache[photographerId];
    if (cached && (now - cached.ts < CACHE_TTL)) {
      return cached.data;
    }

    // Otimização: Sem loop 'while'. Fetch de até 150 fotos recentes. 
    // Evita crash de browser por payload massivo.
    const limit = 150;
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, description, preview_url, thumb_url, price, resolution, width, height, tags, is_public, created_at, moderation_status, rejection_reason, is_featured, likes_count, quality_analysis, is_face_indexed, event_id, sales_count, media_type, video_uid, video_duration, file_size_bytes, photo_likes(user_id)",
      )
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    const allData = data || [];
    
    const result = allData.map(mapPhoto);
    inMemoryCache.photographerPhotosCache[photographerId] = { data: result, ts: now };
    return result;
  },

  createPhoto: async (data: any): Promise<Photo> => {
    const { data: result, error } = await supabase.rpc("upload_photo", {
      p_photographer_id: data.photographer_id,
      p_category_id: data.category_id,
      p_title: data.title,
      p_description: data.description || "",
      p_price: data.price,
      p_preview_url: data.preview_url,
      p_file_url: data.file_url || "",
      p_thumb_url: data.thumb_url || "", // Pass thumb
      p_resolution: data.resolution || "4K",
      p_width: data.width !== undefined && data.width !== null ? data.width : null,
      p_height: data.height !== undefined && data.height !== null ? data.height : null,
      p_tags: data.tags || [],
      p_is_public: data.is_public,
      p_is_featured: false, // Default
      p_event_id: data.event_id || null,
    });

    if (error) throw error;

    // The RPC returns a JSON object { success: boolean, original_error?: string, data?: photo_row }
    // We need to parse/check it.
    // Note: Supabase RPC returns the JSONB directly as data.

    if (error) {
      console.error("Supabase RPC Error (upload_photo):", error);
      throw new Error(error.message || "Erro de comunicação com o servidor de fotos.");
    }

    if (!result || !result.success) {
      throw new Error(result?.error || "O servidor recusou o envio da foto.");
    }

    // Map the returned data (which is the raw photo row) to our Photo type
    const photo = mapPhoto(result.data);

    // Se tivermos campos extras que o RPC original não suporta, fazemos um update
    const extraFields: any = {};
    if (data.media_type) extraFields.media_type = data.media_type;
    if (data.video_uid) extraFields.video_uid = data.video_uid;
    if (data.video_duration !== undefined) extraFields.video_duration = data.video_duration;
    if (data.file_size_bytes !== undefined) extraFields.file_size_bytes = data.file_size_bytes;
    if (data.sub_group !== undefined) extraFields.sub_group = data.sub_group;

    if (Object.keys(extraFields).length > 0) {
      const { error: updateError } = await supabase
        .from('photos')
        .update(extraFields)
        .eq('id', photo.id);
      
      if (updateError) console.error("Error updating extra fields:", updateError);

      // Invalidate photographer photos cache
      delete inMemoryCache.photographerPhotosCache[data.photographer_id];
      inMemoryCache.recent = { data: null, ts: 0 };
      inMemoryCache.featured = { data: null, ts: 0 };

      return { ...photo, ...extraFields };
    }

    // Invalidate photographer photos cache
    delete inMemoryCache.photographerPhotosCache[data.photographer_id];
    inMemoryCache.recent = { data: null, ts: 0 };
    inMemoryCache.featured = { data: null, ts: 0 };

    return photo;
  },

  updatePhoto: async (id: string, data: any): Promise<Photo | undefined> => {
    // Remove computed fields that are not columns in the database
    const { likes, liked_by_users, ...dbData } = data;
    const { data: updatedPhoto, error } = await supabase
      .from("photos")
      .update(dbData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    const mapped = mapPhoto(updatedPhoto);
    if (mapped.photographer_id) {
      delete inMemoryCache.photographerPhotosCache[mapped.photographer_id];
      inMemoryCache.recent = { data: null, ts: 0 };
      inMemoryCache.featured = { data: null, ts: 0 };
    }
    return mapped;
  },

  deletePhoto: async (id: string): Promise<boolean> => {
    const photo = await api.getPhotoById(id);
    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) throw error;

    if (photo) {
      delete inMemoryCache.photographerPhotosCache[photo.photographer_id];
      inMemoryCache.recent = { data: null, ts: 0 };
      inMemoryCache.featured = { data: null, ts: 0 };
    }
    return true;
  },

  updatePhotographer: async (id: string, data: Partial<User>) => {
    // Explicitly map camelCase JS properties to snake_case DB columns
    const dbData: { [key: string]: any } = {};

    Object.entries(data).forEach(([key, value]) => {
      if (key === "bulkDiscountRules") {
        dbData["bulk_discount_rules"] = value;
      } else if (key === "name" && typeof value === "string") {
        dbData[key] = formatNameAsTitleCase(value);
      } else {
        dbData[key] = value;
      }
    });

    const { error } = await supabase.from("users").update(dbData).eq("id", id);

    if (error) {
      console.error("Supabase update error:", error);
      throw error;
    }

    const { data: updatedUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    const mappedUser = mapUser(updatedUser);
    inMemoryCache.userCache[id] = { data: mappedUser, ts: Date.now() };
    inMemoryCache.allPhotographers = { data: null, ts: 0 };
    inMemoryCache.activePhotographers = { data: null, ts: 0 };
    return mappedUser;
  },

  getSalesByPhotographerId: async (
    photographerId: string,
    limit?: number,
  ): Promise<Sale[]> => {
    let query = supabase
      .from("sales")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("sale_date", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Error fetching sales:", error);
      return [];
    }

    // We need buyer name, let's fetch it or map it if possible contextually
    let joinQuery = supabase
      .from("sales")
      .select("*, buyer:users!buyer_id(name), photo:photos(title, preview_url, thumb_url, photographer_id)")
      .eq("photographer_id", photographerId)
      .order("sale_date", { ascending: false });

    if (limit) {
      joinQuery = joinQuery.limit(limit);
    }

    const { data: salesWithBuyer, error: joinError } = await joinQuery;

    if (joinError) {
      console.warn("Error fetching sales with buyer details:", joinError);
      // Fallback to simple data without name
      return data
        ? data.map((s: any) => ({ ...s, buyer_name: "Cliente" }))
        : [];
    }

    return salesWithBuyer
      ? salesWithBuyer.map((s: any) => ({
        ...s,
        buyer_name: s.buyer?.name || "Cliente",
        photo: s.photo ? {
          title: s.photo.title,
          preview_url: s.photo.preview_url,
          thumb_url: s.photo.thumb_url,
          photographer_id: s.photo.photographer_id
        } : null
      }))
      : [];
  },

  getPhotographerBalanceById: async (
    photographerId: string,
  ): Promise<PhotographerBalance | undefined> => {
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", photographerId)
        .single();
      if (userError && userError.code !== "PGRST116") throw userError;
      const user = userData ? mapUser(userData) : null;

      if (!user) {
        const tempUser: User = {
          id: photographerId,
          role: UserRole.PHOTOGRAPHER,
          name: "Fotógrafo",
          email: "",
          avatar_url: "",
          is_active: false,
        };
        return {
          ...tempUser,
          photoCount: 0,
          salesCount: 0,
          commissionValue: 0,
          commissionRate: 0.15,
          totalSalesGross: 0,
          totalPlatformFees: 0,
          totalEarnings: 0,
          totalPaid: 0,
          currentBalance: 0,
          likesCount: 0,
          avgRating: 0,
          reviewCount: 0,
          approvalPercentage: 0,
          approvedCount: 0,
          rejectedCount: 0,
          pendingCount: 0,
        };
      }

      // 1. Fetch from the new wallet summary view for financial metrics
      const { data: walletData, error: walletError } = await supabase
        .from("photographer_wallet_summary")
        .select("*")
        .eq("photographer_id", photographerId)
        .single();

      if (walletError && walletError.code !== "PGRST116") {
        console.warn("Error fetching from photographer_wallet_summary:", walletError);
      }

      // 2. Fetch basic photo stats
      const { count: photoCount } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("photographer_id", photographerId);

      // 3. Get commission settings
      const settings = await api.getCommissionSettings();
      let effectiveRate = settings.defaultRate;
      if (settings.customRates && settings.customRates[photographerId] !== undefined) {
        effectiveRate = settings.customRates[photographerId];
      }

      // 4. Fetch sales count via a lightweight head count query (huge optimization)
      const { count: salesCount, error: salesCountError } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .eq("photographer_id", photographerId);

      if (salesCountError) {
        console.warn("Error counting photographer sales:", salesCountError);
      }

      // 5. Fetch likes
      const { data: photoLikes } = await supabase
        .from("photos")
        .select("likes_count")
        .eq("photographer_id", photographerId);
      const totalLikes = photoLikes
        ? photoLikes.reduce((sum, p) => sum + (p.likes_count || 0), 0)
        : 0;

      return {
        ...user,
        photoCount: photoCount || 0,
        salesCount: salesCount || 0,
        commissionValue: walletData?.total_platform_fees || 0,
        commissionRate: effectiveRate,
        totalSalesGross: walletData?.total_sales_gross || 0,
        totalPlatformFees: walletData?.total_platform_fees || 0,
        totalEarnings: (walletData?.balance_pending || 0) + (walletData?.balance_available || 0) + (walletData?.total_withdrawn || 0),
        totalPaid: walletData?.total_withdrawn || 0,
        currentBalance: walletData?.balance_available || 0,
        balance_pending: walletData?.balance_pending || 0,
        balance_available: walletData?.balance_available || 0,
        likesCount: totalLikes,
        avgRating: 0,
        reviewCount: 0,
        approvalPercentage: 0,
        approvedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
      };
    } catch (error) {
      console.error(
        `Failed to fetch and calculate balance for ${photographerId}`,
        error,
      );
      throw error;
    }
  },

  createCoupon: async (couponData: Omit<Coupon, "id">): Promise<Coupon> => {
    const { data, error } = await supabase
      .from("coupons")
      .insert(couponData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getCouponsByPhotographerId: async (
    photographerId: string,
  ): Promise<Coupon[]> => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("photographer_id", photographerId);
    if (error) throw error;
    return data || [];
  },

  deleteCoupon: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  approvePhotosBatch: async (photoIds: string[]): Promise<boolean> => {
    const { error } = await supabase
      .from("photos")
      .update({ moderation_status: "approved", rejection_reason: null })
      .in("id", photoIds);
    if (error) throw error;
    return true;
  },
  toggleLike: async (
    photoId: string,
    userId: string,
  ): Promise<{ success: boolean; newLikes: number; isLiked: boolean }> => {
    try {
      // Check if user already liked this photo
      const { data: existingLike, error: checkError } = await supabase
        .from("photo_likes")
        .select("id")
        .eq("photo_id", photoId)
        .eq("user_id", userId)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "not found" which is expected if no like exists
        throw checkError;
      }

      let isLiked: boolean;

      if (existingLike) {
        // Unlike: Remove the like
        const { error: deleteError } = await supabase
          .from("photo_likes")
          .delete()
          .eq("photo_id", photoId)
          .eq("user_id", userId);

        if (deleteError) throw deleteError;
        isLiked = false;
      } else {
        // Like: Add the like
        const { error: insertError } = await supabase
          .from("photo_likes")
          .insert({ photo_id: photoId, user_id: userId });

        if (insertError) throw insertError;
        isLiked = true;
      }

      // Get updated like count
      const { count, error: countError } = await supabase
        .from("photo_likes")
        .select("*", { count: "exact", head: true })
        .eq("photo_id", photoId);

      if (countError) throw countError;

      const newLikes = count || 0;

      // Update the likes_count in the photos table for denormalization
      await supabase
        .from("photos")
        .update({ likes_count: newLikes })
        .eq("id", photoId);

      return { success: true, newLikes, isLiked };
    } catch (error) {
      console.error("Error toggling like:", error);
      return { success: false, newLikes: 0, isLiked: false };
    }
  },
  getPhotoLikers: async (photoId: string): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from("photo_likes")
        .select("user_id, user:users!photo_likes_user_id_fkey(*)")
        .eq("photo_id", photoId);

      if (error) throw error;

      if (!data) return [];

      // Check for integrity issues (join returned null users)
      const hasNullUsers = data.some((item: any) => !item.user);
      if (hasNullUsers) {
        throw new Error("Join failed - null users returned from DB");
      }

      // Map the nested user object
      return data
        .map((item: any) => mapUser(item.user))
        .filter((u: User) => u.id);
    } catch (error) {
      // Fallback: Manual join if relation name is different, missing, or RLS blocks join
      console.warn(
        "Error fetching likers with foreign key, trying manual join",
        error,
      );

      const { data: likes } = await supabase
        .from("photo_likes")
        .select("user_id")
        .eq("photo_id", photoId);

      if (!likes || likes.length === 0) return [];

      const userIds = likes.map((l) => l.user_id);

      // Fetch users manually
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .in("id", userIds);

      return users ? users.map(mapUser) : [];
    }
  },
  getCategories: async (): Promise<Category[]> => {
    const now = Date.now();
    if (inMemoryCache.categories.data && (now - inMemoryCache.categories.ts < CACHE_TTL)) {
      return inMemoryCache.categories.data;
    }
    // Trazendo image_url de volta. Recomendamos remover qualquer Base64 gigante do banco de dados e usar URLs (ex: webhooks, unsplash, supabase storage) para não sobrecarregar a api.
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, sort_order, image_url")
      .order("sort_order", { ascending: true });
    if (error) {
      console.warn("Could not fetch categories", error);
      return [];
    }

    const result = data || [];
    inMemoryCache.categories = { data: result, ts: now };
    return result;
  },
  getCategoryById: async (id: string): Promise<Category | undefined> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },
  createCategory: async (data: {
    name: string;
    image_url: string;
  }): Promise<Category> => {
    // Generate a simple slug from name
    const slug = data.name
      .toLowerCase()
      .normalize("NFD") // decompose accents
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]+/g, "-") // replace non-alphanum with dash
      .replace(/^-+|-+$/g, ""); // remove leading/trailing dashes

    const { data: newCategory, error } = await supabase
      .from("categories")
      .insert({ ...data, slug })
      .select()
      .single();

    if (error) throw error;
    return newCategory;
  },
  updateCategory: async (
    id: string,
    data: { name: string; image_url: string },
  ): Promise<Category | undefined> => {
    // Regenerate slug on update? Usually better to keep stable unless explicitly requested,
    // but for simple cats syncing slug to name is often expected.
    const slug = data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data: updatedCategory, error } = await supabase
      .from("categories")
      .update({ ...data, slug })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return updatedCategory;
  },
  updateCategoriesOrder: async (categories: Category[]): Promise<boolean> => {
    // We use upsert to update multiple records.
    // We map to match the DB columns exactly.
    const updates = categories.map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image_url: cat.image_url,
      sort_order: index, // Update the order based on array position
    }));

    const { error } = await supabase.from("categories").upsert(updates);

    if (error) {
      console.error("Error reordering categories:", error);
      throw error;
    }
    return true;
  },
  deleteCategory: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) throw error;
    return true;
  },
  getPhotographers: async (): Promise<PhotographerWithStats[]> => {
    const now = Date.now();
    if (inMemoryCache.allPhotographers.data && (now - inMemoryCache.allPhotographers.ts < CACHE_TTL)) {
      return inMemoryCache.allPhotographers.data;
    }

    // 1. Get stats via RPC + reviews in parallel
    const [{ data, error }, { data: reviewsData }] = await Promise.all([
      supabase.rpc("get_photographers_with_stats"),
      supabase.from("reviews").select("photographer_id, rating"),
    ]);

    if (error) {
      console.error("Error fetching photographer stats via RPC:", error);
      // alert("Error RPC Photographers: " + JSON.stringify(error));
      throw error;
    }

    // 2. Build avgRating map from reviews
    const ratingMap: Record<string, { sum: number; count: number }> = {};
    for (const r of (reviewsData ?? []) as { photographer_id: string; rating: number }[]) {
      if (!ratingMap[r.photographer_id]) ratingMap[r.photographer_id] = { sum: 0, count: 0 };
      ratingMap[r.photographer_id].sum += r.rating;
      ratingMap[r.photographer_id].count += 1;
    }

    // 3. Get Commission Settings
    const settings = await api.getCommissionSettings();

    // 4. Map result
    const result = (data as any[]).map((row) => {
      const user = mapUser(row.user_data);

      let effectiveRate = settings.defaultRate;
      if (settings.customRates && settings.customRates[user.id] !== undefined) {
        effectiveRate = settings.customRates[user.id];
      }

      const rm = ratingMap[user.id];
      const reviewCount = rm?.count ?? 0;
      const avgRating = reviewCount > 0 ? rm.sum / reviewCount : 0;

      return {
        ...user,
        photoCount: Number(row.photo_cnt),
        salesCount: Number(row.sales_cnt),
        commissionValue: Number(row.comm_val),
        pendingCount: Number(row.pending_cnt),
        approvedCount: Number(row.approved_cnt),
        rejectedCount: Number(row.rejected_cnt),
        commissionRate: effectiveRate,
        likesCount: Number(row.likes_cnt),
        avgRating,
        reviewCount,
        approvalPercentage: reviewCount > 0 ? (rm.sum / reviewCount / 5) * 100 : 0,
      };
    });

    inMemoryCache.allPhotographers = { data: result, ts: now };
    return result;
  },
  getPhotographerById: async (id: string): Promise<User | undefined> => {
    const now = Date.now();
    const cached = inMemoryCache.userCache[id];
    if (cached && (now - cached.ts < CACHE_TTL)) {
      return cached.data;
    }
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found is not an error here
      throw error;
    }
    const user = mapUser(data);
    inMemoryCache.userCache[id] = { data: user, ts: now };
    return user;
  },
  getPhotographerBySlug: async (slug: string): Promise<User | undefined> => {
    const now = Date.now();
    const cachedEntry = Object.values(inMemoryCache.userCache).find(
      (c) => c.data.slug === slug
    );
    if (cachedEntry && (now - cachedEntry.ts < CACHE_TTL)) {
      return cachedEntry.data;
    }
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) {
      if (error.code === "PGRST116") return undefined;
      throw error;
    }
    const user = mapUser(data);
    inMemoryCache.userCache[user.id] = { data: user, ts: now };
    return user;
  },
  getActivePhotographersPreview: async (): Promise<PhotographerWithStats[]> => {
    const now = Date.now();
    if (inMemoryCache.activePhotographers.data && (now - inMemoryCache.activePhotographers.ts < CACHE_TTL)) {
      return inMemoryCache.activePhotographers.data;
    }

    try {
      const allPhotogs = await api.getPhotographers();
      const result = allPhotogs.filter(p => p.is_active);

      inMemoryCache.activePhotographers = { data: result, ts: now };
      return result;
    } catch (error) {
      console.warn("Could not fetch active photographers preview", error);
      return [];
    }
  },

  // --- EVENTS ---
  getAllPublicEvents: async (): Promise<PhotoEvent[]> => {
    const now = Date.now();
    if (inMemoryCache.allEvents.data && (now - inMemoryCache.allEvents.ts < CACHE_TTL)) {
      return inMemoryCache.allEvents.data;
    }

    const { data, error } = await supabase
      .from("events")
      .select("*, photographer:photographer_id(name, avatar_url, is_active)")
      .order("event_date", { ascending: false });

    if (error) {
      console.error("Error fetching all events:", error);
      return [];
    }

    const validEvents = (data || []).filter((e: any) => {
      return e.photographer && e.photographer.is_active && e.photographer.avatar_url;
    });

    const result = validEvents as PhotoEvent[];
    inMemoryCache.allEvents = { data: result, ts: now };
    return result;
  },

  getEventById: async (eventId: string): Promise<PhotoEvent | null> => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error("Error fetching event:", error);
      return null;
    }
    return data as PhotoEvent;
  },

  getEventsByCategoryId: async (categoryId: string): Promise<PhotoEvent[]> => {
    const { data, error } = await supabase
      .from("events")
      .select("*, photographer:photographer_id(name, avatar_url, is_active)")
      .eq("category_id", categoryId)
      .order("event_date", { ascending: false });

    if (error) {
      console.error("Error fetching events by category:", error);
      return [];
    }

    const validEvents = (data || []).filter((e: any) => {
      return e.photographer && e.photographer.is_active && e.photographer.avatar_url;
    });

    return validEvents as PhotoEvent[];
  },

  getPhotosByEventId: async (eventId: string): Promise<Photo[]> => {
    let allData: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("photos")
        .select(
          "id, photographer_id, category_id, title, preview_url, thumb_url, price, resolution, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags, event_id, sales_count, media_type, video_uid, video_duration, file_size_bytes, sub_group",
        )
        .eq("event_id", eventId)
        .eq("moderation_status", "approved")
        .eq("is_public", true)
        .order("created_at", { ascending: true })
        .range(from, from + limit - 1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < limit) {
          hasMore = false;
        } else {
          from += limit;
        }
      } else {
        hasMore = false;
      }
    }

    return allData.length > 0 ? allData.map(mapPhoto) : [];
  },

  getPhotographerPhotosByEventId: async (eventId: string): Promise<Photo[]> => {
    let allData: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("photos")
        .select(
          "id, photographer_id, category_id, title, description, preview_url, thumb_url, price, resolution, width, height, tags, is_public, created_at, moderation_status, rejection_reason, is_featured, likes_count, quality_analysis, is_face_indexed, event_id, sales_count, media_type, video_uid, video_duration, file_size_bytes, photo_likes(user_id), sub_group"
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .range(from, from + limit - 1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < limit) {
          hasMore = false;
        } else {
          from += limit;
        }
      } else {
        hasMore = false;
      }
    }

    return allData.length > 0 ? allData.map(mapPhoto) : [];
  },

  createEvent: async (
    eventData: Omit<PhotoEvent, "id" | "created_at">,
  ): Promise<PhotoEvent> => {
    // Force usage of the currently authenticated user's ID for RLS compliance
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Auth Error details:", userError);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.error("Fallback Session check:", session);
      throw new Error(
        `Sessão inválida (User: ${userError?.message || "null"}, Session: ${session ? "exists" : "null"}). Recarregue a página.`,
      );
    }

    const finalEventData = {
      ...eventData,
      photographer_id: user.id,
    };

    const { data, error } = await supabase
      .from("events")
      .insert(finalEventData)
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      throw error;
    }

    // Invalidate event cache
    delete inMemoryCache.photographerEventsCache[user.id];
    inMemoryCache.allEvents = { data: null, ts: 0 };

    return data as PhotoEvent;
  },

  getPhotographerEvents: async (
    photographerId: string,
  ): Promise<PhotoEvent[]> => {
    const now = Date.now();
    const cached = inMemoryCache.photographerEventsCache[photographerId];
    if (cached && (now - cached.ts < CACHE_TTL)) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return [];
    }
    const result = data as PhotoEvent[];
    inMemoryCache.photographerEventsCache[photographerId] = { data: result, ts: now };
    return result;
  },

  getEventPhotoCounts: async (
    photographerId: string,
    eventIds?: string[],
    onlyPublicAndApproved: boolean = false,
  ): Promise<Record<string, number>> => {
    let ids = eventIds;
    
    if (!ids || ids.length === 0) {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id")
        .eq("photographer_id", photographerId);
      
      if (eventsError || !events) {
        console.error("Error fetching events for counts:", eventsError);
        return {};
      }
      ids = events.map((e: any) => e.id);
    }

    const counts: Record<string, number> = {};
    if (ids.length === 0) return counts;

    await Promise.all(
      ids.map(async (eventId) => {
        let query = supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId);
        
        if (onlyPublicAndApproved) {
          query = query
            .eq("moderation_status", "approved")
            .eq("is_public", true);
        }

        const { count, error } = await query;
        if (!error && count !== null) {
          counts[eventId] = count;
        }
      })
    );

    return counts;
  },

  deleteEvent: async (id: string): Promise<boolean> => {
    const { data: event } = await supabase.from("events").select("photographer_id").eq("id", id).single();
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error("Error deleting event:", error);
      return false;
    }

    if (event) {
      delete inMemoryCache.photographerEventsCache[event.photographer_id];
      inMemoryCache.allEvents = { data: null, ts: 0 };
    }
    return true;
  },

  updateEvent: async (
    id: string,
    updates: Partial<PhotoEvent>,
  ): Promise<PhotoEvent | null> => {
    // 1. Update the event
    const { data: updatedEvent, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating event:", error);
      return null;
    }

    // 2. If name or category changed, sync photos
    if (updates.name || updates.category_id) {
      try {
        const { data: photos, error: photosError } = await supabase
          .from("photos")
          .select("id, created_at")
          .eq("event_id", id)
          .order("created_at", { ascending: true }); // "primeira para a ultima"

        if (!photosError && photos && photos.length > 0) {
          // Prepare updates for each photo
          const photoUpdates = photos.map((photo, index) => {
            const sequence = (index + 1).toString().padStart(2, "0");
            const newTitle = updates.name
              ? `${sequence}-${updates.name}`
              : undefined; // Keep existing title if name didn't change (but logic-wise if category changed we might still want to refresh?)

            // Actually, if only category changed, we still need to fetch existing event name if we want to keep the title format
            // But usually name AND category are edited together or we can assume name is in updatedEvent
            const finalTitle = updates.name
              ? `${sequence}-${updates.name}`
              : `${sequence}-${updatedEvent.name}`;

            const updateObj: any = { title: finalTitle };
            if (updates.category_id) {
              updateObj.category_id = updates.category_id;
            }
            return { id: photo.id, ...updateObj };
          });

          // Supabase doesn't support bulk update with different values per row in a single call easily via .update().
          // We can use a loop or a specialized RPC if performance is an issue.
          // For now, since events usually don't have thousands of photos at once (or do they?), a sequence of updates or a single upsert if applicable.
          // Upsert works if we provide all required fields, but we only want to update.
          // Let's use promise.all for small batches or just loop.

          // Perform updates in parallel for better performance
          await Promise.all(
            photoUpdates.map(pUpdate =>
              supabase.from("photos").update(pUpdate).eq("id", pUpdate.id)
            )
          );
        }
      } catch (err) {
        console.error("Error syncing photo titles with event name:", err);
      }
    }

    if (updatedEvent && updatedEvent.photographer_id) {
      delete inMemoryCache.photographerEventsCache[updatedEvent.photographer_id];
      if (updates.name || updates.category_id) {
        delete inMemoryCache.photographerPhotosCache[updatedEvent.photographer_id];
      }
      inMemoryCache.allEvents = { data: null, ts: 0 };
    }

    return updatedEvent as PhotoEvent;
  },

  createReview: async (
    review: Omit<Review, "id" | "created_at">,
  ): Promise<Review | null> => {
    const { data, error } = await supabase
      .from("reviews")
      .insert(review)
      .select()
      .single();

    if (error) {
      console.error("Error creating review:", error);
      return null;
    }
    return data;
  },

  getPhotographerReviews: async (photographerId: string): Promise<Review[]> => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*, reviewer:reviewer_id(name, avatar_url)")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      return [];
    }
    return data;
  },
  deleteReview: async (reviewId: string): Promise<boolean> => {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) { console.error("Error deleting review:", error); return false; }
    return true;
  },

  createReport: async (report: Omit<Report, "id" | "created_at" | "resolved_at" | "status" | "admin_note" | "reporter">): Promise<Report | null> => {
    const { data, error } = await supabase
      .from("photographer_reports")
      .insert(report)
      .select()
      .single();
    if (error) { console.error("Error creating report:", error); return null; }
    return data;
  },

  getPhotographerReports: async (photographerId: string): Promise<Report[]> => {
    const { data, error } = await supabase
      .from("photographer_reports")
      .select("*, reporter:reporter_id(name, avatar_url)")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false });
    if (error) { console.error("Error fetching reports:", error); return []; }
    return data ?? [];
  },

  getAllReports: async (): Promise<Report[]> => {
    const { data, error } = await supabase
      .from("photographer_reports")
      .select("*, reporter:reporter_id(name, avatar_url)")
      .order("created_at", { ascending: false });
    if (error) { console.error("Error fetching all reports:", error); return []; }
    return data ?? [];
  },

  resolveReport: async (reportId: string, status: ReportStatus, adminNote?: string): Promise<boolean> => {
    const { error } = await supabase
      .from("photographer_reports")
      .update({ status, admin_note: adminNote ?? null, resolved_at: status !== 'pending' ? new Date().toISOString() : null })
      .eq("id", reportId);
    if (error) { console.error("Error resolving report:", error); return false; }
    return true;
  },

  getPhotosToReindex: async (limit: number = 50): Promise<Photo[]> => {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("is_face_indexed", false)
      .limit(limit);
    if (error) {
      console.error("Error fetching photos to re-index:", error);
      return [];
    }
    return data;
  },
  getPublicPhotographers: async (): Promise<PhotographerWithStats[]> => {
    const { data: users, error } = await supabase
      .from("users")
      .select("*, reviews!photographer_id(*)")
      .eq("role", "photographer")
      .eq("is_active", true);
    if (error) throw error;

    return users.map((u) => {
      const reviews = u.reviews || [];
      const reviewCount = reviews.length;
      const avgRating =
        reviewCount > 0
          ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
          reviewCount
          : 0;
      const approvedCount = reviews.filter((r: any) => r.rating >= 4).length;
      const approvalPercentage =
        reviewCount > 0 ? (approvedCount / reviewCount) * 100 : 0;

      return {
        ...mapUser(u),
        photoCount: 0,
        salesCount: 0,
        commissionValue: 0,
        commissionRate: 0.15,
        likesCount: 0,
        avgRating,
        reviewCount,
        approvalPercentage,
        approvedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
      };
    });
  },

  getAdminUser: async (): Promise<User | undefined> => undefined,
  getPhotographerUser: async (): Promise<User | undefined> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", "daian@example.com")
      .single();
    if (error) return undefined;
    return mapUser(data);
  },
  createPhotographer: async (
    data: Omit<User, "id" | "role">,
  ): Promise<User> => {
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({ ...data, role: UserRole.PHOTOGRAPHER })
      .select()
      .single();
    if (error) throw error;
    inMemoryCache.allPhotographers = { data: null, ts: 0 };
    inMemoryCache.activePhotographers = { data: null, ts: 0 };
    return mapUser(newUser);
  },
  deletePhotographer: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Get all photos of this photographer
      const { data: photos, error: photosErr } = await supabase
        .from("photos")
        .select("id")
        .eq("photographer_id", id);
      
      if (photosErr) throw photosErr;
      const photoIds = photos ? photos.map(p => p.id) : [];

      // 2. Identify sold photos
      let soldPhotoIds: string[] = [];
      if (photoIds.length > 0) {
        const { data: sales, error: salesErr } = await supabase
          .from("sales")
          .select("photo_id")
          .in("photo_id", photoIds);
        if (salesErr) throw salesErr;
        soldPhotoIds = sales ? sales.map(s => s.photo_id) : [];
      }
      const soldPhotoSet = new Set(soldPhotoIds);
      const unsoldPhotoIds = photoIds.filter(pid => !soldPhotoSet.has(pid));

      // 3. Delete related logs for all photos of the photographer (to avoid FK issues)
      if (photoIds.length > 0) {
        await supabase.from("download_logs").delete().in("photo_id", photoIds);
      }

      // 4. Delete unsold photos (Cascade will handle photo_likes and face_encodings)
      if (unsoldPhotoIds.length > 0) {
        const { error: delPhotosErr } = await supabase
          .from("photos")
          .delete()
          .in("id", unsoldPhotoIds);
        if (delPhotosErr) throw delPhotosErr;
      }

      // 5. Update sold photos to set photographer_id = null and is_public = false
      if (soldPhotoIds.length > 0) {
        const { error: updPhotosErr } = await supabase
          .from("photos")
          .update({ photographer_id: null, is_public: false })
          .in("id", soldPhotoIds);
        if (updPhotosErr) throw updPhotosErr;
      }

      // 6. Delete other photographer records (coupons, events, payouts, reviews, reports, storage_requests)
      await Promise.all([
        supabase.from("coupons").delete().eq("photographer_id", id),
        supabase.from("events").delete().eq("photographer_id", id),
        supabase.from("reviews").delete().eq("photographer_id", id),
        supabase.from("photographer_reports").delete().eq("photographer_id", id),
        supabase.from("payouts").delete().eq("photographer_id", id),
        supabase.from("storage_requests").delete().eq("photographer_id", id)
      ]);

      // 7. Update any sales to set photographer_id = null
      await supabase
        .from("sales")
        .update({ photographer_id: null })
        .eq("photographer_id", id);

      // 8. Delete the user from both public.users and auth.users via RPC
      const { error: rpcErr } = await supabase.rpc("admin_delete_user", {
        target_user_id: id,
      });
      if (rpcErr) throw rpcErr;

      inMemoryCache.allPhotographers = { data: null, ts: 0 };
      inMemoryCache.activePhotographers = { data: null, ts: 0 };
      delete inMemoryCache.userCache[id];

      return { success: true };
    } catch (e: any) {
      console.error("Error deleting photographer:", e);
      return { success: false, error: e.message || "Erro desconhecido ao excluir o fotógrafo." };
    }
  },
  getCustomers: async (): Promise<
    (User & { purchaseCount: number; totalSpent: number })[]
  > => {
    // 1. Fetch Customers
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "customer")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Error fetching customers:", error);
      return [];
    }

    if (!users || users.length === 0) return [];

    // 2. Fetch Sales for these customers to calculate stats
    const userIds = users.map((u) => u.id);
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("buyer_id, price")
      .in("buyer_id", userIds);

    if (salesError) {
      console.warn("Error fetching customer sales stats:", salesError);
      // Fallback: return users with 0 stats
      return users.map((u) => ({
        ...mapUser(u),
        purchaseCount: 0,
        totalSpent: 0,
      }));
    }

    // 3. Aggregate Stats
    return users.map((u) => {
      const userSales = sales?.filter((s) => s.buyer_id === u.id) || [];
      const totalSpent = userSales.reduce((sum, s) => sum + Number(s.price), 0);
      const purchaseCount = userSales.length;

      return {
        ...mapUser(u),
        purchaseCount,
        totalSpent,
      };
    });
  },
  createCustomer: async (data: {
    name: string;
    email: string;
  }): Promise<User> => {
    return {
      id: "cust-new",
      role: UserRole.CUSTOMER,
      ...data,
      avatar_url: "",
      is_active: true,
    };
  },
  updateCustomer: async (
    id: string,
    data: Partial<Pick<User, "name" | "email">>,
  ): Promise<User | undefined> => {
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapUser(updatedUser);
  },
  deleteCustomer: async (
    id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Delete related records first (Foreign Key Constraints)
    // Delete user's cart
    // Delete user's sales (as buyer)
    const { error: salesError } = await supabase
      .from("sales")
      .delete()
      .eq("buyer_id", id);
    if (salesError) {
      console.warn("Error deleting user sales (might not exist):", salesError);
    }

    const { error: cartError } = await supabase
      .from("carts")
      .delete()
      .eq("user_id", id);
    if (cartError) {
      console.warn("Error deleting user cart (might not exist):", cartError);
      // We continue even if cart delete fails, as it might just not exist
    }

    // 2. Delete the user (including auth table) via RPC
    const { data, error } = await supabase.rpc("admin_delete_user", {
      target_user_id: id,
    });

    if (error) {
      console.error("Error deleting customer via RPC:", error);
      return {
        success: false,
        error:
          error.message ||
          error.details ||
          "Erro desconhecido ao excluir usuário.",
      };
    }

    // `data` returns json from RPC: { "success": true/false, "error": "msg" }
    if (data && !data.success) {
      console.warn("RPC operation failed.", data.error);
      return {
        success: false,
        error: data.error || "Erro de permissão ou falha ao excluir.",
      };
    }

    return { success: true };
  },

  getCurrentUser: async (): Promise<User | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!userProfile) return null;
    return mapUser(userProfile);
  },

  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  login: async (
    email: string,
    password?: string,
  ): Promise<User | undefined> => {
    if (!password) return undefined;

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      console.error("Auth Login Failed:", authError);

      if (authError.message === "Invalid login credentials") {
        throw new Error("Email ou senha incorretos.");
      }

      throw new Error(`Erro de autenticação: ${authError.message}`);
    }

    if (!authData.user) return undefined;

    // 2. Fetch User Profile
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      console.error("Profile Fetch Error:", profileError);
      throw new Error("Usuário autenticado, mas perfil não encontrado.");
    }

    // Check if user is active
    if (userProfile.role === "photographer" && !userProfile.is_active) {
      throw new Error("Sua conta de fotógrafo ainda não está ativa.");
    }

    return mapUser(userProfile);
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error);
  },

  requestPasswordReset: async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("Supabase Reset Error (Technical Details):", {
          message: error.message,
          status: error.status,
          name: error.name,
          details: (error as any).details,
        });
        throw error;
      }

      return true;
    } catch (error: any) {
      console.error("Error in requestPasswordReset:", error);
      // Construct a more helpful error message including the status if available
      const statusSuffix = error.status ? ` (Status: ${error.status})` : "";
      throw new Error(
        error.message
          ? `${error.message}${statusSuffix}`
          : "Falha ao enviar e-mail de recuperação.",
      );
    }
  },

  verifyResetToken: async (
    token: string,
  ): Promise<{ valid: boolean; userId?: string }> => {
    try {
      const { data, error } = await supabase
        .from("password_reset_tokens")
        .select("user_id, expires_at, used")
        .eq("token", token)
        .single();

      if (error || !data) return { valid: false };

      if (data.used) return { valid: false };

      if (new Date(data.expires_at) < new Date()) return { valid: false };

      return { valid: true, userId: data.user_id };
    } catch (error) {
      console.error("Error validating token:", error);
      return { valid: false };
    }
  },

  completePasswordReset: async (
    token: string,
    newPassword: string,
  ): Promise<boolean> => {
    try {
      // 1. Validate again
      const { valid, userId } = await api.verifyResetToken(token);
      if (!valid || !userId) return false;

      // 2. Hash Password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 3. Update User Password
      const { error: updateError } = await supabase
        .from("users")
        .update({ password: hashedPassword })
        .eq("id", userId);

      if (updateError) throw updateError;

      // 4. Mark Token as Used
      await supabase
        .from("password_reset_tokens")
        .update({ used: true })
        .eq("token", token);

      return true;
    } catch (error) {
      console.error("Error completing reset:", error);
      return false;
    }
  },
  register: async (data: {
    name: string;
    email: string;
    role: UserRole;
    password?: string;
    phone?: string;
  }): Promise<RegisterResponse | undefined> => {
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password || "temp-pass-123", // Handle nullable password edge case
    });

    if (authError) throw authError;
    if (!authData.user)
      throw new Error("Falha ao criar usuário de autenticação.");

    // 2. Create Public Profile with SAME ID
    const userData: any = {
      id: authData.user.id, // CRITICAL: Sync IDs
      ...data,
      name: formatNameAsTitleCase(data.name),
      is_active: true,
    };

    // Store hash solely for legacy compatibility / redundancy, or remove if column allows null.
    // Assuming we stick to the existing schema:
    if (data.password) {
      userData.password = await bcrypt.hash(data.password, 10);
    }

    const { data: newUser, error } = await supabase
      .from("users")
      .insert(userData)
      .select()
      .single();

    if (error) {
      // If DB insert fails, we should probably cleanup the Auth user?
      // For now just throw.
      throw error;
    }

    // Send notification email if the new user is a photographer
    if (data.role === UserRole.PHOTOGRAPHER) {
      import("./emailService").then(({ emailService }) => {
        emailService.sendNewPhotographerNotification(data.name, data.email);
      });
    }

    return {
      user: mapUser(newUser),
      session: authData.session,
    };
  },

  updateUserLiabilityWaiver: async (userId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("users")
      .update({ liability_waiver_accepted_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      console.error("Error updating liability waiver:", error);
      return false;
    }
    return true;
  },

  purchasePhoto: async (
    photoId: string,
    userId: string = "guest-id",
    paidPrice?: number,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Get Photo Details
      const photo = await api.getPhotoById(photoId);
      if (!photo) return { success: false, error: "Foto não encontrada" };

      // 2. Get Commission Settings
      const settings = await api.getCommissionSettings();
      const isVideo = photo.media_type === 'video';
      let rate;

      if (isVideo) {
        rate = settings.defaultVideoRate ?? 0.10;
      } else {
        rate = settings.defaultRate;
        // Check for custom rate for this photographer
        if (
          settings.customRates &&
          settings.customRates[photo.photographer_id] !== undefined
        ) {
          rate = settings.customRates[photo.photographer_id];
        }
      }

      // 3. Determine Final Price (Net vs Gross)
      // If paidPrice is provided (from Checkout), use it. Otherwise fallback to list price.
      const finalPrice = paidPrice !== undefined ? paidPrice : photo.price;

      const commissionValue = finalPrice * rate;

      // 4. Record Sale
      const { error } = await supabase.from("sales").insert({
        photo_id: photoId,
        buyer_id: userId,
        price: finalPrice, // Record the ACTUAL paid amount
        commission: commissionValue, // Calculate commission on the ACTUAL amount
        photographer_id: photo.photographer_id,
        commission_rate: rate,
        sale_date: new Date(),
      });

      if (error) {
        console.error("Erro ao registrar venda:", error);
        return {
          success: false,
          error:
            error.message ||
            error.details ||
            "Erro no banco de dados (Supabase)",
        };
      }

      return { success: true };
    } catch (e: any) {
      console.error("Compra falhou", e);
      return {
        success: false,
        error: e.message || "Erro inesperado na aplicação",
      };
    }
  },
  checkIfPurchased: async (
    userId: string,
    photoId: string,
  ): Promise<boolean> => {
    const { data, error } = await supabase
      .from("sales")
      .select("id")
      .eq("buyer_id", userId)
      .eq("photo_id", photoId)
      .maybeSingle(); // Use maybeSingle to avoid error if multiple purchases or none

    if (error) {
      console.warn("Error checking purchase status:", error);
      return false;
    }
    return !!data;
  },
  getPurchasesByUserId: async (userId: string): Promise<PurchasedPhoto[]> => {
    // Join sales with photos and photographers
    const { data, error } = await supabase
      .from("sales")
      .select("*, photo:photos(*, photographer:users!photos_photographer_id_fkey(name))")
      .eq("buyer_id", userId)
      .neq("status", "refunded")
      .order("sale_date", { ascending: false });

    if (error) {
      console.warn("Error fetching purchases:", error);
      return [];
    }

    if (!data) return [];

    return data
      .map((sale: any) => {
        if (!sale.photo) return null; // Should not happen if data integrity is good
        const photo = mapPhoto(sale.photo);
        return {
          ...photo,
          purchase_date: sale.sale_date,
          sale_id: sale.id,
          paid_price: Number(sale.price),
          photographer_name: sale.photo.photographer?.name || "Fotógrafo",
        } as PurchasedPhoto;
      })
      .filter(Boolean) as PurchasedPhoto[];
  },
  getSecureDownloadUrl: async (
    photoId: string,
    _userId: string,
  ): Promise<string | null> => {
    try {
      // Usa endpoint serverless que verifica compra com service role
      // e gera signed URL do bucket privado photos-original
      const session = await supabase.auth.getSession();
      const jwt = session.data.session?.access_token;

      if (!jwt) {
        console.error("Usuário não autenticado.");
        return null;
      }

      const res = await fetch('/api/get-download-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({ photoId }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        console.error("Download negado:", data?.error);
        return null;
      }

      return data.url;
    } catch (e) {
      console.error("Exception getting download link:", e);
      return null;
    }
  },

  validateCoupon: async (code: string): Promise<Coupon | null> => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .single();
    if (error || !data) return null;
    if (!data.is_active || new Date(data.expiration_date) < new Date())
      return null;
    return data;
  },
  syncCart: async (userId: string, itemIds: string[]): Promise<void> => {
    // console.log(`[SyncCart] Attempting to sync cart for User ID: ${ userId } `);
    try {
      // Use UPSERT for atomic update/create, avoiding race conditions (409) and manual checks
      const { error } = await supabase.from("carts").upsert(
        {
          user_id: userId,
          items: itemIds,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

      if (error) {
        console.warn("Error syncing cart (upsert):", error);
      }
    } catch (e) {
      console.error("Sync cart failed:", e);
    }
  },
  getUserCart: async (userId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from("carts")
        .select("items")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Error fetching cart:", error);
        return [];
      }
      return data?.items || [];
    } catch (e) {
      console.error("Get user cart failed:", e);
      return [];
    }
  },
  getAbandonedCartsByPhotographerId: async (
    photographerId: string,
  ): Promise<AbandonedCart[]> => {
    try {
      console.log(
        `[AbandonedCart] Inciando busca RPC para fotógrafo: ${photographerId}`,
      );

      // 1. Fetch exactly the carts we need via RPC (bypasses RLS limiting access to other users' carts)
      const { data: rawCarts, error: rpcError } = await supabase.rpc(
        "get_photographer_abandoned_carts",
        {
          p_photographer_id: photographerId,
        },
      );

      if (rpcError) {
        console.warn("[AbandonedCart] Erro na RPC:", rpcError);
        return [];
      }

      if (!rawCarts || rawCarts.length === 0) return [];

      // 2. Fetch photo details for these items
      const allPhotoIds = new Set<string>();
      rawCarts.forEach((cart: any) => {
        if (Array.isArray(cart.items)) {
          cart.items.forEach((id: string) => allPhotoIds.add(id));
        }
      });

      if (allPhotoIds.size === 0) return [];

      const { data: photos, error: photosError } = await supabase
        .from("photos")
        .select("id, title, price, preview_url, thumb_url, photographer_id")
        .in("id", Array.from(allPhotoIds))
        .eq("photographer_id", photographerId);

      if (photosError) {
        console.warn(
          "[AbandonedCart] Erro ao buscar detalhes das fotos:",
          photosError,
        );
        return [];
      }

      const photoMap = new Map();
      if (photos) {
        photos.forEach((p) => photoMap.set(p.id, p));
      }

      // 3. Build Result
      const abandonedCarts: AbandonedCart[] = [];

      rawCarts.forEach((cart: any) => {
        const relevantItems: any[] = [];
        if (Array.isArray(cart.items)) {
          cart.items.forEach((itemId: string) => {
            const photo = photoMap.get(itemId);
            if (photo) {
              relevantItems.push({
                photo_id: photo.id,
                title: photo.title,
                price: Number(photo.price),
                preview_url: photo.preview_url,
                photographer_id: photo.photographer_id,
              });
            }
          });
        }

        if (relevantItems.length > 0) {
          abandonedCarts.push({
            id: cart.user_id,
            userId: cart.user_id,
            userName: cart.userName || "Cliente (Sem Nome)",
            userEmail: cart.userEmail || "Sem e-mail",
            userPhone: cart.userPhone || "",
            items: relevantItems,
            date:
              cart.updated_at || cart.created_at || new Date().toISOString(),
            status: "pending", // You can persist this in database if you expand the schema later
          });
        }
      });

      console.log(
        `[AbandonedCart] Carrinhos finais carregados com sucesso: ${abandonedCarts.length}`,
      );
      return abandonedCarts;
    } catch (e) {
      console.error("[AbandonedCart] Falha crítica:", e);
      return [];
    }
  },
  getStats: async () => ({ photos: 100, photographers: 20, categories: 5 }),
  getCommissionSettings: async (): Promise<CommissionSettings> => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("commission_default_rate, commission_custom_rates, commission_video_default_rate, commission_custom_video_rates")
      .eq("id", 1)
      .single();
    if (error) {
      console.warn("Error fetching commission settings:", error);
      return { defaultRate: 0.15, defaultVideoRate: 0.10, customRates: {}, customVideoRates: {} };
    }
    return {
      defaultRate: data.commission_default_rate,
      defaultVideoRate: data.commission_video_default_rate ?? 0.10,
      customRates: data.commission_custom_rates || {},
      customVideoRates: data.commission_custom_video_rates || {},
    };
  },
  updateCommissionSettings: async (
    settings: CommissionSettings,
  ): Promise<CommissionSettings> => {
    const { data, error } = await supabase
      .from("system_settings")
      .upsert({
        id: 1,
        commission_default_rate: settings.defaultRate,
        commission_custom_rates: settings.customRates,
        commission_video_default_rate: settings.defaultVideoRate ?? 0.10,
        commission_custom_video_rates: settings.customVideoRates || {},
        updated_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;
    return {
      defaultRate: data.commission_default_rate,
      defaultVideoRate: data.commission_video_default_rate,
      customRates: data.commission_custom_rates,
      customVideoRates: data.commission_custom_video_rates,
    };
  },
  getEmailTemplates: async (): Promise<EmailTemplates> => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("email_templates")
      .eq("id", 1)
      .single();
    if (error) {
      console.warn("Error fetching email templates:", error);
      // Return default templates if fetch fails
      return {
        photographerActivated: {
          subject: "Sua conta foi ativada!",
          body: "Olá {{nome_fotografo}}, sua conta foi ativada.",
        },
        photographerDeactivated: {
          subject: "Sua conta foi desativada",
          body: "Olá {{nome_fotografo}}, sua conta foi desativada.",
        },
        photoRejected: {
          subject: "Foto rejeitada",
          body: "Olá {{nome_fotografo}}, sua foto {{titulo_foto}} foi rejeitada. Motivo: {{motivo_rejeicao}}",
        },
        payoutProcessed: {
          subject: "Pagamento processado",
          body: "Olá {{nome_fotografo}}, seu pagamento de {{valor_pagamento}} foi processado em {{data_pagamento}}.",
        },
        welcomePhotographer: {
          subject: "Bem-vindo ao FotoClic!",
          body: "Olá {{nome_fotografo}}, estamos felizes em ter você conosco! Sua conta foi criada com sucesso e em breve nossa equipe irá analisá-la.",
        },
        welcomeCustomer: {
          subject: "Bem-vindo ao FotoClic!",
          body: "Olá {{nome_cliente}}, estamos felizes em ter você conosco! Agora você pode comprar as melhores fotos dos seus eventos favoritos.",
        },
        purchaseConfirmation: {
          subject: "Sua compra foi confirmada!",
          body: "Olá {{nome_cliente}}, sua compra foi confirmada com sucesso! Suas fotos já estão disponíveis para download.",
        },
      };
    }
    return data.email_templates;
  },
  updateEmailTemplates: async (
    templates: EmailTemplates,
  ): Promise<EmailTemplates> => {
    const { data, error } = await supabase
      .from("system_settings")
      .upsert({
        id: 1,
        email_templates: templates,
        updated_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;
    return data.email_templates;
  },
  notifyPhotographerStatusChange: async (id: string, status: boolean) => {
    try {
      const user = await api.getPhotographerById(id);
      if (!user) return;

      const templates = await api.getEmailTemplates();
      // Select template based on status (Activation vs Deactivation)
      const template = status
        ? templates.photographerActivated
        : templates.photographerDeactivated;

      if (!template) {
        console.warn(
          `Template de e - mail para ${status ? "ativação" : "desativação"} não encontrado.`,
        );
        return;
      }

      // Replace variables
      const subject = template.subject;
      let bodyContent = template.body.replace(/{{nome_fotografo}}/g, user.name);

      // Convert newlines to HTML line breaks for correct formatting
      bodyContent = bodyContent.replace(/\n/g, "<br />");

      // Wrap in a nice template structure
      const htmlBody = `
      < div style = "font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;" >
        <h2 style="color: #2563EB;" > FotoClic </h2>
          < div style = "margin: 20px 0;" >
            ${bodyContent}
    </div>
      < hr style = "border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;" > Este é um e - mail automático, por favor não responda.</p>
          </div>
            `;

      // Dynamically import emailService to avoid circular dependencies if any
      const { emailService } = await import("./emailService");
      await emailService.sendEmail(user.email, subject, htmlBody);
      console.log(
        `E - mail de ${status ? "ativação" : "desativação"} enviado para ${user.email} `,
      );
    } catch (error) {
      console.error("Falha ao enviar notificação de status", error);
    }
  },
  notifyPhotographerPhotoRejection: async (id: string) => {
    try {
      const photo = await api.getPhotoById(id);
      if (!photo) return;

      const user = await api.getPhotographerById(photo.photographer_id);
      if (!user) return;

      const templates = await api.getEmailTemplates();
      const template = templates.photoRejected;

      if (!template) {
        console.warn("Template de e-mail 'photoRejected' não encontrado.");
        return;
      }

      // Replace variables
      const subject = template.subject
        .replace(/{{nome_fotografo}}/g, user.name)
        .replace(/{{titulo_foto}}/g, photo.title);

      let bodyContent = template.body
        .replace(/{{nome_fotografo}}/g, user.name)
        .replace(/{{titulo_foto}}/g, photo.title)
        .replace(
          /{{motivo_rejeicao}}/g,
          photo.rejection_reason || "Motivo não especificado",
        );

      // Convert newlines to HTML line breaks for correct formatting
      bodyContent = bodyContent.replace(/\n/g, "<br />");

      // Wrap in a nice template structure
      const htmlBody = `
      < div style = "font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;" >
        <h2 style="color: #DC2626;" > FotoClic - Foto Rejeitada </h2>
          < div style = "margin: 20px 0;" >
            ${bodyContent}
    </div>
      < hr style = "border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;" > Este é um e - mail automático, por favor não responda.</p>
          </div>
            `;

      // Dynamically import emailService to avoid circular dependencies if any
      const { emailService } = await import("./emailService");
      await emailService.sendEmail(user.email, subject, htmlBody);
      console.log(`E - mail de rejeição enviado para ${user.email} `);
    } catch (error) {
      console.error("Falha ao enviar notificação de rejeição", error);
    }
  },
  analyzePhoto: async (id: string) => {
    // 1. Try to get analysis from photo record if exists
    const { data, error } = await supabase
      .from("photos")
      .select("quality_analysis")
      .eq("id", id)
      .single();

    if (!error && data && data.quality_analysis) {
      return data.quality_analysis;
    }

    // 2. Fallback to mock if not analyzed
    return {
      overallScore: 85,
      sharpness: 90,
      lighting: 80,
      composition: 85,
      noise: 20,
      ai_tags: [],
      recommendation: "approve" as const,
      summary: "Análise automática pendente.",
    };
  },
  getPhotographerBalances: async (): Promise<PhotographerBalance[]> => {
    return [];
  },
  requestPayout: async (
    photographerId: string,
    amount: number,
  ): Promise<Payout> => {
    const { data, error } = await supabase
      .from("payouts")
      .insert({ photographer_id: photographerId, amount })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  approvePayout: async (payoutId: string): Promise<boolean> => {
    // 1. Update status first
    const { data: payoutData, error } = await supabase
      .from("payouts")
      .update({ status: "paid", processed_date: new Date().toISOString() })
      .eq("id", payoutId)
      .select()
      .single();
    if (error) throw error;

    // 2. Send Notification Email
    try {
      // Need photographer details for the email
      const photographer = await api.getPhotographerById(
        payoutData.photographer_id,
      );

      if (photographer) {
        const templates = await api.getEmailTemplates();
        const template = templates.payoutProcessed;

        if (template) {
          const valorFormatado = payoutData.amount.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
          const dataFormatada = new Date().toLocaleDateString("pt-BR");

          const subject = template.subject.replace(
            /{{nome_fotografo}}/g,
            photographer.name,
          );

          let bodyContent = template.body
            .replace(/{{nome_fotografo}}/g, photographer.name)
            .replace(/{{valor_pagamento}}/g, valorFormatado)
            .replace(/{{data_pagamento}}/g, dataFormatada);

          // Convert newlines to HTML line breaks
          bodyContent = bodyContent.replace(/\n/g, "<br />");

          const htmlBody = `
      < div style = "font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;" >
        <h2 style="color: #059669;" > FotoClic - Pagamento Processado </h2>
          < div style = "margin: 20px 0;" >
            ${bodyContent}
    </div>
      < hr style = "border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;" > Este é um e - mail automático, por favor não responda.</p>
          </div>
            `;

          const { emailService } = await import("./emailService");
          await emailService.sendEmail(photographer.email, subject, htmlBody);
          console.log(
            `E - mail de pagamento enviado para ${photographer.email} `,
          );
        }
      }
    } catch (e) {
      console.error("Erro ao enviar email de pagamento:", e);
      // We don't throw here to avoid failing the operation if just the email fails
    }

    return true;
  },
  getPayoutsByPhotographerId: async (
    photographerId: string,
  ): Promise<Payout[]> => {
    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("photographer_id", photographerId);
    if (error) throw error;
    return data || [];
  },
  getAllPayouts: async (): Promise<
    (Payout & { photographer_name: string; bank_info?: BankInfo })[]
  > => {
    const { data, error } = await supabase
      .from("payouts")
      .select("*, photographer:photographer_id ( name, bank_info )");
    if (error) throw error;
    return (
      data.map((p: any) => ({
        ...p,
        photographer_name: p.photographer.name,
        bank_info: p.photographer.bank_info,
      })) || []
    );
  },
  getPendingReportsCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from("photographer_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) throw error;
    return count || 0;
  },

  getPendingPayoutsCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from("payouts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) throw error;
    return count || 0;
  },
  updateBankInfo: async (
    userId: string,
    bankInfo: BankInfo & { payoutFrequency?: string },
  ): Promise<boolean> => {
    const { error } = await supabase
      .from("users")
      .update({ 
        bank_info: bankInfo, // Keep for legacy
        pix_key: bankInfo.pixKey,
        pix_key_type: bankInfo.pixKeyType,
        payout_frequency: bankInfo.payoutFrequency || 'diario'
      })
      .eq("id", userId);
    if (error) throw error;
    return true;
  },
  getAdminStats: async (): Promise<any> => {
    const { data, error } = await supabase.rpc("get_admin_stats");
    if (error) {
      console.error("Error fetching admin stats:", error);
      throw error;
    }
    return data;
  },
  getSales: async (): Promise<Sale[]> => {
    // Select sales and join with the buyer (users table) and photos table
    const { data, error } = await supabase
      .from("sales")
      .select("*, buyer:buyer_id(name), photo:photos(title, preview_url, thumb_url, photographer_id)")
      .order("sale_date", { ascending: false });

    if (error) {
      console.error("Error fetching sales:", error);
      return [];
    }

    // Transform result to match Sale interface
    return (
      data?.map((s: any) => ({
        ...s,
        buyer_name: s.buyer?.name || "Comprador Desconhecido",
        photo: s.photo ? {
          title: s.photo.title,
          preview_url: s.photo.preview_url,
          thumb_url: s.photo.thumb_url,
          photographer_id: s.photo.photographer_id
        } : null
      })) || []
    );
  },
  supabase, // Expose raw client for Storage ops
  getPhotographerStats: async (userId: string) => {
    const { data, error } = await supabase
      .from("photographer_stats_view")
      .select("*")
      .eq("photographer_id", userId)
      .single();

    if (error) {
      console.error("Error fetching stats:", error);
      return null;
    }
    return data;
  },
  moderatePhoto: async (
    photoId: string,
    status: "approved" | "rejected",
    reason?: string,
  ) => {
    const { data, error } = await supabase.rpc("moderate_photo", {
      p_photo_id: photoId,
      p_status: status,
      p_reason: reason,
    });

    if (error) {
      console.error("Error moderating photo:", error);
      return { success: false, error: error.message };
    }
    return data; // Returns { success: true/false, ... }
  },
  requestStorageLimit: async () => {
    const { data, error } = await supabase.rpc("request_storage_limit");
    if (error) {
      console.error("Error requesting storage limit:", error);
      return { success: false, error: error.message };
    }
    // RPC returns JSONB {success: bool, error: string}
    return data;
  },
  getStorageRequests: async (
    status: "pending" | "approved" | "rejected" | null = null,
  ) => {
    const { data, error } = await supabase.rpc("get_storage_requests", {
      p_status: status,
    });
    if (error) {
      console.error("Error fetching storage requests:", error);
      return [];
    }
    return data;
  },
  approveStorageRequest: async (requestId: string, newLimit: number) => {
    const { data, error } = await supabase.rpc("approve_storage_request", {
      p_request_id: requestId,
      p_new_limit: newLimit,
    });
    if (error) {
      console.error("Error approving request:", error);
      return { success: false, error: error.message };
    }
    return data;
  },
  rejectStorageRequest: async (requestId: string, reason: string) => {
    const { data, error } = await supabase.rpc("reject_storage_request", {
      p_request_id: requestId,
      p_reason: reason,
    });
    if (error) {
      console.error("Error rejecting request:", error);
      return { success: false, error: error.message };
    }
    return data;
  },
  getMyLatestStorageRequest: async () => {
    const { data, error } = await supabase.rpc("get_my_latest_storage_request");
    if (error) {
      // If RPC is missing context or similar errors, treat as no request
      console.warn("Error fetching my storage request:", error);
      return null;
    }
    return data; // Returns { id, status, created_at, rejection_reason }
  },

  // Busca Inteligente por Contexto Híbrido (Edge Function + Vetores Espaciais)
  searchImageContext: async (imageBase64: string): Promise<Photo[]> => {
    try {
      console.log('Iniciando fallback: busca híbrida via Supabase Edge Function...');
      
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('image-embedding', {
        body: { image: imageBase64 }
      });

      if (edgeError) {
        throw new Error(edgeError.message || "Erro ao consultar IA de imagens");
      }

      const embedding = edgeData?.embedding;

      if (!embedding) {
        throw new Error("Embedded image vector is corrupted or missing");
      }

      const { data: dbMatches, error: dbError } = await supabase.rpc('match_images', {
        query_embedding: embedding,
        match_threshold: 0.35, // Distância aceitável (menor é mais rigoroso)
        match_count: 10
      });

      if (dbError) throw dbError;

      if (!dbMatches || dbMatches.length === 0) {
        return [];
      }

      const matchedIds = dbMatches.map((m: any) => m.id);
      
      // Fetch the actual photos
      const photos = await api.getPhotosByIds(matchedIds);
      
      // Order them by the distance provided by the vector similarity search
      const sortedPhotos = photos.sort((a, b) => {
        return matchedIds.indexOf(a.id) - matchedIds.indexOf(b.id);
      });

      return sortedPhotos;
    } catch (error) {
       console.error("Falha detalhada ao buscar contexto de imagem na Edge Function:", error);
       return [];
    }
  },


  async createAbacateCheckout(items: any[], customer: any, metadata?: any) {
    const response = await fetch(`${API_URL}/abacate-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customer, metadata }),
    });
    const data = await response.json();
    if (!response.ok) { const detailStr = data.details ? JSON.stringify(data.details) : ''; throw new Error((data.error + ' ' + detailStr).trim() || 'Failed to create Abacate Pay checkout'); }
    return data;
  },

  getEligiblePhotographers: async (): Promise<any[]> => {
    const [walletRes, usersRes] = await Promise.all([
      supabase.from("photographer_wallet_summary").select("*"),
      supabase.from("users").select("id, email, pix_key, pix_key_type, payout_frequency").eq("role", "photographer")
    ]);

    if (walletRes.error) throw walletRes.error;
    if (usersRes.error) throw usersRes.error;

    const userMap = new Map();
    (usersRes.data || []).forEach((u: any) => userMap.set(u.id, u));

    return (walletRes.data || []).map((item: any) => {
      const user = userMap.get(item.photographer_id);
      return {
        ...item,
        email: user?.email,
        pixKey: user?.pix_key,
        pixKeyType: user?.pix_key_type,
        payoutFrequency: user?.payout_frequency
      };
    });
  },

  transferPayoutAutomatically: async (photographerId: string, isManualBypass: boolean = false): Promise<any> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const response = await fetch(`${API_URL}/payout-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ photographerId, isManualBypass })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao transferir saldo.');
    return result;
  },

  sendEmail: async (to: string | string[], subject: string, html: string): Promise<any> => {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao enviar e-mail.');
    return result;
  },

};

export default api;
