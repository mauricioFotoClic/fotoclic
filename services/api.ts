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
    bio: dbUser.bio,
    avatar_url: dbUser.avatar_url,
    banner_url: dbUser.banner_url,
    location: dbUser.location,
    social_instagram: dbUser.social_instagram,
    is_active: dbUser.is_active,
    bulkDiscountRules: dbUser.bulk_discount_rules || [],
    bank_info: dbUser.bank_info || undefined,
    liability_waiver_accepted_at: dbUser.liability_waiver_accepted_at,
    phone: dbUser.phone,
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
    preview_url: dbPhoto.preview_url,
    file_url: dbPhoto.file_url || "",
    thumb_url: dbPhoto.thumb_url || dbPhoto.preview_url, // Fallback to preview if no thumb
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
  activePhotographers: { data: PhotographerWithStats[] | null, ts: number }
} = {
  categories: { data: null, ts: 0 },
  featured: { data: null, ts: 0 },
  recent: { data: null, ts: 0 },
  activePhotographers: { data: null, ts: 0 }
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
    const cleanTerm = (searchTerm || "").trim();

    // Conjuntos para armazenar IDs que batem com a busca
    let matchingCategoryIds: string[] = [];
    let matchingEventIds: string[] = [];
    let matchingPhotographerIds: string[] = [];

    if (cleanTerm) {
      try {
        // Busca paralela em várias tabelas para agilizar
        const [catRes, eventRes, photogRes] = await Promise.all([
          supabase.from("categories").select("id").ilike("name", `%${cleanTerm}%`),
          supabase.from("events").select("id").ilike("name", `%${cleanTerm}%`),
          supabase.from("users").select("id").eq("role", "photographer").ilike("name", `%${cleanTerm}%`)
        ]);

        if (catRes.data) matchingCategoryIds = catRes.data.map(c => c.id);
        if (eventRes.data) matchingEventIds = eventRes.data.map(e => e.id);
        if (photogRes.data) matchingPhotographerIds = photogRes.data.map(p => p.id);

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
        "id, photographer_id, category_id, title, description, preview_url, file_url, thumb_url, price, resolution, width, height, tags, is_public, created_at, moderation_status, rejection_reason, is_featured, likes_count, quality_analysis, is_face_indexed, event_id, sales_count, photo_likes(user_id)",
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
        "id, photographer_id, category_id, title, description, preview_url, file_url, thumb_url, price, resolution, width, height, tags, is_public, created_at, moderation_status, rejection_reason, is_featured, likes_count, quality_analysis, is_face_indexed, event_id, sales_count, photo_likes(user_id)",
      )
      .in("id", ids);

    if (error) throw error;
    return data ? data.map(mapPhoto) : [];
  },

  getPhotosByPhotographerId: async (
    photographerId: string,
  ): Promise<Photo[]> => {
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, description, preview_url, file_url, thumb_url, price, resolution, width, height, tags, is_public, created_at, moderation_status, rejection_reason, is_featured, likes_count, quality_analysis, is_face_indexed, event_id, sales_count, photo_likes(user_id)",
      )
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ? data.map(mapPhoto) : [];
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
      p_width: data.width,
      p_height: data.height,
      p_tags: data.tags || [],
      p_is_public: data.is_public,
      p_is_featured: false, // Default
      p_event_id: data.event_id,
    });

    if (error) throw error;

    // The RPC returns a JSON object { success: boolean, original_error?: string, data?: photo_row }
    // We need to parse/check it.
    // Note: Supabase RPC returns the JSONB directly as data.

    if (!result || !result.success) {
      throw new Error(result?.error || "Erro desconhecido ao enviar foto.");
    }

    // Map the returned data (which is the raw photo row) to our Photo type
    return mapPhoto(result.data);
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
    return mapPhoto(updatedPhoto);
  },

  deletePhoto: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) throw error;
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
    return mapUser(updatedUser);
  },

  getSalesByPhotographerId: async (photographerId: string): Promise<Sale[]> => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("sale_date", { ascending: false });

    if (error) {
      console.warn("Error fetching sales:", error);
      return [];
    }

    // We need buyer name, let's fetch it or map it if possible contextually,
    // but for now let's just return the sales.
    // Ideally we would join with users table: .select('*, buyer:users!buyer_id(name)')
    // But type definition expects buyer_name directly on Sale object.
    // Let's try to fetch with join
    const { data: salesWithBuyer, error: joinError } = await supabase
      .from("sales")
      .select("*, buyer:users!buyer_id(name)")
      .eq("photographer_id", photographerId)
      .order("sale_date", { ascending: false });

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
        };
      }

      const sales = await api.getSalesByPhotographerId(photographerId);
      const { count: photoCount } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("photographer_id", photographerId);
      const { data: payouts } = await supabase
        .from("payouts")
        .select("amount, status")
        .eq("photographer_id", photographerId);

      const totalSalesGross = sales.reduce((sum, s) => sum + s.price, 0);
      const totalPlatformFees = sales.reduce((sum, s) => sum + s.commission, 0);
      const totalEarnings = totalSalesGross - totalPlatformFees;

      const totalPaid = (payouts || [])
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);
      const pendingAmount = (payouts || [])
        .filter((p) => p.status === "pending" || p.status === "processing")
        .reduce((sum, p) => sum + p.amount, 0);

      const currentBalance = totalEarnings - totalPaid - pendingAmount;

      // Recalculate likes count properly by summing 'likes_count' from all photos
      const { data: photos } = await supabase
        .from("photos")
        .select("likes_count")
        .eq("photographer_id", photographerId);
      const totalLikes = photos
        ? photos.reduce((sum, p) => sum + (p.likes_count || 0), 0)
        : 0;

      const settings = await api.getCommissionSettings();
      let effectiveRate = settings.defaultRate;
      if (settings.customRates && settings.customRates[photographerId] !== undefined) {
        effectiveRate = settings.customRates[photographerId];
      }

      return {
        ...user,
        photoCount: photoCount || 0,
        salesCount: sales.length,
        commissionValue: totalPlatformFees,
        commissionRate: effectiveRate,
        totalSalesGross,
        totalPlatformFees,
        totalEarnings: totalEarnings,
        totalPaid,
        currentBalance,
        likesCount: totalLikes,
        avgRating: 0, // Not fetching for balance currently
        reviewCount: 0, // Not fetching for balance currently
        approvalPercentage: 0, // Not fetching for balance currently
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
    // 1. Get stats via RPC + reviews in parallel
    const [{ data, error }, { data: reviewsData }] = await Promise.all([
      supabase.rpc("get_photographers_with_stats"),
      supabase.from("reviews").select("photographer_id, rating"),
    ]);

    if (error) {
      console.error("Error fetching photographer stats via RPC:", error);
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
    return (data as any[]).map((row) => {
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
  },
  getPhotographerById: async (id: string): Promise<User | undefined> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return undefined; // Not found is not an error here
      throw error;
    }
    return mapUser(data);
  },
  getActivePhotographersPreview: async (): Promise<PhotographerWithStats[]> => {
    const now = Date.now();
    if (inMemoryCache.activePhotographers.data && (now - inMemoryCache.activePhotographers.ts < CACHE_TTL)) {
      return inMemoryCache.activePhotographers.data;
    }

    try {
      const allPhotogs = await api.getPhotographers();
      const result = allPhotogs
        .filter(p => p.is_active && p.avatar_url && p.approvedCount > 0)
        .slice(0, 10);

      inMemoryCache.activePhotographers = { data: result, ts: now };
      return result;
    } catch (error) {
      console.warn("Could not fetch active photographers preview", error);
      return [];
    }
  },

  // --- EVENTS ---
  getAllPublicEvents: async (): Promise<PhotoEvent[]> => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    if (error) {
      console.error("Error fetching all events:", error);
      return [];
    }
    return data as PhotoEvent[];
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
      .select("*")
      .eq("category_id", categoryId)
      .order("event_date", { ascending: false });

    if (error) {
      console.error("Error fetching events by category:", error);
      return [];
    }
    return data as PhotoEvent[];
  },

  getPhotosByEventId: async (eventId: string): Promise<Photo[]> => {
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, photographer_id, category_id, title, preview_url, thumb_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags, event_id, sales_count",
      )
      .eq("event_id", eventId)
      .eq("moderation_status", "approved")
      .eq("is_public", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ? data.map(mapPhoto) : [];
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
    return data as PhotoEvent;
  },

  getPhotographerEvents: async (
    photographerId: string,
  ): Promise<PhotoEvent[]> => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return [];
    }
    return data as PhotoEvent[];
  },

  deleteEvent: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error("Error deleting event:", error);
      return false;
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
    return mapUser(newUser);
  },
  deletePhotographer: async (id: string): Promise<boolean> => {
    return true;
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
      let rate = settings.defaultRate;

      // Check for custom rate for this photographer
      if (
        settings.customRates &&
        settings.customRates[photo.photographer_id] !== undefined
      ) {
        rate = settings.customRates[photo.photographer_id];
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
    // Join sales with photos
    const { data, error } = await supabase
      .from("sales")
      .select("*, photo:photos(*)")
      .eq("buyer_id", userId)
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
      .select("commission_default_rate, commission_custom_rates")
      .eq("id", 1)
      .single();
    if (error) {
      console.warn("Error fetching commission settings:", error);
      return { defaultRate: 0.15, customRates: {} };
    }
    return {
      defaultRate: data.commission_default_rate,
      customRates: data.commission_custom_rates || {},
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
        updated_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;
    return {
      defaultRate: data.commission_default_rate,
      customRates: data.commission_custom_rates,
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
    bankInfo: BankInfo,
  ): Promise<boolean> => {
    const { error } = await supabase
      .from("users")
      .update({ bank_info: bankInfo })
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
    // Select sales and join with the buyer (users table) to get the name
    const { data, error } = await supabase
      .from("sales")
      .select("*, buyer:buyer_id(name)")
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
  }
};

export default api;
