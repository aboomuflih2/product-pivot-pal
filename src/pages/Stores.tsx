import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import StoreCard from "@/components/store/StoreCard";
import StoreDetailDialog from "@/components/store/StoreDetailDialog";

interface StoreImage {
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface Store {
  id: string;
  name: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  district?: string;
  local_body_type?: string;
  local_body_name?: string;
  post_office?: string;
  landmark?: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string | null;
  whatsapp?: string;
  google_maps_url?: string;
  google_business_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  opening_hours: Record<string, string>;
  is_active: boolean;
  images?: StoreImage[];
}

const Stores = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (storesError) throw storesError;

      // Fetch images for each store
      const storesWithImages = await Promise.all(
        (storesData || []).map(async (store) => {
          const { data: images } = await supabase
            .from("store_images")
            .select("*")
            .eq("store_id", store.id)
            .order("display_order");

          return {
            ...store,
            images: images || [],
          };
        })
      );

      setStores(storesWithImages as Store[])
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (store: Store) => {
    setSelectedStore(store);
    setDialogOpen(true);
  };

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.district?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStoreCardData = (store: Store) => ({
    id: store.id,
    name: store.name,
    city: store.city,
    district: store.district,
    phone: store.phone,
    primary_image: store.images?.find((img) => img.is_primary)?.image_url,
    is_active: store.is_active,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/10 to-background py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
              Our Showrooms
            </h1>
            <p className="text-xl text-center text-muted-foreground mb-8">
              Visit us at any of our convenient locations
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by name, city, or district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading stores...</div>
            ) : filteredStores.length === 0 ? (
              <div className="text-center text-muted-foreground">
                {searchQuery ? "No stores found matching your search." : "No stores available."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={getStoreCardData(store)}
                    onViewDetails={() => handleViewDetails(store)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedStore && (
        <StoreDetailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          store={selectedStore}
        />
      )}

      <Footer />
    </div>
  );
};

export default Stores;
