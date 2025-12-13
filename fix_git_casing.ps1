$files = @(
    "components/Header.tsx",
    "components/Footer.tsx",
    "components/PhotoDetailModal.tsx",
    "components/LoginModal.tsx",
    "components/RegisterModal.tsx",
    "components/Toast.tsx",
    "components/Spinner.tsx",
    "pages/HomePage.tsx",
    "pages/AdminPage.tsx",
    "pages/CategoryPage.tsx",
    "pages/AboutPage.tsx",
    "pages/ContactPage.tsx",
    "pages/TermsPage.tsx",
    "pages/PrivacyPage.tsx",
    "pages/FeaturedPhotosPage.tsx",
    "pages/PhotographerPage.tsx",
    "pages/PhotographerPortfolioPage.tsx",
    "pages/DiscoverPage.tsx",
    "pages/PhotographersPage.tsx",
    "pages/CartPage.tsx",
    "pages/LoginPage.tsx",
    "pages/RegisterPage.tsx",
    "pages/PendingApprovalPage.tsx",
    "pages/PhotoDetailPage.tsx",
    "pages/CustomerDashboardPage.tsx",
    "pages/CheckoutPage.tsx",
    "pages/HelpCenterPage.tsx",
    "pages/TestStripePage.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing casing for $file..."
        git mv $file "${file}_temp"
        git mv "${file}_temp" $file
    } else {
        Write-Host "Skipping $file (not found)"
    }
}

Write-Host "Casing fix completed. Please commit and push."
