import { User, Photo, Category, UserRole, PhotographerWithStats, Sale, Payout, PhotographerBalance, CommissionSettings, EmailTemplates, Coupon, PhotoQualityAnalysis, PurchasedPhoto, AbandonedCart, BulkDiscountRule, BankInfo, PayoutStatus, Review } from '../types';
import { supabase } from './supabaseClient';

// --- HELPER FUNCTIONS ---

const mapUser = (dbUser: any): User => {
  if (!dbUser) return {} as User;
  return {
    id: dbUser.id,
    role: dbUser.role as UserRole,
    name: dbUser.name,
    email: dbUser.email,
    bio: dbUser.bio,
    avatar_url: dbUser.avatar_url,
    banner_url: dbUser.banner_url,
    location: dbUser.location,
    social_instagram: dbUser.social_instagram,
    is_active: dbUser.is_active,
    bulkDiscountRules: dbUser.bulk_discount_rules || [],
    bank_info: dbUser.bank_info || undefined,
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
    description: dbPhoto.description || '',
    preview_url: dbPhoto.preview_url,
    file_url: dbPhoto.file_url || '',
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
    quality_analysis: dbPhoto.quality_analysis || undefined
  };
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};


const api = {
  // --- PHOTOS ---
  getFeaturedPhotos: async (): Promise<Photo[]> => {
    const { data, error } = await supabase
      .from('photos')
      .select('id, photographer_id, category_id, title, preview_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags')
      .eq('is_featured', true)
      .eq('moderation_status', 'approved')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(12);
    if (error) {
      console.warn("Error fetching featured photos:", error);
      return [];
    }
    return data ? data.map(mapPhoto) : [];
  },

  getAllPhotos: async (shuffle: boolean = false): Promise<Photo[]> => {
    const limit = shuffle ? 100 : 500; // Increase limit for admin view
    const { data, error } = await supabase
      .from('photos')
      .select('id, photographer_id, category_id, title, preview_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags')
      .order('created_at', { ascending: false })
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
    const poolSize = 100;
    const { data, error } = await supabase
      .from('photos')
      .select('id, photographer_id, category_id, title, preview_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags')
      .eq('moderation_status', 'approved')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(poolSize);
    if (error) {
      console.warn("Error fetching recent photos:", error);
      return [];
    }
    if (!data || data.length === 0) return [];
    const shuffledData = shuffleArray(data);
    return shuffledData.slice(0, limit).map(mapPhoto);
  },

  getPhotosByCategoryId: async (categoryId: string, shuffle: boolean = false): Promise<Photo[]> => {
    const limit = shuffle ? 100 : 500;
    const { data, error } = await supabase
      .from('photos')
      .select('id, photographer_id, category_id, title, preview_url, price, width, height, is_public, created_at, moderation_status, is_featured, likes_count, tags')
      .eq('category_id', categoryId)
      .eq('moderation_status', 'approved')
      .eq('is_public', true)
      .limit(limit);
    if (error) throw error;
    let resultData = data || [];
    if (shuffle) resultData = shuffleArray(resultData);
    return resultData.map(mapPhoto);
  },

  getPhotoById: async (id: string): Promise<Photo | undefined> => {
    const { data, error } = await supabase
      .from('photos')
      .select('*, photo_likes(user_id)')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found is not an error here
      throw error;
    }
    return mapPhoto(data);
  },

  getPhotosByIds: async (ids: string[]): Promise<Photo[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('photos')
      .select('*, photo_likes(user_id)')
      .in('id', ids);

    if (error) throw error;
    return data ? data.map(mapPhoto) : [];
  },

  getPhotosByPhotographerId: async (photographerId: string): Promise<Photo[]> => {
    const { data, error } = await supabase
      .from('photos')
      .select('*, photo_likes(user_id)')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ? data.map(mapPhoto) : [];
  },

  createPhoto: async (data: any): Promise<Photo> => {
    const { data: newPhoto, error } = await supabase.from('photos').insert(data).select().single();
    if (error) throw error;
    return mapPhoto(newPhoto);
  },

  updatePhoto: async (id: string, data: any): Promise<Photo | undefined> => {
    const { data: updatedPhoto, error } = await supabase.from('photos').update(data).eq('id', id).select().single();
    if (error) throw error;
    return mapPhoto(updatedPhoto);
  },

  deletePhoto: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  updatePhotographer: async (id: string, data: Partial<User>) => {
    // Explicitly map camelCase JS properties to snake_case DB columns
    const dbData: { [key: string]: any } = {};

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'bulkDiscountRules') {
        dbData['bulk_discount_rules'] = value;
      } else {
        dbData[key] = value;
      }
    });

    const { error } = await supabase.from('users').update(dbData).eq('id', id);

    if (error) {
      console.error("Supabase update error:", error);
      throw error;
    }

    const { data: updatedUser } = await supabase.from('users').select('*').eq('id', id).single();
    return mapUser(updatedUser);
  },

  getSalesByPhotographerId: async (photographerId: string): Promise<Sale[]> => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('photographer_id', photographerId)
      .order('sale_date', { ascending: false });

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
      .from('sales')
      .select('*, buyer:users!buyer_id(name)')
      .eq('photographer_id', photographerId)
      .order('sale_date', { ascending: false });

    if (joinError) {
      console.warn("Error fetching sales with buyer details:", joinError);
      // Fallback to simple data without name
      return data ? data.map((s: any) => ({ ...s, buyer_name: 'Cliente' })) : [];
    }

    return salesWithBuyer ? salesWithBuyer.map((s: any) => ({
      ...s,
      buyer_name: s.buyer?.name || 'Cliente'
    })) : [];
  },

  getPhotographerBalanceById: async (photographerId: string): Promise<PhotographerBalance | undefined> => {
    try {
      const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', photographerId).single();
      if (userError && userError.code !== 'PGRST116') throw userError;
      const user = userData ? mapUser(userData) : null;

      if (!user) {
        const tempUser: User = { id: photographerId, role: UserRole.PHOTOGRAPHER, name: "Fotógrafo", email: '', avatar_url: '', is_active: false };
        return { ...tempUser, photoCount: 0, salesCount: 0, commissionValue: 0, commissionRate: 0.15, totalSalesGross: 0, totalPlatformFees: 0, totalEarnings: 0, totalPaid: 0, currentBalance: 0, likesCount: 0, avgRating: 0, reviewCount: 0, approvalPercentage: 0 };
      }

      const sales = await api.getSalesByPhotographerId(photographerId);
      const { count: photoCount } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('photographer_id', photographerId);
      const { data: payouts } = await supabase.from('payouts').select('amount, status').eq('photographer_id', photographerId);

      const totalSalesGross = sales.reduce((sum, s) => sum + s.price, 0);
      const totalPlatformFees = sales.reduce((sum, s) => sum + s.commission, 0);
      const totalEarnings = totalSalesGross - totalPlatformFees;

      const totalPaid = (payouts || []).filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const pendingAmount = (payouts || []).filter(p => p.status === 'pending' || p.status === 'processing').reduce((sum, p) => sum + p.amount, 0);

      const currentBalance = totalEarnings - totalPaid - pendingAmount;



      // Recalculate likes count properly by summing 'likes_count' from all photos
      const { data: photos } = await supabase.from('photos').select('likes_count').eq('photographer_id', photographerId);
      const totalLikes = photos ? photos.reduce((sum, p) => sum + (p.likes_count || 0), 0) : 0;

      return {
        ...user,
        photoCount: photoCount || 0,
        salesCount: sales.length,
        commissionValue: totalPlatformFees,
        commissionRate: 0.15,
        totalSalesGross,
        totalPlatformFees,
        totalEarnings: totalEarnings,
        totalPaid,
        currentBalance,
        likesCount: totalLikes,
        avgRating: 0, // Not fetching for balance currently
        reviewCount: 0, // Not fetching for balance currently
        approvalPercentage: 0 // Not fetching for balance currently
      };

    } catch (error) {
      console.error(`Failed to fetch and calculate balance for ${photographerId}`, error);
      throw error;
    }
  },

  createCoupon: async (couponData: Omit<Coupon, 'id'>): Promise<Coupon> => {
    const { data, error } = await supabase.from('coupons').insert(couponData).select().single();
    if (error) throw error;
    return data;
  },

  getCouponsByPhotographerId: async (photographerId: string): Promise<Coupon[]> => {
    const { data, error } = await supabase.from('coupons').select('*').eq('photographer_id', photographerId);
    if (error) throw error;
    return data || [];
  },

  deleteCoupon: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  approvePhotosBatch: async (photoIds: string[]): Promise<boolean> => {
    const { error } = await supabase
      .from('photos')
      .update({ moderation_status: 'approved', rejection_reason: null })
      .in('id', photoIds);
    if (error) throw error;
    return true;
  },
  toggleLike: async (photoId: string, userId: string): Promise<{ success: boolean, newLikes: number, isLiked: boolean }> => {
    try {
      // Check if user already liked this photo
      const { data: existingLike, error: checkError } = await supabase
        .from('photo_likes')
        .select('id')
        .eq('photo_id', photoId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected if no like exists
        throw checkError;
      }

      let isLiked: boolean;

      if (existingLike) {
        // Unlike: Remove the like
        const { error: deleteError } = await supabase
          .from('photo_likes')
          .delete()
          .eq('photo_id', photoId)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
        isLiked = false;
      } else {
        // Like: Add the like
        const { error: insertError } = await supabase
          .from('photo_likes')
          .insert({ photo_id: photoId, user_id: userId });

        if (insertError) throw insertError;
        isLiked = true;
      }

      // Get updated like count
      const { count, error: countError } = await supabase
        .from('photo_likes')
        .select('*', { count: 'exact', head: true })
        .eq('photo_id', photoId);

      if (countError) throw countError;

      const newLikes = count || 0;

      // Update the likes_count in the photos table for denormalization
      await supabase
        .from('photos')
        .update({ likes_count: newLikes })
        .eq('id', photoId);

      return { success: true, newLikes, isLiked };
    } catch (error) {
      console.error('Error toggling like:', error);
      return { success: false, newLikes: 0, isLiked: false };
    }
  },
  getPhotoLikers: async (photoId: string): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('photo_likes')
        .select('user_id, user:users!photo_likes_user_id_fkey(*)')
        .eq('photo_id', photoId);

      if (error) throw error;

      if (!data) return [];

      // Check for integrity issues (join returned null users)
      const hasNullUsers = data.some((item: any) => !item.user);
      if (hasNullUsers) {
        throw new Error("Join failed - null users returned from DB");
      }

      // Map the nested user object
      return data.map((item: any) => mapUser(item.user)).filter((u: User) => u.id);
    } catch (error) {
      // Fallback: Manual join if relation name is different, missing, or RLS blocks join
      console.warn("Error fetching likers with foreign key, trying manual join", error);

      const { data: likes } = await supabase
        .from('photo_likes')
        .select('user_id')
        .eq('photo_id', photoId);

      if (!likes || likes.length === 0) return [];

      const userIds = likes.map(l => l.user_id);

      // Fetch users manually
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      return users ? users.map(mapUser) : [];
    }
  },
  getCategories: async (): Promise<Category[]> => {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (error) {
      console.warn("Could not fetch categories", error)
      return [];
    }
    return data || [];
  },
  getCategoryById: async (id: string): Promise<Category | undefined> => {
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  createCategory: async (data: { name: string; image_url: string }): Promise<Category> => { return { id: `cat-new-${Date.now()}`, slug: 'new', sort_order: 99, ...data }; },
  updateCategory: async (id: string, data: { name: string; image_url: string }): Promise<Category | undefined> => { return { id, slug: 'updated', sort_order: 1, ...data }; },
  updateCategoriesOrder: async (categories: Category[]): Promise<boolean> => { return true; },
  deleteCategory: async (id: string): Promise<boolean> => { return true; },
  getPhotographers: async (): Promise<PhotographerWithStats[]> => {
    // 1. Get all photographers
    const { data: users, error } = await supabase.from('users').select('*').eq('role', 'photographer');
    if (error) throw error;

    // 2. Get stats manually 
    const { data: allSales } = await supabase.from('sales').select('photographer_id, price, commission');
    const { data: allPhotos } = await supabase.from('photos').select('photographer_id, likes_count');

    // 3. Get Commission Settings (New)
    const settings = await api.getCommissionSettings();

    // 4. Aggregate
    return users.map(u => {
      const user = mapUser(u);

      const userSales = allSales?.filter((s: any) => s.photographer_id === u.id) || [];
      const userPhotos = allPhotos?.filter((p: any) => p.photographer_id === u.id) || [];

      const salesCount = userSales.length;
      const commissionValue = userSales.reduce((sum: number, s: any) => sum + (s.commission || 0), 0);

      const photoCount = userPhotos.length;
      const likesCount = userPhotos.reduce((sum: number, p: any) => sum + (p.likes_count || 0), 0);

      // Determine the effective rate for this photographer
      let effectiveRate = settings.defaultRate;
      if (settings.customRates && settings.customRates[u.id] !== undefined) {
        effectiveRate = settings.customRates[u.id];
      }

      return {
        ...user,
        photoCount,
        salesCount,
        commissionValue,
        commissionRate: effectiveRate, // Use the real active rate
        likesCount,
        avgRating: 0,
        reviewCount: 0,
        approvalPercentage: 0
      };
    });
  },
  getPhotographerById: async (id: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found is not an error here
      throw error;
    }
    return mapUser(data);
  },
  getActivePhotographersPreview: async (): Promise<PhotographerWithStats[]> => {
    const { data: users, error } = await supabase
      .from('users')
      .select('*, reviews!photographer_id(*)')
      .eq('role', 'photographer')
      .eq('is_active', true)
      .not('avatar_url', 'is', null)
      .limit(20);

    if (error) {
      console.warn("Could not fetch active photographers", error);
      return [];
    }

    const validUsers = users ? users.filter(u => u.avatar_url).map(u => {
      const reviews = u.reviews || [];
      const reviewCount = reviews.length;
      const avgRating = reviewCount > 0
        ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewCount
        : 0;
      const approvedCount = reviews.filter((r: any) => r.rating >= 4).length;
      const approvalPercentage = reviewCount > 0 ? (approvedCount / reviewCount) * 100 : 0;

      return {
        ...mapUser(u),
        photoCount: 0,
        salesCount: 0,
        commissionValue: 0,
        commissionRate: 0,
        likesCount: 0,
        avgRating,
        reviewCount,
        approvalPercentage
      };
    }) : [];

    return validUsers.slice(0, 10);
  },

  createReview: async (review: Omit<Review, 'id' | 'created_at'>): Promise<Review | null> => {
    const { data, error } = await supabase
      .from('reviews')
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
      .from('reviews')
      .select('*, reviewer:reviewer_id(name, avatar_url)')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      return [];
    }
    return data;
  },
  getPublicPhotographers: async (): Promise<PhotographerWithStats[]> => {
    const { data: users, error } = await supabase.from('users').select('*, reviews!photographer_id(*)').eq('role', 'photographer').eq('is_active', true);
    if (error) throw error;

    return users.map(u => {
      const reviews = u.reviews || [];
      const reviewCount = reviews.length;
      const avgRating = reviewCount > 0
        ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewCount
        : 0;
      const approvedCount = reviews.filter((r: any) => r.rating >= 4).length;
      const approvalPercentage = reviewCount > 0 ? (approvedCount / reviewCount) * 100 : 0;

      return {
        ...mapUser(u),
        photoCount: 0,
        salesCount: 0,
        commissionValue: 0,
        commissionRate: 0.15,
        likesCount: 0,
        avgRating,
        reviewCount,
        approvalPercentage
      };
    });
  },

  getAdminUser: async (): Promise<User | undefined> => undefined,
  getPhotographerUser: async (): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('email', 'daian@example.com').single();
    if (error) return undefined;
    return mapUser(data);
  },
  createPhotographer: async (data: Omit<User, 'id' | 'role'>): Promise<User> => {
    const { data: newUser, error } = await supabase.from('users').insert({ ...data, role: UserRole.PHOTOGRAPHER }).select().single();
    if (error) throw error;
    return mapUser(newUser);
  },
  deletePhotographer: async (id: string): Promise<boolean> => { return true; },
  getCustomers: async (): Promise<(User & { purchaseCount: number; totalSpent: number })[]> => {
    // 1. Fetch Customers
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Error fetching customers:", error);
      return [];
    }

    if (!users || users.length === 0) return [];

    // 2. Fetch Sales for these customers to calculate stats
    const userIds = users.map(u => u.id);
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('buyer_id, price')
      .in('buyer_id', userIds);

    if (salesError) {
      console.warn("Error fetching customer sales stats:", salesError);
      // Fallback: return users with 0 stats
      return users.map(u => ({
        ...mapUser(u),
        purchaseCount: 0,
        totalSpent: 0
      }));
    }

    // 3. Aggregate Stats
    return users.map(u => {
      const userSales = sales?.filter(s => s.buyer_id === u.id) || [];
      const totalSpent = userSales.reduce((sum, s) => sum + Number(s.price), 0);
      const purchaseCount = userSales.length;

      return {
        ...mapUser(u),
        purchaseCount,
        totalSpent
      };
    });
  },
  createCustomer: async (data: { name: string; email: string }): Promise<User> => { return { id: 'cust-new', role: UserRole.CUSTOMER, ...data, avatar_url: '', is_active: true }; },
  updateCustomer: async (id: string, data: Partial<Pick<User, 'name' | 'email'>>): Promise<User | undefined> => {
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapUser(updatedUser);
  },
  deleteCustomer: async (id: string): Promise<{ success: boolean, error?: string }> => {
    // 1. Delete related records first (Foreign Key Constraints)
    // Delete user's cart
    // Delete user's sales (as buyer)
    const { error: salesError } = await supabase.from('sales').delete().eq('buyer_id', id);
    if (salesError) {
      console.warn("Error deleting user sales (might not exist):", salesError);
    }

    const { error: cartError } = await supabase.from('carts').delete().eq('user_id', id);
    if (cartError) {
      console.warn("Error deleting user cart (might not exist):", cartError);
      // We continue even if cart delete fails, as it might just not exist
    }

    // 2. Delete the user
    // We select the deleted row to confirm it was actually deleted
    // If RLS blocks it, error might be null but data will be empty
    const { data, error } = await supabase.from('users').delete().eq('id', id).select();

    if (error) {
      console.error("Error deleting customer:", error);
      return { success: false, error: error.message || error.details || "Erro desconhecido ao excluir usuário." };
    }

    // If no rows were returned, it means nothing was deleted (RLS or not found)
    if (!data || data.length === 0) {
      console.warn("Delete operation returned 0 rows. Possible RLS restriction.");
      return { success: false, error: "Nenhum registro excluído. Verifique permissões (RLS) ou se o usuário existe." };
    }

    return { success: true };
  },
  login: async (email: string, password?: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').ilike('email', email).single();
    if (error && error.code !== 'PGRST116') throw error;

    if (!data) return undefined;

    // Simple password check (In production, use bcrypt/hashing)
    // If user has no password (legacy), we might allow or block. Here we block if password is provided but doesn't match.
    if (password && data.password && data.password !== password) {
      return undefined;
    }

    // If user has a password but none provided, fail
    if (data.password && !password) {
      return undefined;
    }

    // Check if user is active
    if (data.role === 'photographer' && !data.is_active) {
      // We can return undefined or throw a specific error, finding the best way:
      // Since the signature returns User | undefined, we return undefined.
      // Ideally we would want to signal WHY, but for now this blocks access.
      return undefined;
    }

    return mapUser(data);
  },
  resetPassword: async (email: string): Promise<boolean> => {
    try {
      // 1. Check if user exists in OUR custom table
      const { data: user, error } = await supabase
        .from('users')
        .select('name, password')
        .ilike('email', email)
        .single();

      if (error || !user) {
        console.error('User not found for recovery:', email);
        return false;
      }

      // 2. Send email with the password
      const { emailService } = await import('./emailService');

      const subject = 'Recuperação de Senha - FotoClic';
      const htmlBody = `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Olá, ${user.name}!</h2>
          <p>Recebemos uma solicitação para recuperar sua senha no FotoClic.</p>
          <p>Sua senha atual é: <strong>${user.password}</strong></p>
          <hr />
          <p>Recomendamos que você anote sua senha em um local seguro.</p>
          <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
        </div>
      `;

      return await emailService.sendEmail(email, subject, htmlBody);

    } catch (e) {
      console.error('Error in custom resetPassword:', e);
      return false;
    }
  },
  register: async (data: { name: string, email: string, role: UserRole, password?: string }): Promise<User | undefined> => {
    // Photographers start as inactive (pending approval), Customers start as active
    const userData = {
      ...data,
      is_active: data.role !== UserRole.PHOTOGRAPHER
    };

    const { data: newUser, error } = await supabase.from('users').insert(userData).select().single();
    if (error) throw error;

    // Send notification email if the new user is a photographer
    if (data.role === UserRole.PHOTOGRAPHER) {
      // We don't await this to avoid blocking the UI response
      import('./emailService').then(({ emailService }) => {
        emailService.sendNewPhotographerNotification(data.name, data.email);
      });
    }

    return mapUser(newUser);
  },

  purchasePhoto: async (photoId: string, userId: string = 'guest-id', paidPrice?: number): Promise<{ success: boolean, error?: string }> => {
    try {
      // 1. Get Photo Details
      const photo = await api.getPhotoById(photoId);
      if (!photo) return { success: false, error: "Foto não encontrada" };

      // 2. Get Commission Settings
      const settings = await api.getCommissionSettings();
      let rate = settings.defaultRate;

      // Check for custom rate for this photographer
      if (settings.customRates && settings.customRates[photo.photographer_id] !== undefined) {
        rate = settings.customRates[photo.photographer_id];
      }

      // 3. Determine Final Price (Net vs Gross)
      // If paidPrice is provided (from Checkout), use it. Otherwise fallback to list price.
      const finalPrice = paidPrice !== undefined ? paidPrice : photo.price;

      const commissionValue = finalPrice * rate;

      // 4. Record Sale
      const { error } = await supabase.from('sales').insert({
        photo_id: photoId,
        buyer_id: userId,
        price: finalPrice,          // Record the ACTUAL paid amount
        commission: commissionValue, // Calculate commission on the ACTUAL amount
        photographer_id: photo.photographer_id,
        commission_rate: rate,
        sale_date: new Date()
      });

      if (error) {
        console.error("Erro ao registrar venda:", error);
        return { success: false, error: error.message || error.details || "Erro no banco de dados (Supabase)" };
      }

      return { success: true };
    } catch (e: any) {
      console.error("Compra falhou", e);
      return { success: false, error: e.message || "Erro inesperado na aplicação" };
    }
  },
  checkIfPurchased: async (userId: string, photoId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('sales')
      .select('id')
      .eq('buyer_id', userId)
      .eq('photo_id', photoId)
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
      .from('sales')
      .select('*, photo:photos(*)')
      .eq('buyer_id', userId)
      .order('sale_date', { ascending: false });

    if (error) {
      console.warn("Error fetching purchases:", error);
      return [];
    }

    if (!data) return [];

    return data.map((sale: any) => {
      if (!sale.photo) return null; // Should not happen if data integrity is good
      const photo = mapPhoto(sale.photo);
      return {
        ...photo,
        purchase_date: sale.sale_date,
        sale_id: sale.id
      } as PurchasedPhoto;
    }).filter(Boolean) as PurchasedPhoto[];
  },
  getSecureDownloadUrl: async (photoId: string, userId: string): Promise<string | null> => {
    // 1. Verify Purchase
    const purchased = await api.checkIfPurchased(userId, photoId);
    if (!purchased) {
      console.warn(`User ${userId} attempted to access photo ${photoId} without purchase.`);
      return null;
    }

    // 2. Get Photo Storage Path
    const photo = await api.getPhotoById(photoId);
    if (!photo || !photo.file_url) return null;

    try {
      // Extract path from URL if it's a full Supabase URL, or usage as is if relative
      // Assumption: file_url might be "https://.../storage/v1/object/public/photos/path/to/file.jpg"
      // We need just "photos/path/to/file.jpg" or the path relative to bucket.

      // Heuristic: If it contains '/public/', we presume the sensitive bucket would be different or we just sign this path.
      // But if the bucket is PUBLIC, signing is redundant but harmless. 
      // ideally the bucket should be PRIVATE 'photos_secure'.

      // For this implementation, we will use the 'createSignedUrl' on the 'photos' bucket 
      // assuming the file path is extractable.

      // Let's assume the project follows standard Supabase pattern:
      // .../storage/v1/object/public/[bucket]/[path]

      const urlObj = new URL(photo.file_url);
      const pathParts = urlObj.pathname.split('/');
      // pathParts usually: ["", "storage", "v1", "object", "public", "photos", "folder", "file.jpg"]

      const publicIndex = pathParts.indexOf('public');
      if (publicIndex === -1) {
        // Fallback: If not standard structure, return original if we can't sign it
        // OR if it is already a signed url?
        return photo.file_url;
      }

      const bucket = pathParts[publicIndex + 1]; // e.g. 'photos'
      const path = pathParts.slice(publicIndex + 2).join('/'); // e.g. 'folder/file.jpg'

      // Generate Signed URL (valid for 1 hour)
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour

      if (error) {
        console.error("Error creating signed URL:", error);
        return null;
      }

      return data.signedUrl;

    } catch (e) {
      console.error("Error parsing photo URL for signing:", e);
      // Fallback to original if parsing fails (likely external url or local mock)
      return photo.file_url;
    }
  },
  validateCoupon: async (code: string): Promise<Coupon | null> => {
    const { data, error } = await supabase.from('coupons').select('*').eq('code', code).single();
    if (error || !data) return null;
    if (!data.is_active || new Date(data.expiration_date) < new Date()) return null;
    return data;
  },
  syncCart: async (userId: string, itemIds: string[]): Promise<void> => {
    // console.log(`[SyncCart] Attempting to sync cart for User ID: ${userId}`);
    try {
      // Use UPSERT for atomic update/create, avoiding race conditions (409) and manual checks
      const { error } = await supabase
        .from('carts')
        .upsert({
          user_id: userId,
          items: itemIds,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

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
        .from('carts')
        .select('items')
        .eq('user_id', userId)
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
  getAbandonedCartsByPhotographerId: async (photographerId: string): Promise<AbandonedCart[]> => {
    try {
      // Calculate the cutoff time (24 hours ago)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 24);
      const cutoffISO = cutoffTime.toISOString();

      // 1. Fetch carts that haven't been updated in the last 24 hours
      const { data: carts, error } = await supabase
        .from('carts')
        .select('user_id, items, updated_at, created_at, user:users!carts_user_id_fkey (name, email)')
        .lt('updated_at', cutoffISO); // Only carts older than 24 hours

      if (error) {
        // Fallback: try without explicit relationship name or handle if relationship missing
        console.warn("Error fetching carts with relations:", error);
        // Try simple fetch
        return [];
      }

      if (!carts || carts.length === 0) return [];

      // 2. Collect all photo IDs from all carts
      const allPhotoIds = new Set<string>();
      carts.forEach((cart: any) => {
        if (Array.isArray(cart.items)) {
          cart.items.forEach((id: string) => allPhotoIds.add(id));
        }
      });

      if (allPhotoIds.size === 0) return [];

      // 3. Fetch details ONLY for photos that belong to THIS photographer
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, title, price, preview_url, photographer_id')
        .in('id', Array.from(allPhotoIds))
        .eq('photographer_id', photographerId);

      if (photosError || !photos || photos.length === 0) return [];

      const photoMap = new Map();
      photos.forEach(p => photoMap.set(p.id, p));

      // 4. Build the result
      const abandonedCarts: AbandonedCart[] = [];

      carts.forEach((cart: any) => {
        if (!Array.isArray(cart.items) || cart.items.length === 0) return;

        // Find items in this cart that belong to the photographer
        const relevantItems: any[] = [];
        cart.items.forEach((itemId: string) => {
          const photo = photoMap.get(itemId);
          if (photo) {
            relevantItems.push({
              photo_id: photo.id,
              title: photo.title,
              price: photo.price,
              preview_url: photo.preview_url,
              photographer_id: photo.photographer_id
            });
          }
        });

        if (relevantItems.length > 0) {
          // Safely access user data
          const userData = Array.isArray(cart.user) ? cart.user[0] : cart.user;

          abandonedCarts.push({
            id: cart.user_id, // Use user_id as unique ID for the cart view
            userId: cart.user_id,
            userName: userData?.name || 'Cliente (Sem Nome)',
            userEmail: userData?.email || 'Sem e-mail',
            items: relevantItems,
            date: cart.updated_at || cart.created_at || new Date().toISOString(),
            status: 'pending'
          });
        }
      });

      return abandonedCarts;

    } catch (error) {
      console.error("Failed to get abandoned carts:", error);
      return [];
    }
  },
  getStats: async () => ({ photos: 100, photographers: 20, categories: 5 }),
  getCommissionSettings: async (): Promise<CommissionSettings> => {
    const { data, error } = await supabase.from('system_settings').select('commission_default_rate, commission_custom_rates').eq('id', 1).single();
    if (error) {
      console.warn("Error fetching commission settings:", error);
      return { defaultRate: 0.15, customRates: {} };
    }
    return {
      defaultRate: data.commission_default_rate,
      customRates: data.commission_custom_rates || {}
    };
  },
  updateCommissionSettings: async (settings: CommissionSettings): Promise<CommissionSettings> => {
    const { data, error } = await supabase.from('system_settings').upsert({
      id: 1,
      commission_default_rate: settings.defaultRate,
      commission_custom_rates: settings.customRates,
      updated_at: new Date()
    }).select().single();

    if (error) throw error;
    return {
      defaultRate: data.commission_default_rate,
      customRates: data.commission_custom_rates
    };
  },
  getEmailTemplates: async (): Promise<EmailTemplates> => {
    const { data, error } = await supabase.from('system_settings').select('email_templates').eq('id', 1).single();
    if (error) {
      console.warn("Error fetching email templates:", error);
      // Return default templates if fetch fails
      return {
        photographerActivated: { subject: 'Sua conta foi ativada!', body: 'Olá {{nome_fotografo}}, sua conta foi ativada.' },
        photographerDeactivated: { subject: 'Sua conta foi desativada', body: 'Olá {{nome_fotografo}}, sua conta foi desativada.' },
        photoRejected: { subject: 'Foto rejeitada', body: 'Olá {{nome_fotografo}}, sua foto {{titulo_foto}} foi rejeitada. Motivo: {{motivo_rejeicao}}' },
        payoutProcessed: { subject: 'Pagamento processado', body: 'Olá {{nome_fotografo}}, seu pagamento de {{valor_pagamento}} foi processado em {{data_pagamento}}.' }
      };
    }
    return data.email_templates;
  },
  updateEmailTemplates: async (templates: EmailTemplates): Promise<EmailTemplates> => {
    const { data, error } = await supabase.from('system_settings').upsert({
      id: 1,
      email_templates: templates,
      updated_at: new Date()
    }).select().single();

    if (error) throw error;
    return data.email_templates;
  },
  notifyPhotographerStatusChange: async (id: string, status: boolean) => {
    try {
      const user = await api.getPhotographerById(id);
      if (!user) return;

      const templates = await api.getEmailTemplates();
      // Select template based on status (Activation vs Deactivation)
      const template = status ? templates.photographerActivated : templates.photographerDeactivated;

      if (!template) {
        console.warn(`Template de e-mail para ${status ? 'ativação' : 'desativação'} não encontrado.`);
        return;
      }

      // Replace variables
      const subject = template.subject;
      let bodyContent = template.body.replace(/{{nome_fotografo}}/g, user.name);

      // Convert newlines to HTML line breaks for correct formatting
      bodyContent = bodyContent.replace(/\n/g, '<br />');

      // Wrap in a nice template structure
      const htmlBody = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #2563EB;">FotoClic</h2>
              <div style="margin: 20px 0;">
                  ${bodyContent}
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #888;">Este é um e-mail automático, por favor não responda.</p>
          </div>
      `;

      // Dynamically import emailService to avoid circular dependencies if any
      const { emailService } = await import('./emailService');
      await emailService.sendEmail(user.email, subject, htmlBody);
      console.log(`E-mail de ${status ? 'ativação' : 'desativação'} enviado para ${user.email}`);

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
        .replace(/{{motivo_rejeicao}}/g, photo.rejection_reason || 'Motivo não especificado');

      // Convert newlines to HTML line breaks for correct formatting
      bodyContent = bodyContent.replace(/\n/g, '<br />');

      // Wrap in a nice template structure
      const htmlBody = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #DC2626;">FotoClic - Foto Rejeitada</h2>
              <div style="margin: 20px 0;">
                  ${bodyContent}
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #888;">Este é um e-mail automático, por favor não responda.</p>
          </div>
      `;

      // Dynamically import emailService to avoid circular dependencies if any
      const { emailService } = await import('./emailService');
      await emailService.sendEmail(user.email, subject, htmlBody);
      console.log(`E-mail de rejeição enviado para ${user.email}`);

    } catch (error) {
      console.error("Falha ao enviar notificação de rejeição", error);
    }
  },
  analyzePhoto: async (id: string) => {
    // 1. Try to get analysis from photo record if exists
    const { data, error } = await supabase
      .from('photos')
      .select('quality_analysis')
      .eq('id', id)
      .single();

    if (!error && data && data.quality_analysis) {
      return data.quality_analysis;
    }

    // 2. Fallback to mock if not analyzed
    return { overallScore: 85, sharpness: 90, lighting: 80, composition: 85, noise: 20, ai_tags: [], recommendation: 'approve' as const, summary: 'Análise automática pendente.' };
  },
  getPhotographerBalances: async (): Promise<PhotographerBalance[]> => { return []; },
  requestPayout: async (photographerId: string, amount: number): Promise<Payout> => {
    const { data, error } = await supabase.from('payouts').insert({ photographer_id: photographerId, amount }).select().single();
    if (error) throw error;
    return data;
  },
  approvePayout: async (payoutId: string): Promise<boolean> => {
    // 1. Update status first
    const { data: payoutData, error } = await supabase.from('payouts').update({ status: 'paid', processed_date: new Date().toISOString() }).eq('id', payoutId).select().single();
    if (error) throw error;

    // 2. Send Notification Email
    try {
      // Need photographer details for the email
      const photographer = await api.getPhotographerById(payoutData.photographer_id);

      if (photographer) {
        const templates = await api.getEmailTemplates();
        const template = templates.payoutProcessed;

        if (template) {
          const valorFormatado = payoutData.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const dataFormatada = new Date().toLocaleDateString('pt-BR');

          const subject = template.subject.replace(/{{nome_fotografo}}/g, photographer.name);

          let bodyContent = template.body
            .replace(/{{nome_fotografo}}/g, photographer.name)
            .replace(/{{valor_pagamento}}/g, valorFormatado)
            .replace(/{{data_pagamento}}/g, dataFormatada);

          // Convert newlines to HTML line breaks
          bodyContent = bodyContent.replace(/\n/g, '<br />');

          const htmlBody = `
                  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                      <h2 style="color: #059669;">FotoClic - Pagamento Processado</h2>
                      <div style="margin: 20px 0;">
                          ${bodyContent}
                      </div>
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                      <p style="font-size: 12px; color: #888;">Este é um e-mail automático, por favor não responda.</p>
                  </div>
              `;

          const { emailService } = await import('./emailService');
          await emailService.sendEmail(photographer.email, subject, htmlBody);
          console.log(`E-mail de pagamento enviado para ${photographer.email}`);
        }
      }
    } catch (e) {
      console.error("Erro ao enviar email de pagamento:", e);
      // We don't throw here to avoid failing the operation if just the email fails
    }

    return true;
  },
  getPayoutsByPhotographerId: async (photographerId: string): Promise<Payout[]> => {
    const { data, error } = await supabase.from('payouts').select('*').eq('photographer_id', photographerId);
    if (error) throw error;
    return data || [];
  },
  getAllPayouts: async (): Promise<(Payout & { photographer_name: string, bank_info?: BankInfo })[]> => {
    const { data, error } = await supabase.from('payouts').select('*, photographer:photographer_id ( name, bank_info )');
    if (error) throw error;
    return data.map((p: any) => ({ ...p, photographer_name: p.photographer.name, bank_info: p.photographer.bank_info })) || [];
  },
  getPendingPayoutsCount: async (): Promise<number> => {
    const { count, error } = await supabase.from('payouts').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    if (error) throw error;
    return count || 0;
  },
  updateBankInfo: async (userId: string, bankInfo: BankInfo): Promise<boolean> => {
    const { error } = await supabase.from('users').update({ bank_info: bankInfo }).eq('id', userId);
    if (error) throw error;
    return true;
  },
  getSales: async (): Promise<Sale[]> => {
    // Select sales and join with the buyer (users table) to get the name
    const { data, error } = await supabase
      .from('sales')
      .select('*, buyer:buyer_id(name)')
      .order('sale_date', { ascending: false });

    if (error) {
      console.error("Error fetching sales:", error);
      return [];
    }

    // Transform result to match Sale interface
    return data?.map((s: any) => ({
      ...s,
      buyer_name: s.buyer?.name || 'Comprador Desconhecido'
    })) || [];
  },
};

export default api;