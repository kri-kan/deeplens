import React, { useState, Suspense, lazy } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, SafeAreaView, TextInput } from 'react-native';
import { useNavigation } from './NavigationContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';

// Components
import { PwaInstallBanner } from '../components/pwa/PwaInstallBanner';
import { BottomNav, BottomNavTab } from '../components/navigation/BottomNav';
import { ToastContainer } from '../components/feedback/ToastContainer';
import { ScreenSkeleton } from '../components/feedback/ScreenSkeleton';

// Lazy-loaded Overlay Components (Loaded on user interaction)
const DesktopProfileMenu = lazy(() =>
  import('../components/navigation/DesktopProfileMenu').then((m) => ({ default: m.DesktopProfileMenu }))
);
const LocationPermissionSheet = lazy(() =>
  import('../components/permissions/LocationPermissionSheet').then((m) => ({ default: m.LocationPermissionSheet }))
);
const AuthSheet = lazy(() =>
  import('../components/auth/AuthSheet').then((m) => ({ default: m.AuthSheet }))
);
const CartDrawer = lazy(() =>
  import('../components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);

// Icons
import { LuSearch, LuHeart, LuShoppingBag, LuUser, LuMapPin, LuWifiOff } from 'react-icons/lu';
import { telemetry } from '../services/telemetry';

// Critical Landing Page (Eagerly bundled for immediate First Paint)
import { HomePage } from './pages/HomePage';

// Lazy-loaded Routes (Code-split into async chunks loaded on demand)
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const OtpPage = lazy(() => import('./pages/OtpPage').then((m) => ({ default: m.OtpPage })));
const CatalogPage = lazy(() => import('./pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CartPage = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const WishlistPage = lazy(() => import('./pages/WishlistPage').then((m) => ({ default: m.WishlistPage })));

export const AppShell: React.FC = () => {
  const { currentRoute, navigate } = useNavigation();
  const { itemCount, openDrawer, isDrawerOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { currentLocation, locationStatus, requestLocationPermission, setManualPincode } = usePermissions();
  const { user, isAuthenticated, logout, loginWithGoogle, verifyOtp } = useAuth();
  const { isOffline } = usePWA();
  const { width } = useWindowDimensions();

  // Modals / Sheet States
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showDesktopProfileMenu, setShowDesktopProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Responsive Breakpoints
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLaptop = width >= 1024 && width < 1280;
  const isDesktop = width >= 1280;
  const showNavLinks = width >= 1024; // Show text navigation links only on Laptop & Desktop
  const showActionLabels = width >= 1280; // Show text labels below icons ONLY on Full Desktop

  const hideShell = currentRoute === 'onboarding';

  // Map route to BottomNav tab
  const getActiveTab = (): BottomNavTab => {
    if (currentRoute === 'catalog') return 'curations';
    if (currentRoute === 'login' || currentRoute === 'wishlist') return 'profile';
    return 'home';
  };

  const handleTabChange = (tab: BottomNavTab) => {
    if (tab === 'home') {
      navigate('home');
    } else if (tab === 'curations') {
      navigate('catalog');
    } else if (tab === 'profile') {
      if (!isAuthenticated) {
        setShowAuthSheet(true);
      } else {
        navigate('wishlist');
      }
    }
  };

  const handleAuthSuccess = async (data: { phone: string; method: 'phone' | 'google' }) => {
    if (data.method === 'google') {
      await loginWithGoogle();
    } else {
      await verifyOtp(data.phone.replace('+91 ', ''), '123456');
    }
    telemetry.trackEvent('auth_completed', { method: data.method });
    setShowAuthSheet(false);
  };

  const renderActiveScreen = () => {
    switch (currentRoute) {
      case 'onboarding':
        return <OnboardingPage />;
      case 'login':
        return <LoginPage />;
      case 'otp':
        return <OtpPage />;
      case 'home':
        return (
          <HomePage
            onOpenAuth={() => {
              telemetry.trackEvent('auth_sheet_opened', { source: 'home_banner' });
              setShowAuthSheet(true);
            }}
            onOpenLocation={() => setShowLocationSheet(true)}
          />
        );
      case 'catalog':
        return <CatalogPage />;
      case 'pdp':
        return <ProductDetailPage />;
      case 'cart':
        return (
          <CartPage
            onOpenAuth={() => {
              telemetry.trackEvent('auth_sheet_opened', { source: 'cart_gate' });
              setShowAuthSheet(true);
            }}
          />
        );
      case 'checkout':
        return (
          <CheckoutPage
            onOpenAuth={() => {
              telemetry.trackEvent('auth_sheet_opened', { source: 'checkout_gate' });
              setShowAuthSheet(true);
            }}
          />
        );
      case 'wishlist':
        return <WishlistPage />;
      default:
        return (
          <HomePage
            onOpenAuth={() => {
              telemetry.trackEvent('auth_sheet_opened', { source: 'home_banner' });
              setShowAuthSheet(true);
            }}
            onOpenLocation={() => setShowLocationSheet(true)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Offline Banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <LuWifiOff size={15} color="#FFFFFF" />
            <Text style={styles.offlineText}>
              You are currently browsing offline. Cached luxury collections are ready.
            </Text>
          </View>
        )}

        {/* PWA Install / Offline Capability Banner */}
        <PwaInstallBanner isDesktop={!isMobile} />

        {/* Desktop & Tablet Header */}
        {!hideShell && !isMobile && (
          <View style={styles.desktopHeader}>
            <View
              style={[
                styles.headerInner,
                isTablet && styles.headerInnerTablet,
                isLaptop && styles.headerInnerLaptop,
                isDesktop && styles.headerInnerDesktop,
              ]}
            >
              {/* Left: Brand Logo */}
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigate('home')} style={styles.logoGroup} activeOpacity={0.8}>
                  <Text style={styles.logoIcon}>✦</Text>
                  <Text style={styles.logoText}>VAYYARI</Text>
                </TouchableOpacity>

                {/* Nav Links (Visible on Laptop & Desktop only, avoids tablet crushing) */}
                {showNavLinks && (
                  <View style={[styles.desktopNavLinks, isLaptop && styles.desktopNavLinksLaptop]}>
                    <TouchableOpacity onPress={() => navigate('home')} style={styles.navLink}>
                      <Text style={[styles.navLinkText, isLaptop && styles.navLinkTextLaptop, currentRoute === 'home' && styles.navLinkActive]}>HOME</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigate('catalog', { category: 'all' })} style={styles.navLink}>
                      <Text style={[styles.navLinkText, isLaptop && styles.navLinkTextLaptop, currentRoute === 'catalog' && styles.navLinkActive]}>CATALOG</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigate('catalog', { category: 'saree' })} style={styles.navLink}>
                      <Text style={[styles.navLinkText, isLaptop && styles.navLinkTextLaptop]}>SAREES</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigate('catalog', { category: 'silk' })} style={styles.navLink}>
                      <Text style={[styles.navLinkText, isLaptop && styles.navLinkTextLaptop]}>SILKS</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Center: Search Bar (Flexible, never crushed) */}
              <View
                style={[
                  styles.desktopSearchBox,
                  isTablet && styles.desktopSearchBoxTablet,
                  isLaptop && styles.desktopSearchBoxLaptop,
                ]}
              >
                <LuSearch size={15} color="#757575" />
                <TextInput
                  style={styles.desktopSearchInput}
                  placeholder={isTablet ? "Search..." : isLaptop ? "Search sarees, silks..." : "Search for sarees, silks, jewellery..."}
                  placeholderTextColor="#9E9E9E"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => navigate('catalog')}
                />
              </View>

              {/* Right: Actions */}
              <View
                style={[
                  styles.desktopActions,
                  isTablet && styles.desktopActionsTablet,
                  isLaptop && styles.desktopActionsLaptop,
                ]}
              >
                {/* Location Delivery Selector */}
                <TouchableOpacity
                  style={[styles.locationPill, (isTablet || isLaptop) && styles.locationPillCompact]}
                  onPress={() => setShowLocationSheet(true)}
                  activeOpacity={0.8}
                >
                  <LuMapPin size={14} color="#E53935" />
                  <View>
                    {showActionLabels && <Text style={styles.locationLabel}>Deliver to</Text>}
                    <Text style={styles.locationValue} numberOfLines={1}>
                      {currentLocation?.pincode ? currentLocation.pincode : 'Select PIN'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Wishlist */}
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigate('wishlist')} activeOpacity={0.8}>
                  <LuHeart size={19} color="#1A365D" />
                  {wishlistCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{wishlistCount}</Text>
                    </View>
                  )}
                  {showActionLabels && <Text style={styles.iconLabel}>Wishlist</Text>}
                </TouchableOpacity>

                {/* Bag */}
                <TouchableOpacity style={styles.iconBtn} onPress={openDrawer} activeOpacity={0.8}>
                  <LuShoppingBag size={19} color="#1A365D" />
                  {itemCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{itemCount}</Text>
                    </View>
                  )}
                  {showActionLabels && <Text style={styles.iconLabel}>Bag</Text>}
                </TouchableOpacity>

                {/* Profile Trigger & Dropdown Menu */}
                <View style={styles.profileMenuAnchor}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setShowDesktopProfileMenu(!showDesktopProfileMenu)}
                    activeOpacity={0.8}
                  >
                    <LuUser size={19} color={isAuthenticated ? '#2E7D32' : '#E53935'} />
                    {showActionLabels && (
                      <Text style={styles.iconLabel}>
                        {isAuthenticated ? user?.name?.split(' ')[0] || 'Patron' : 'Profile'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Desktop Profile Hover Dropdown */}
                  {showDesktopProfileMenu && (
                    <View style={styles.desktopDropdownContainer}>
                      <Suspense fallback={null}>
                        <DesktopProfileMenu
                          user={isAuthenticated ? { name: user?.name || 'Vayyari Patron', phone: user?.phone || '+91 98765 43210', tier: 'VIP Gold' } : null}
                          onLoginClick={() => {
                            setShowDesktopProfileMenu(false);
                            setShowAuthSheet(true);
                          }}
                          onLogoutClick={() => {
                            logout();
                            setShowDesktopProfileMenu(false);
                          }}
                          onItemClick={(k) => {
                            setShowDesktopProfileMenu(false);
                            if (k === 'wishlist') navigate('wishlist');
                            else if (k === 'orders') navigate('cart');
                            else if (!isAuthenticated) setShowAuthSheet(true);
                          }}
                        />
                      </Suspense>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Mobile Header (Phones < 768px) */}
        {!hideShell && isMobile && (
          <View style={styles.mobileHeader}>
            <View style={styles.mobileTopBar}>
              <TouchableOpacity onPress={() => navigate('home')} style={styles.logoGroup} activeOpacity={0.8}>
                <Text style={styles.logoIcon}>✦</Text>
                <Text style={styles.logoText}>VAYYARI</Text>
              </TouchableOpacity>

              <View style={styles.mobileHeaderIcons}>
                <TouchableOpacity style={styles.mobileIconBtn} onPress={() => navigate('catalog')}>
                  <LuSearch size={20} color="#1A365D" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileIconBtn} onPress={() => navigate('wishlist')}>
                  <LuHeart size={20} color="#1A365D" />
                  {wishlistCount > 0 && (
                    <View style={styles.mobileBadge}>
                      <Text style={styles.mobileBadgeText}>{wishlistCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileIconBtn} onPress={openDrawer}>
                  <LuShoppingBag size={20} color="#1A365D" />
                  {itemCount > 0 && (
                    <View style={styles.mobileBadge}>
                      <Text style={styles.mobileBadgeText}>{itemCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Mobile Location Selector Bar (Myntra Inspiration) */}
            <TouchableOpacity
              style={styles.mobileLocationRow}
              onPress={() => setShowLocationSheet(true)}
              activeOpacity={0.85}
            >
              <LuMapPin size={14} color="#E53935" />
              <Text style={styles.mobileLocationText}>
                {currentLocation?.pincode ? (
                  <>Deliver to <Text style={styles.boldText}>{currentLocation.city || 'Pincode'} {currentLocation.pincode}</Text></>
                ) : (
                  <>Select delivery location <Text style={styles.coralText}>(Tap to set)</Text></>
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Screen Content (Code-split with fallback skeleton) */}
        <View style={styles.body}>
          <Suspense fallback={<ScreenSkeleton />}>
            {renderActiveScreen()}
          </Suspense>
        </View>

        {/* Mobile Bottom Navigation (Visible only on Mobile) */}
        {!hideShell && isMobile && (
          <BottomNav
            activeTab={getActiveTab()}
            onTabChange={handleTabChange}
            showProfileNotification={!isAuthenticated}
            profileBadgeText={!isAuthenticated ? 'LOGIN' : undefined}
          />
        )}

        {/* Location Permission Bottom Sheet (Loaded on-demand) */}
        {showLocationSheet && (
          <Suspense fallback={null}>
            <LocationPermissionSheet
              visible={showLocationSheet}
              onClose={() => setShowLocationSheet(false)}
              permissionStatus={locationStatus === 'granted' ? 'granted' : 'denied'}
              currentPincode={currentLocation?.pincode || ''}
              onGrantPermission={async () => {
                const loc = await requestLocationPermission();
                if (loc?.pincode) {
                  await setManualPincode(loc.pincode);
                }
              }}
              onUseCurrentLocation={async () => {
                const loc = await requestLocationPermission();
                if (loc?.pincode) {
                  await setManualPincode(loc.pincode);
                }
              }}
              onPincodeSubmit={async (code) => {
                await setManualPincode(code);
                setShowLocationSheet(false);
              }}
            />
          </Suspense>
        )}

        {/* Login / Signup Modal Sheet (Loaded on-demand) */}
        {showAuthSheet && (
          <Suspense fallback={null}>
            <AuthSheet
              visible={showAuthSheet}
              onClose={() => setShowAuthSheet(false)}
              onSuccess={handleAuthSuccess}
            />
          </Suspense>
        )}

        {/* Cart Drawer (Loaded on-demand when cart is opened) */}
        {isDrawerOpen && (
          <Suspense fallback={null}>
            <CartDrawer
              onOpenAuth={() => {
                telemetry.trackEvent('auth_sheet_opened', { source: 'cart_drawer_gate' });
                setShowAuthSheet(true);
              }}
            />
          </Suspense>
        )}

        {/* Toast Container */}
        <ToastContainer />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  offlineBanner: {
    backgroundColor: '#B71C1C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1000,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  desktopHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    zIndex: 100,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  headerInner: {
    width: '100%',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 68,
    gap: 16,
    overflow: 'hidden',
  },
  headerInnerTablet: {
    paddingHorizontal: 12,
    height: 64,
    gap: 8,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  headerInnerLaptop: {
    paddingHorizontal: 16,
    height: 64,
    gap: 12,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  headerInnerDesktop: {
    paddingHorizontal: 36,
    height: 72,
    gap: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoIcon: {
    color: '#D4AF37',
    fontSize: 20,
    fontWeight: '800',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2.2,
    color: '#1A365D',
  },
  desktopNavLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginLeft: 4,
  },
  desktopNavLinksLaptop: {
    gap: 10,
  },
  navLinkTextLaptop: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  navLink: {
    paddingVertical: 6,
  },
  navLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#282C3F',
    letterSpacing: 0.3,
  },
  navLinkActive: {
    color: '#E53935',
    fontWeight: '800',
    borderBottomWidth: 2,
    borderBottomColor: '#E53935',
  },
  desktopSearchBox: {
    flex: 1,
    minWidth: 120,
    maxWidth: 480,
    backgroundColor: '#F5F5F6',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  desktopSearchBoxTablet: {
    minWidth: 80,
    maxWidth: 220,
    height: 36,
  },
  desktopSearchBoxLaptop: {
    minWidth: 90,
    maxWidth: 240,
    height: 36,
  },
  desktopSearchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: '#212121',
    outlineStyle: 'none',
  } as any,
  desktopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0,
  },
  desktopActionsTablet: {
    gap: 8,
  },
  desktopActionsLaptop: {
    gap: 10,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFF0F3',
    borderWidth: 1,
    borderColor: '#FFD0D8',
  },
  locationPillTablet: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    maxWidth: 95,
  },
  locationPillCompact: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    maxWidth: 95,
  },
  locationLabel: {
    fontSize: 8,
    color: '#757575',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A365D',
    maxWidth: 100,
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 4,
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#282C3F',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 0,
    backgroundColor: '#E53935',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  profileMenuAnchor: {
    position: 'relative',
  },
  desktopDropdownContainer: {
    position: 'absolute',
    top: 48,
    right: 0,
    zIndex: 1000,
  },
  mobileHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  mobileTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mobileHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mobileIconBtn: {
    position: 'relative',
    padding: 2,
  },
  mobileBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#E53935',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  mobileBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  mobileLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFD0D8',
  },
  mobileLocationText: {
    fontSize: 11,
    color: '#424242',
  },
  boldText: {
    fontWeight: '800',
    color: '#1A365D',
  },
  coralText: {
    fontWeight: '700',
    color: '#E53935',
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
});
