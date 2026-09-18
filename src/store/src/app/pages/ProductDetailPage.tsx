import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Modal,
  Platform,
} from "react-native";
import { useNavigation } from "../NavigationContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { usePermissions } from "../../context/PermissionsContext";
import { useToast } from "../../context/ToastContext";
import { mockCatalogService, StoreProduct, EthnicSwatch } from "../../services/mock/mockCatalogService";
import { CustomSwatchDot } from "../../components/atoms/SwatchDot/CustomSwatchDot";
import { FullscreenMediaViewer, FullscreenMediaItem } from "../../components/media";

export const ProductDetailPage: React.FC = () => {
  const { params, goBack, navigate } = useNavigation();
  const { addItem, openDrawer } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { currentLocation } = usePermissions();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColorGroupId, setSelectedColorGroupId] = useState<string | null>(null);
  const [selectedSwatch, setSelectedSwatch] = useState<EthnicSwatch | undefined>(undefined);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const isDesktop = width >= 1024;

  const targetCode = params.code || params.id || "vf2b58";

  useEffect(() => {
    setLoading(true);
    mockCatalogService.getProductByCode(targetCode).then((p) => {
      setProduct(p);
      if (p) {
        const initialCgId =
          p.colorGroupId ||
          (p.colorGroups && p.colorGroups.length > 0 ? p.colorGroups[0].id : null);
        setSelectedColorGroupId(initialCgId);
        if (p.swatches && p.swatches.length > 0) {
          const match = initialCgId ? p.swatches.find((s) => s.id === initialCgId) : null;
          setSelectedSwatch(match || p.swatches[0]);
        }
      }
      setSelectedImage(0);
      setLoading(false);
    });
  }, [targetCode]);

  const activeColorGroup = useMemo(() => {
    if (!product?.colorGroups || product.colorGroups.length === 0) return null;
    return (
      product.colorGroups.find((cg) => cg.id === selectedColorGroupId) ||
      product.colorGroups[0]
    );
  }, [product, selectedColorGroupId]);

  const displayedMediaItems = useMemo<FullscreenMediaItem[]>(() => {
    if (!product) return [];
    if (product.mediaOrder && product.mediaOrder.length > 0) {
      const items = selectedColorGroupId
        ? product.mediaOrder.filter(
            (m) => m.colorGroupId === selectedColorGroupId || m.isCommon || !m.colorGroupId
          )
        : product.mediaOrder;
      const finalItems = items.length > 0 ? items : product.mediaOrder;
      return finalItems.map((m) => ({
        id: m.id,
        url: m.url,
        mediaType: m.mediaType ?? (/\.(mp4|mov|webm|m3u8)(\?.*)?$/i.test(m.url) ? 2 : 1),
        title: m.title,
      }));
    }
    return (product.images || []).map((url, idx) => ({
      id: `img-${idx}`,
      url,
      mediaType: /\.(mp4|mov|webm|m3u8)(\?.*)?$/i.test(url) ? 2 : 1,
    }));
  }, [product, selectedColorGroupId]);

  const displayedMedia = useMemo(() => {
    return displayedMediaItems.map((m) => m.url);
  }, [displayedMediaItems]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Handloom Details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Product Not Found</Text>
        <Text style={styles.notFoundSub}>
          Product with code '{targetCode}' was not found in the live published catalog.
        </Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigate("catalog")}>
          <Text style={styles.backHomeBtnText}>← Return to Catalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wishlisted = isInWishlist(product.id);

  const handleAddToBag = () => {
    addItem(product, selectedSwatch);
    showToast({
      message: `Added ${product.title.slice(0, 24)}... to Bag`,
      type: "success",
    });
    openDrawer();
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
    const added = !wishlisted;
    showToast({
      message: added ? "Saved to Wishlist" : "Removed from Wishlist",
      type: added ? "success" : "info",
    });
  };

  const handleSelectColorGroup = (colorGroupId: string) => {
    setSelectedColorGroupId(colorGroupId);
    setSelectedImage(0);
    const cg = product?.colorGroups?.find((c) => c.id === colorGroupId);
    if (cg) {
      setSelectedSwatch({
        id: cg.id,
        name: cg.name,
        type: (cg.template as any) || "solid",
        primaryHex: cg.slotA || cg.colors?.[0] || "#D4AF37",
        secondaryHex: cg.slotB || cg.colors?.[1],
        accentHex: cg.slotC || cg.colors?.[2],
      });
    }
  };

  const currentImageUri =
    displayedMedia.length > 0
      ? displayedMedia[selectedImage] || displayedMedia[0]
      : null;

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header / Back Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.skuBadge}>
            <Text style={styles.skuLabel}>PRODUCT CODE: </Text>
            <Text style={styles.skuText}>{product.code || "-"}</Text>
          </View>
        </View>

        <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          {/* Left Column: Media Gallery */}
          <View style={[styles.galleryCol, isDesktop && styles.galleryColDesktop]}>
            <TouchableOpacity
              activeOpacity={0.95}
              style={styles.mainImageWrapper}
              onPress={() => setZoomModalVisible(true)}
            >
              {currentImageUri ? (
                <Image source={{ uri: currentImageUri }} style={styles.mainImage} resizeMode="cover" />
              ) : (
                <View style={styles.noImagePlaceholder}>
                  <Text style={styles.noImageText}>No Image Available</Text>
                </View>
              )}

              <View style={styles.giTagBadge}>
                <Text style={styles.giTagText}>
                  ✦ Origin: {product.weaveOrigin || "-"}
                </Text>
              </View>

              <View style={styles.zoomHintPill}>
                <Text style={styles.zoomHintText}>🔍 Tap to View Fullscreen</Text>
              </View>
            </TouchableOpacity>

            {/* Thumbnail Strip */}
            {displayedMedia && displayedMedia.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbRow}
              >
                {displayedMedia.map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.thumbBox, selectedImage === idx && styles.thumbBoxActive]}
                    onPress={() => setSelectedImage(idx)}
                  >
                    <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Right Column: Product Info & Actions */}
          <View style={[styles.infoCol, isDesktop && styles.infoColDesktop]}>
            <Text style={styles.brandTitle}>{product.brand || "-"}</Text>
            <Text style={styles.productTitle}>{product.title || "-"}</Text>

            {/* Pricing Section */}
            <View style={styles.priceContainer}>
              <Text style={styles.salePrice}>₹{product.price.toLocaleString("en-IN")}</Text>
              {product.originalPrice > product.price && (
                <Text style={styles.origPrice}>₹{product.originalPrice.toLocaleString("en-IN")}</Text>
              )}
              {product.discountPercentage > 0 && (
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>{product.discountPercentage}% OFF</Text>
                </View>
              )}
            </View>

            {/* In-Stock Status */}
            <View style={styles.stockRow}>
              <View style={[styles.stockDot, { backgroundColor: product.inStock ? "#38A169" : "#E53E3E" }]} />
              <Text style={styles.stockText}>
                {product.inStock ? "Ready for Express Dispatch" : "Currently Out of Stock"}
              </Text>
            </View>

            {/* Colorway / Swatch Section */}
            <View style={styles.sectionDivider} />
            <View style={styles.swatchSection}>
              <View style={styles.swatchHeaderRow}>
                <View style={styles.swatchTitleGroup}>
                  <Text style={styles.swatchSectionTitle}>Colorway</Text>
                  <Text style={styles.activeColorName}>
                    {activeColorGroup?.name || selectedSwatch?.name || product.colorwayName || "Standard"}
                  </Text>
                </View>
                {product.colorGroups && product.colorGroups.length > 0 && (
                  <View style={styles.swatchCountPill}>
                    <Text style={styles.swatchCountText}>{product.colorGroups.length} Shades</Text>
                  </View>
                )}
              </View>

              {/* Swatch Selector Row */}
              {product.colorGroups && product.colorGroups.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.swatchListContainer}
                >
                  {product.colorGroups.map((cg) => {
                    const isSelected = cg.id === selectedColorGroupId;
                    return (
                      <TouchableOpacity
                        key={cg.id}
                        onPress={() => handleSelectColorGroup(cg.id)}
                        style={[
                          styles.swatchItemWrapper,
                          isSelected && styles.swatchItemWrapperActive,
                        ]}
                        activeOpacity={0.8}
                        accessibilityLabel={`Color: ${cg.name}`}
                      >
                        <CustomSwatchDot
                          template={cg.template || "solid"}
                          primaryColor={cg.slotA || cg.colors?.[0] || "#D4AF37"}
                          secondaryColor={cg.slotB || cg.colors?.[1]}
                          tertiaryColor={cg.slotC || cg.colors?.[2]}
                          quaternaryColor={cg.slotD || cg.colors?.[3]}
                          colors={cg.colors}
                          colorCount={cg.colorCount as any}
                          size={36}
                          shape="circle"
                          selected={isSelected}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : product.swatches && product.swatches.length > 0 ? (
                <View style={styles.legacySwatchRow}>
                  {product.swatches.map((sw) => {
                    const isSelected = selectedSwatch?.id === sw.id;
                    return (
                      <TouchableOpacity
                        key={sw.id}
                        onPress={() => {
                          setSelectedSwatch(sw);
                          setSelectedImage(0);
                        }}
                        style={[
                          styles.swatchItemWrapper,
                          isSelected && styles.swatchItemWrapperActive,
                        ]}
                      >
                        <CustomSwatchDot
                          template={(sw.type as any) || "solid"}
                          primaryColor={sw.primaryHex}
                          secondaryColor={sw.secondaryHex}
                          size={36}
                          shape="circle"
                          selected={isSelected}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {/* Delivery Location & Timeline */}
            <View style={styles.deliveryCard}>
              <Text style={styles.deliveryTitle}>
                📍 Delivery to: {currentLocation?.city || "-"} {currentLocation?.pincode ? `(${currentLocation.pincode})` : ""}
              </Text>
              <Text style={styles.deliverySub}>
                Estimated courier dispatch: 2 business days from artisan studio.
              </Text>
            </View>

            {/* Main Action CTAs */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.addToBagBtn, !product.inStock && styles.btnDisabled]}
                onPress={handleAddToBag}
                disabled={!product.inStock}
                activeOpacity={0.88}
              >
                <Text style={styles.addToBagText}>
                  {product.inStock
                    ? `Add to Bag • ₹${product.price.toLocaleString("en-IN")}`
                    : "Out of Stock"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.wishlistBtn, wishlisted && styles.wishlistBtnActive]}
                onPress={handleToggleWishlist}
              >
                <Text style={[styles.wishlistIcon, wishlisted && styles.wishlistIconActive]}>
                  {wishlisted ? "♥ Saved" : "♡ Wishlist"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Specifications Accordion / Panel */}
            <View style={styles.specPanel}>
              <Text style={styles.specHeader}>Product Specifications</Text>

              <View style={styles.specItem}>
                <Text style={styles.specKey}>Product Code</Text>
                <Text style={styles.specVal}>{product.code || "-"}</Text>
              </View>

              <View style={styles.specItem}>
                <Text style={styles.specKey}>Fabric</Text>
                <Text style={styles.specVal}>{product.fabric || "-"}</Text>
              </View>

              <View style={styles.specItem}>
                <Text style={styles.specKey}>Geographical Indication</Text>
                <Text style={styles.specVal}>{product.weaveOrigin || "-"}</Text>
              </View>

              <View style={styles.specItem}>
                <Text style={styles.specKey}>Certifications</Text>
                <Text style={styles.specVal}>
                  {product.features && product.features.length > 0
                    ? product.features.join(" • ")
                    : "-"}
                </Text>
              </View>

              <View style={styles.specItemColumn}>
                <Text style={styles.specKey}>Description</Text>
                <Text style={styles.descriptionText}>
                  {product.description && product.description.trim() ? product.description : "-"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar for Mobile */}
      {!isDesktop && product && (
        <View style={styles.mobileBottomBar}>
          <View style={styles.mobilePriceBox}>
            <Text style={styles.mobilePriceText}>₹{product.price.toLocaleString("en-IN")}</Text>
            {product.discountPercentage > 0 && (
              <Text style={styles.mobileDiscountText}>{product.discountPercentage}% OFF</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.mobileAddBtn, !product.inStock && styles.btnDisabled]}
            onPress={handleAddToBag}
            disabled={!product.inStock}
          >
            <Text style={styles.mobileAddBtnText}>Add to Bag</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fullscreen Edge-to-Edge Media Viewer */}
      <FullscreenMediaViewer
        visible={zoomModalVisible}
        onClose={() => setZoomModalVisible(false)}
        media={displayedMediaItems}
        initialIndex={selectedImage}
        productTitle={product.title}
        productCode={product.code}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: "#FAF7F2",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#FAF7F2",
  },
  loadingText: {
    color: "#1A365D",
    fontSize: 16,
    fontWeight: "600",
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#FAF7F2",
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A365D",
    marginBottom: 8,
  },
  notFoundSub: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginBottom: 24,
  },
  backHomeBtn: {
    backgroundColor: "#1A365D",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backHomeBtnText: {
    color: "#FAF7F2",
    fontWeight: "700",
    fontSize: 14,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FAF7F2",
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: "#1A365D",
    fontSize: 14,
    fontWeight: "700",
  },
  skuBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDF2F7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skuLabel: {
    color: "#718096",
    fontSize: 11,
    fontWeight: "600",
  },
  skuText: {
    color: "#1A365D",
    fontSize: 12,
    fontWeight: "800",
  },
  mainLayout: {
    flexDirection: "column",
  },
  mainLayoutDesktop: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 32,
    marginTop: 16,
  },
  galleryCol: {
    width: "100%",
  },
  galleryColDesktop: {
    width: "50%",
  },
  mainImageWrapper: {
    width: "100%",
    height: 440,
    position: "relative",
    backgroundColor: "#EDF2F7",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  noImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
  },
  noImageText: {
    color: "#718096",
    fontSize: 14,
    fontWeight: "600",
  },
  giTagBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(26, 54, 93, 0.9)",
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  giTagText: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
  },
  zoomHintPill: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  zoomHintText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  thumbRow: {
    padding: 16,
    gap: 12,
  },
  thumbBox: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  thumbBoxActive: {
    borderColor: "#1A365D",
    borderWidth: 2,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  infoCol: {
    padding: 20,
  },
  infoColDesktop: {
    width: "50%",
    paddingTop: 0,
  },
  brandTitle: {
    color: "#9C7A14",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A365D",
    lineHeight: 28,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 10,
  },
  salePrice: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A365D",
  },
  origPrice: {
    fontSize: 16,
    color: "#A0AEC0",
    textDecorationLine: "line-through",
  },
  discountPill: {
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FEB2B2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountPillText: {
    color: "#C53030",
    fontSize: 11,
    fontWeight: "800",
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A5568",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  swatchSection: {
    marginVertical: 14,
  },
  swatchHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  swatchTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swatchSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#718096",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeColorName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A365D",
  },
  swatchCountPill: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  swatchCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7B1FA2",
  },
  swatchListContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  legacySwatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  swatchItemWrapper: {
    padding: 3,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchItemWrapperActive: {
    borderColor: "#1A365D",
  },
  deliveryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginVertical: 12,
  },
  deliveryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A365D",
    marginBottom: 2,
  },
  deliverySub: {
    fontSize: 11,
    color: "#718096",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 16,
  },
  addToBagBtn: {
    flex: 1,
    backgroundColor: "#1A365D",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    backgroundColor: "#A0AEC0",
  },
  addToBagText: {
    color: "#FAF7F2",
    fontSize: 15,
    fontWeight: "700",
  },
  wishlistBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E0",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistBtnActive: {
    borderColor: "#E53E3E",
    backgroundColor: "#FFF5F5",
  },
  wishlistIcon: {
    fontSize: 13,
    color: "#4A5568",
    fontWeight: "700",
  },
  wishlistIconActive: {
    color: "#E53E3E",
  },
  specPanel: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  specHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A365D",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  specItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F7FAFC",
  },
  specItemColumn: {
    paddingVertical: 8,
  },
  specKey: {
    fontSize: 12,
    fontWeight: "600",
    color: "#718096",
  },
  specVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2D3748",
  },
  descriptionText: {
    fontSize: 13,
    color: "#4A5568",
    lineHeight: 20,
    marginTop: 6,
  },
  mobileBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  mobilePriceBox: {
    flexDirection: "column",
  },
  mobilePriceText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A365D",
  },
  mobileDiscountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C53030",
  },
  mobileAddBtn: {
    backgroundColor: "#1A365D",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mobileAddBtnText: {
    color: "#FAF7F2",
    fontSize: 14,
    fontWeight: "700",
  },
});
